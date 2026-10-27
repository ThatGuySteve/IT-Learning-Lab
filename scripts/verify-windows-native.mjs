// Drives the installed production WebView2 app on a disposable Windows runner.
// CDP is enabled by a temporary machine policy on the disposable CI runner,
// not in the shipped app. Elevated WebView2 150+ ignores user env overrides:
// https://github.com/MicrosoftEdge/WebView2Feedback/issues/5645
import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const executable = process.argv[2];
if (process.platform !== "win32" || process.env.GITHUB_ACTIONS !== "true" || !executable) {
  throw new Error("Run only on a disposable Windows GitHub Actions runner");
}
await mkdir("test-results/windows-native", { recursive: true });
let app, browser, page;
const policyKey = "HKLM\\Software\\Policies\\Microsoft\\Edge\\WebView2\\AdditionalBrowserArguments";
const policyName = "it-learning-lab.exe";
if (spawnSync("reg.exe", ["query", policyKey, "/v", policyName], { stdio: "ignore" }).status === 0) {
  throw new Error("An existing app debug policy is present; refusing to overwrite it");
}

async function launch(port) {
  const args = `--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port=${port} --remote-allow-origins=*`;
  const configured = spawnSync("reg.exe", ["add", policyKey, "/v", policyName, "/t", "REG_SZ", "/d", args, "/f"], { encoding: "utf8" });
  if (configured.status !== 0) throw new Error(`Could not configure temporary WebView2 test policy: ${configured.stderr}`);
  app = spawn(executable, [], {
    stdio: "ignore",
  });
  let error;
  for (let i = 0; i < 60; i++) {
    if (app.exitCode !== null) throw new Error(`Desktop app exited: ${app.exitCode}`);
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 });
      const context = browser.contexts()[0];
      page = context.pages()[0] ?? await context.waitForEvent("page", { timeout: 10000 });
      await page.waitForLoadState("domcontentloaded");
      return;
    } catch (e) { error = e; await delay(1000); }
  }
  throw new Error(`Could not connect to installed WebView2: ${error}`);
}

async function closeApp() {
  if (browser) { await browser.close(); browser = undefined; }
  if (app && app.exitCode === null) {
    const result = spawnSync("taskkill.exe", ["/PID", String(app.pid)], { encoding: "utf8", timeout: 10000 });
    if (result.error) throw result.error;
    for (let i = 0; i < 20 && app.exitCode === null; i++) await delay(500);
    if (app.exitCode === null) throw new Error("Desktop app did not close normally");
  }
  app = undefined;
}

try {
  await launch(19221);
  await page.getByRole("button", { name: "Start independent assessment" }).click();
  await page.getByRole("button", { name: "Review ticket & investigate" }).click();
  for (const name of ["Inspect printer", "Inspect workstation", "Inspect network plan"]) await page.getByRole("button", { name }).click();
  await page.getByRole("button", { name: "Test printer", exact: true }).click();
  await expect(page.getByText("No reply · current configuration")).toBeVisible();
  await page.getByRole("button", { name: "Test reference host" }).click();
  await page.getByLabel("Most likely area to investigate").selectOption("vlan");
  const escalation = "Printer is unreachable after the move; ping failed. Please inspect the switch port and network.";
  await page.getByLabel("Escalation note").fill(escalation);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("it-learning-lab.inc1001.v1") || "null")?.escalation)).toBe(escalation);
  console.log("PASS: triage and initial diagnosis saved");
  await closeApp();
  await launch(19222);
  await expect(page.getByLabel("Escalation note")).toHaveValue(escalation);
  console.log("PASS: escalation survived first restart");
  await page.getByRole("button", { name: "Escalate to network support" }).click();
  await page.getByRole("button", { name: "Inspect switch ports" }).click();
  await page.getByLabel("Access VLAN").fill("20");
  await page.getByRole("button", { name: "Apply change" }).click();
  await page.getByRole("button", { name: "Test printer", exact: true }).click();
  await expect(page.getByText("Reply received · current configuration")).toBeVisible();
  await page.getByRole("button", { name: "Test other network pair" }).click();
  const resolution = "Printer port eth1 changed to VLAN 20. Ping received a reply. Rollback: restore the previous VLAN 10.";
  await page.getByLabel("Resolution note").fill(resolution);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("it-learning-lab.inc1001.v1") || "null")?.resolution)).toBe(resolution);
  await closeApp();
  await launch(19223);
  await expect(page.getByLabel("Resolution note")).toHaveValue(resolution);
  await expect(page.getByRole("row").filter({ hasText: "eth1" }).locator("td").nth(2)).toHaveText("20");
  console.log("PASS: repair and resolution survived second restart");
  await page.getByRole("button", { name: "Review skills report" }).click();
  await expect(page.getByRole("heading", { name: "Incident completed" })).toBeVisible();
  await expect(page.getByText("Independent", { exact: true })).toBeVisible();
  await expect(page.getByText("Not yet met")).toHaveCount(0);
  await page.screenshot({ path: "test-results/windows-native/completed.png", fullPage: true });
  console.log("PASS: independent completed report");
  await closeApp();
  await launch(19224);
  await expect(page.getByRole("heading", { name: "Incident completed" })).toBeVisible();
  console.log("PASS: completed report survived third restart");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Reset and try again" }).click();
  await expect(page.getByRole("button", { name: "Start independent assessment" })).toBeVisible();
  await closeApp();
  await launch(19225);
  await expect(page.getByRole("button", { name: "Start independent assessment" })).toBeVisible();
  console.log("PASS: installed Windows app: offline triage, two restarts, repair, verification, report, restart and reset persistence");
} catch (error) {
  if (page) await page.screenshot({ path: "test-results/windows-native/failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally {
  await closeApp().catch(() => { if (app) app.kill(); });
  spawnSync("reg.exe", ["delete", policyKey, "/v", policyName, "/f"], { stdio: "ignore" });
}
