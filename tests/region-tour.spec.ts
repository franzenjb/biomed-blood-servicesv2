import { test, expect } from "@playwright/test";
import { REGION_SUMMARIES } from "../src/data/regionSummaries";

// Region Tour (/ops?tour=1) — client requirements 2026-06-11:
// - region picker must be collapsible
// - every tour slide must show all charts/KPIs/text without scrolling

test.describe("Region Tour", () => {
  test("workbench layer/results panels are hidden while the tour is active", async ({ page }) => {
    await page.goto("/ops?tour=1");
    await expect(page.locator(".rt-picker")).toBeVisible();
    await expect(page.locator(".opsv2__panel--left")).toBeHidden();
    await expect(page.locator(".opsv2__panel--right")).toBeHidden();

    await page.locator(".rt-topbar__close").click();
    await expect(page.locator(".rt-picker")).toBeHidden();
    await expect(page.locator(".opsv2__panel--left")).toBeVisible();
    await expect(page.locator(".opsv2__panel--right")).toBeVisible();
  });

  test("region picker collapses to a pill and reopens", async ({ page }) => {
    await page.goto("/ops?tour=1");
    const picker = page.locator(".rt-picker");
    await expect(picker).toBeVisible();

    await page.getByRole("button", { name: "Hide region list" }).click();
    await expect(picker).toBeHidden();

    const pill = page.getByRole("button", { name: /Regions/ });
    await expect(pill).toBeVisible();
    await pill.click();
    await expect(picker).toBeVisible();
  });

  for (const vp of [
    { name: "laptop", width: 1280, height: 800 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`all slides fit without scrolling for every region @ ${vp.name}`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/ops?tour=1");
      await expect(page.locator(".rt-picker")).toBeVisible();

      const problems: string[] = [];
      for (const region of REGION_SUMMARIES) {
        await page.locator(".rt-regbtn", { hasText: region.region }).first().click();
        await expect(page.locator(".rt-panel__hd h2")).toContainText(region.region);

        for (let s = 0; s < 3; s++) {
          await page.locator(".rt-dot2").nth(s).click();
          await page.waitForTimeout(120);
          const verdict = await page.evaluate(() => {
            const body = document.querySelector(".rt-panel__body") as HTMLElement | null;
            const panel = document.querySelector(".rt-panel") as HTMLElement | null;
            if (!body || !panel) return "panel missing";
            const scroll = body.scrollHeight - body.clientHeight;
            if (scroll > 4) return `body needs ${scroll}px of scrolling`;
            const rect = panel.getBoundingClientRect();
            if (rect.bottom > window.innerHeight + 2 || rect.right > window.innerWidth + 2) {
              return "panel extends past viewport";
            }
            return null;
          });
          if (verdict) problems.push(`${region.region} slide ${s + 1}: ${verdict}`);
        }
      }

      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
});
