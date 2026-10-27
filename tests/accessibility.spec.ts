import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

async function check(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof axe }).axe;
    return engine.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
  });
  expect(
    result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

test("automated accessibility checks across the incident screens", async ({
  page,
}) => {
  await page.goto("/");
  await check(page);
  await page.getByRole("button", { name: "Start guided practice" }).click();
  await check(page);
  await page
    .getByRole("button", { name: "Review ticket & investigate" })
    .click();
  await check(page);
  await page
    .getByRole("button", { name: "Escalate to network support" })
    .click();
  await page.getByRole("button", { name: "Inspect switch ports" }).click();
  await check(page);
  await page.getByRole("button", { name: "Review skills report" }).click();
  await check(page);
});
