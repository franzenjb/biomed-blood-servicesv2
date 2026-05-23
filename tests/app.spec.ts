import { test, expect } from "@playwright/test";

test.describe("Home", () => {
  test("renders hero, CTAs, and five chapter cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("chain of care");
    await expect(page.getByTestId("start-presentation")).toBeVisible();
    await expect(page.getByTestId("hero-map")).toBeVisible();
    for (const id of ["blood-101", "collections", "journey", "distribution", "future-demand"]) {
      await expect(page.getByTestId(`home-card-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId("home-card-map")).toBeVisible();
  });
});

test.describe("Menu", () => {
  test("opens, lists sections + map, and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("menu-trigger").click();
    await expect(page.getByTestId("menu-overlay")).toBeVisible();
    await expect(page.getByTestId("menu-card-journey")).toBeVisible();
    await expect(page.getByTestId("menu-card-map")).toBeVisible();
    await page.getByTestId("menu-card-distribution").click();
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

  test("presentation mode chains to the next section", async ({ page }) => {
    await page.goto("/s/blood-101?present=1");
    // wait for the (lazy) deck to mount so its keydown listener is attached
    await expect(page.getByTestId("deck")).toBeVisible();
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
    // jump to last slide, then advance to next section
    await page.keyboard.press("End");
    await expect(page.getByTestId("deck-counter")).toContainText("05 /");
    await expect(page.getByTestId("deck-next-section")).toBeVisible();
    await page.getByTestId("deck-next-section").click();
    await expect(page).toHaveURL(/\/s\/collections\?present=1/);
    await expect(page.getByTestId("deck")).toHaveAttribute("data-section", "collections");
  });
});

test.describe("Map (public-safe gate)", () => {
  test("loads anonymously with NO sign-in prompt or permission error", async ({ page }) => {
    const badMessages: string[] = [];
    const watch = (text: string) => {
      if (/permission|do not have|sign in|token required|401|invalid token/i.test(text)) {
        badMessages.push(text);
      }
    };
    page.on("console", (m) => watch(m.text()));
    page.on("pageerror", (e) => watch(e.message));

    await page.goto("/map");
    await expect(page.getByTestId("map-workspace")).toBeVisible();
    // ArcGIS view mounts and loading clears.
    await expect(page.locator(".esri-view")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("map-loading")).toHaveCount(0, { timeout: 30_000 });

    // No ArcGIS OAuth iframe / login surface should ever appear.
    await expect(page.locator(".esri-identity-modal")).toHaveCount(0);
    expect(badMessages, badMessages.join("\n")).toEqual([]);
  });

  test("layer toggles and region focus work", async ({ page }) => {
    await page.goto("/map");
    await expect(page.locator(".esri-view")).toBeVisible({ timeout: 30_000 });
    const future = page.getByTestId("toggle-future").locator("input");
    await expect(future).not.toBeChecked();
    await future.check();
    await expect(future).toBeChecked();
    await page.getByTestId("region-tennessee").click();
    await expect(page.getByTestId("region-tennessee")).toHaveClass(/is-active/);
  });
});
