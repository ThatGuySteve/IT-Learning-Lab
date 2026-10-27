# Complement the whole-machine offline install test without disconnecting CI.
# Only the installed app and its WebView2 process are blocked by these rules.
$ErrorActionPreference = 'Stop'
$installer = Get-ChildItem src-tauri/target/release/bundle/nsis/*-setup.exe | Select-Object -First 1
if (-not $installer) { throw 'Installer not found' }
$setup = Start-Process -FilePath $installer.FullName -ArgumentList '/S','/NS' -PassThru
if (-not $setup.WaitForExit(120000)) { Stop-Process -Id $setup.Id -Force; throw 'Installer timed out' }
if ($setup.ExitCode -ne 0) { throw "Installer returned $($setup.ExitCode)" }
$installDir = Join-Path $env:LOCALAPPDATA 'IT Learning Lab'
$appExe = Get-ChildItem $installDir -Filter 'it-learning-lab.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $appExe) { throw 'Installed app was not found' }
$key = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$runtimeVersion = (Get-ItemProperty $key -ErrorAction Stop).pv
$webviewExe = Join-Path ${env:ProgramFiles(x86)} "Microsoft\EdgeWebView\Application\$runtimeVersion\msedgewebview2.exe"
if (-not (Test-Path $webviewExe)) { throw "WebView2 executable not found: $webviewExe" }
$appRule = 'IT-Learning-Lab-CI-block-app'
$webviewRule = 'IT-Learning-Lab-CI-block-webview'
try {
  New-NetFirewallRule -DisplayName $appRule -Direction Outbound -Action Block -Program $appExe.FullName | Out-Null
  New-NetFirewallRule -DisplayName $webviewRule -Direction Outbound -Action Block -Program $webviewExe | Out-Null
  $env:IT_LAB_WEBVIEW_OFFLINE = 'true'
  node scripts/verify-windows-native.mjs $appExe.FullName
  if ($LASTEXITCODE -ne 0) { throw "Native persistence test failed ($LASTEXITCODE)" }
  foreach ($name in @($appRule,$webviewRule)) {
    if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) { throw "Missing firewall rule: $name" }
  }
  Write-Host 'PASS: installed app completed and persisted while app and WebView2 outbound access was blocked.'
} finally {
  Get-NetFirewallRule -DisplayName $appRule,$webviewRule -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Remove-Item Env:IT_LAB_WEBVIEW_OFFLINE -ErrorAction SilentlyContinue
}
