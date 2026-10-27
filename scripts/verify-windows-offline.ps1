# Run only on a disposable, elevated Windows CI runner: this removes WebView2
# and temporarily blocks outbound traffic to exercise a clean offline install.
$ErrorActionPreference = 'Stop'

function Get-WebViewRuntime {
  $keys = @(
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
  )
  foreach ($key in $keys) {
    $item = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
    if ($item -and $item.pv -and $item.pv -ne '0.0.0.0') { return $item.pv }
  }
  return $null
}

function Can-Connect([string]$address) {
  $tcp = [System.Net.Sockets.TcpClient]::new()
  try {
    $pending = $tcp.ConnectAsync($address, 443)
    return $pending.Wait(5000) -and $tcp.Connected
  } catch { return $false } finally { $tcp.Dispose() }
}

$installer = Get-ChildItem src-tauri/target/release/bundle/nsis/*-setup.exe | Select-Object -First 1
if (-not $installer) { throw 'Installer not found' }
$remote = (Resolve-DnsName github.com -Type A | Where-Object IPAddress | Select-Object -First 1).IPAddress
if (-not $remote -or -not (Can-Connect $remote)) { throw 'Online preflight failed; cannot prove isolation' }

Stop-Service edgeupdate, edgeupdatem -Force -ErrorAction SilentlyContinue
Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force
$runtime = Get-WebViewRuntime
if ($runtime) {
  Write-Host "Removing preinstalled WebView2 $runtime from disposable runner"
  $runtimeSetup = Join-Path ${env:ProgramFiles(x86)} "Microsoft\EdgeWebView\Application\$runtime\Installer\setup.exe"
  if (-not (Test-Path $runtimeSetup)) { throw "Cannot find runtime setup: $runtimeSetup" }
  $remove = Start-Process $runtimeSetup -ArgumentList '--uninstall','--msedgewebview','--system-level','--force-uninstall' -Wait -PassThru
  Write-Host "Runtime removal exit code: $($remove.ExitCode)"
}
if (Get-WebViewRuntime) { throw 'WebView2 is still present; clean prerequisite test cannot proceed' }
Write-Host 'Confirmed no registered WebView2 runtime before installation.'

$ruleName = 'IT-Learning-Lab-CI-block-outbound'
try {
  New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -Action Block -RemoteAddress Any | Out-Null
  if (Can-Connect $remote) { throw 'Outbound firewall precondition did not block the online preflight address' }
  Write-Host 'Confirmed a previously reachable external TCP endpoint is blocked.'
  $setup = Start-Process -FilePath $installer.FullName -ArgumentList '/S','/NS' -PassThru
  if (-not $setup.WaitForExit(180000)) { Stop-Process -Id $setup.Id -Force; throw 'Offline installer timed out' }
  if ($setup.ExitCode -ne 0) { throw "Offline installer returned $($setup.ExitCode)" }
  $installedRuntime = Get-WebViewRuntime
  if (-not $installedRuntime) { throw 'Embedded installer did not register WebView2 while offline' }
  Write-Host "Offline installation registered WebView2 $installedRuntime."
  $installDir = Join-Path $env:LOCALAPPDATA 'IT Learning Lab'
  $appExe = Get-ChildItem $installDir -Filter 'it-learning-lab.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $appExe) { throw "Installed executable not found in $installDir" }
  foreach ($notice in @('RUST-DEPENDENCIES.txt','MICROSOFT-WEBVIEW2-SDK-BSD.txt')) {
    if (-not (Get-ChildItem $installDir -Filter $notice -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)) {
      throw "Installed notice missing: $notice"
    }
  }
  node scripts/verify-windows-native.mjs $appExe.FullName
  if ($LASTEXITCODE -ne 0) { throw "Native incident test failed ($LASTEXITCODE)" }
  if (Can-Connect $remote) { throw 'Outbound isolation was lost during the test' }
  Write-Host 'Native incident completed and persistence verified while outbound traffic was blocked.'
} finally {
  Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Write-Host 'Removed temporary outbound firewall rule.'
}
