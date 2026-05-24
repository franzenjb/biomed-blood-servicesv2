import { test, expect } from "@playwright/test";

test.describe("Home (hero)", () => {
  test("renders hero and entry CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("chain of care");
    await expect(page.getByTestId("enter-hub")).toBeVisible();
    await expect(page.getByTestId("start-presentation")).toHaveCount(0);
    await page.getByTestId("enter-hub").click();
    await expect(page).toHaveURL(/\/hub$/);
  });
});

test.describe("Hub", () => {
  test("is the grid of five chapters + map, and navigates", async ({ page }) => {
    await page.goto("/hub");
    await expect(page.getByTestId("hub")).toBeVisible();
    for (const id of ["blood-101", "collections", "journey", "distribution", "future-demand"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    for (const id of ["map", "map-v3", "dashboard", "map-tool", "ops", "layers", "maps-menu"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    await page.getByTestId("hub-card-distribution").click();
    await expect(page).toHaveURL(/\/s\/distribution/);
    await expect(page.getByTestId("deck")).toHaveAttribute("data-section", "distribution");
  });
});

test.describe("Slide deck", () => {
  test("loads a section and advances by keyboard", async ({ page }) => {
    await page.goto("/s/blood-101");
    await expect(page.getByTestId("deck")).toBeVisible();
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("deck-counter")).toContainText("02 /");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
  });

  test("dots jump to a slide", async ({ page }) => {
    await page.goto("/s/journey");
    const dots = page.locator(".deck__dot");
    await dots.nth(2).click();
    await expect(page.getByTestId("deck-counter")).toContainText("03 /");
  });

  test("end of a chapter returns to the hub", async ({ page }) => {
    await page.goto("/s/blood-101");
    await expect(page.getByTestId("deck")).toBeVisible();
    await page.keyboard.press("End");
    await page.getByTestId("deck-to-hub").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("close (✕) returns to the hub", async ({ page }) => {
    await page.goto("/s/collections");
    await expect(page.getByTestId("deck")).toBeVisible();
    await page.getByRole("link", { name: "Back to chapters" }).click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("presentation mode chains sections then ends at the hub", async ({ page }) => {
    // start at the LAST section in present mode to verify the finish -> hub hop
    await page.goto("/s/future-demand?present=1");
    await expect(page.getByTestId("deck")).toBeVisible();
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
    await page.keyboard.press("End");
    await expect(page.getByTestId("deck-next-section")).toContainText("Finish");
    await page.getByTestId("deck-next-section").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("presentation mode advances blood-101 -> collections", async ({ page }) => {
    await page.goto("/s/blood-101?present=1");
    await expect(page.getByTestId("deck")).toBeVisible();
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
    await page.keyboard.press("End");
    await expect(page.getByTestId("deck-next-section")).toBeVisible();
    await page.getByTestId("deck-next-section").click();
    await expect(page).toHaveURL(/\/s\/collections\?present=1/);
  });
});

test.describe("Real maps (OAuth)", () => {
  for (const path of ["/map", "/dashboard", "/map-v3"]) {
    test(`${path} renders the ArcGIS sign-in gate (not crash)`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(/sign in/i).first()).toBeVisible({ timeout: 20_000 });
    });
  }

  test("map back link returns to hub", async ({ page }) => {
    await page.goto("/map");
    await page.locator("a.biomed-live-back").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  // The remaining lifted tools — verify each route mounts (does not fall through
  // to the home redirect). Dragon will weed out the ones he doesn't want.
  for (const path of ["/map-tool", "/ops", "/layers", "/maps-menu"]) {
    test(`${path} mounts`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"));
      await expect(page.locator(".route-loading")).toHaveCount(0, { timeout: 15_000 });
    });
  }
});
