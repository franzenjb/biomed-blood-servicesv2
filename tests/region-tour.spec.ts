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

    // No Exit-tour button: the app-bar Home (→ /hub) is the only way out, and
    // the app bar retitles to the story experience while the tour is active.
    await expect(page.locator(".rt-topbar__close")).toHaveCount(0);
    await expect(page.locator(".rcbar__home")).toHaveAttribute("href", "/hub");
    await expect(page.locator(".rcbar__titles h1")).toHaveText("Regional Story Explorer");
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

// Client enhancements #1/#2 (2026-06-11): Mobile / Fixed Site story buttons on
// the Overall summary slide; clicking a center in the Fixed Site story opens a
// per-site story.
test.describe("Region stories", () => {
  test("Mobile and Fixed Site stories open from Overall summary; site click opens site story", async ({ page }) => {
    await page.goto("/ops?tour=1");
    await page.locator(".rt-regbtn", { hasText: "Kentucky" }).first().click();
    await expect(page.locator(".rt-panel__hd h2")).toContainText("Kentucky");

    // Mobile story
    await page.getByRole("button", { name: /Mobile Story/ }).click();
    await expect(page.locator(".rt-slabel")).toContainText("Mobile Story · 1 of 2");
    await page.getByRole("button", { name: /^Next/ }).click();
    await expect(page.locator(".rt-slabel")).toContainText("Mobile Story · 2 of 2");
    await page.getByRole("button", { name: "Back to overall summary" }).click();
    await expect(page.locator(".rt-slabel")).toContainText("Overall summary");

    // Fixed Site story: centers list is page 1; click a center → per-site story
    await page.getByRole("button", { name: /Fixed Site Story/ }).click();
    await expect(page.locator(".rt-slabel")).toContainText("Fixed Site Story · 1 of 2");
    await page.locator(".rt-sitebtn").first().click();
    await expect(page.locator(".rt-slabel")).toContainText("Site Story");
    await expect(page.locator(".rt-sitename")).toContainText("East End Louisville");
    await page.getByRole("button", { name: "Back to centers" }).first().click();
    await expect(page.locator(".rt-slabel")).toContainText("Fixed Site Story · 1 of 2");
    // Page 2 is the regional rollup
    await page.getByRole("button", { name: /^Next/ }).click();
    await expect(page.locator(".rt-slabel")).toContainText("Fixed Site Story · 2 of 2");
  });

  test("story slides and site story fit without scrolling (sample regions)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ops?tour=1");
    const problems: string[] = [];
    const check = async (label: string) => {
      await page.waitForTimeout(100);
      const v = await page.evaluate(() => {
        const body = document.querySelector(".rt-panel__body") as HTMLElement | null;
        if (!body) return "panel missing";
        const scroll = body.scrollHeight - body.clientHeight;
        return scroll > 4 ? `needs ${scroll}px of scrolling` : null;
      });
      if (v) problems.push(`${label}: ${v}`);
    };
    for (const region of ["Central and Southern Ohio", "Kentucky", "Eastern New York"]) {
      await page.locator(".rt-regbtn", { hasText: region }).first().click();
      await expect(page.locator(".rt-panel__hd h2")).toContainText(region);
      await page.getByRole("button", { name: /Mobile Story/ }).click();
      await check(`${region} mobile 1`);
      await page.getByRole("button", { name: /^Next/ }).click();
      await check(`${region} mobile 2`);
      await page.getByRole("button", { name: "Back to overall summary" }).click();
      await page.getByRole("button", { name: /Fixed Site Story/ }).click();
      await check(`${region} fixed 1`);
      await page.locator(".rt-sitebtn").first().click();
      await check(`${region} site story`);
      await page.getByRole("button", { name: "Back to centers" }).first().click();
      await page.getByRole("button", { name: /^Next/ }).click();
      await check(`${region} fixed 2`);
      await page.getByRole("button", { name: "Back to overall summary" }).click();
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
