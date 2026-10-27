import { expect, test } from "@playwright/test";

test("independent incident, persistence, offline work, repair and reset", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") {
      external.push(url.toString());
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start independent assessment" })
    .click();
  await page
    .getByRole("button", { name: "Review ticket & investigate" })
    .click();
  for (const name of [
    "Inspect printer",
    "Inspect workstation",
    "Inspect network plan",
  ])
    await page.getByRole("button", { name }).click();
  await page.getByRole("button", { name: "Test printer", exact: true }).click();
  await expect(
    page.getByText("No reply · current configuration"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Test reference host" }).click();
  await page.getByLabel("Most likely area to investigate").selectOption("vlan");
  await page
    .getByLabel("Escalation note")
    .fill(
      "Printer is unreachable after the move; ping failed. Please inspect the switch port and network.",
    );
  await page.reload();
  await expect(page.getByLabel("Escalation note")).toHaveValue(
    /Printer is unreachable/,
  );
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Escalate to network support" })
    .click();
  await page.getByRole("button", { name: "Inspect switch ports" }).click();
  await page.getByLabel("Access VLAN").fill("20");
  await page.getByRole("button", { name: "Apply change" }).click();
  await page.getByRole("button", { name: "Test printer", exact: true }).click();
  await page.getByRole("button", { name: "Test other network pair" }).click();
  await page
    .getByLabel("Resolution note")
    .fill(
      "Printer port eth1 changed to VLAN 20. Ping received a reply. Rollback: restore the previous VLAN 10.",
    );
  await page.getByRole("button", { name: "Review skills report" }).click();
  await expect(
    page.getByRole("heading", { name: "Incident completed" }),
  ).toBeVisible();
  await expect(page.getByText("Independent", { exact: true })).toBeVisible();
  await expect(page.getByText("Not yet met")).toHaveCount(0);
  expect(external).toEqual([]);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset and try again" }).click();
  await expect(
    page.getByRole("button", { name: "Start independent assessment" }),
  ).toBeVisible();
});

test("a report alone cannot pass, hints change independence, invalid imports are rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"command":"arbitrary"}'),
  });
  await expect(page.getByRole("status")).toContainText("invalid incident");
  await page
    .getByRole("button", { name: "Start independent assessment" })
    .click();
  await page.getByRole("button", { name: "Reveal next hint" }).click();
  await page.getByRole("button", { name: "Skills report" }).click();
  await expect(
    page.getByRole("heading", { name: "More evidence needed" }),
  ).toBeVisible();
  await expect(page.getByText("Assisted / guided")).toBeVisible();
});

test("reset remains available on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided practice" }).click();
  await expect(
    page.getByRole("button", { name: "Reset attempt" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset attempt" }).click();
  await expect(
    page.getByRole("button", { name: "Start guided practice" }),
  ).toBeVisible();
});

test("early report feedback is recorded as assistance even without hints", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start independent assessment" })
    .click();
  await expect(
    page.getByText(
      "Viewing an incomplete report marks the attempt as assisted.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skills report" }).click();
  await expect(page.getByText("Assisted / guided")).toBeVisible();
  await expect(page.getByText("Early feedback: Viewed")).toBeVisible();
  await expect(page.getByText("Hints used: 0")).toBeVisible();
});
