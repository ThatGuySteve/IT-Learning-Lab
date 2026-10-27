// Drives the installed production WebView2 app on a disposable Windows runner.
// CDP is enabled only for these test processes, not in the shipped app.
import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const executable = process.argv[2];
if (process.platform !== "win32" || !executable) throw new Error("Expected the installed Windows executable");
await mkdir("test-results/windows-native", { recursive: true });
let app, browser, page;

async function launch(port) {
  app = spawn(executable, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*` },
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
    spawnSync("taskkill.exe", ["/PID", String(app.pid)], { encoding: "utf8" });
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
  await closeApp();
  await launch(19222);
  await expect(page.getByLabel("Escalation note")).toHaveValue(escalation);
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
  await page.getByRole("button", { name: "Review skills report" }).click();
  await expect(page.getByRole("heading", { name: "Incident completed" })).toBeVisible();
  await expect(page.getByText("Independent", { exact: true })).toBeVisible();
  await expect(page.getByText("Not yet met")).toHaveCount(0);
  await page.screenshot({ path: "test-results/windows-native/completed.png", fullPage: true });
  await closeApp();
  await launch(19224);
  await expect(page.getByRole("heading", { name: "Incident completed" })).toBeVisible();
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
}
