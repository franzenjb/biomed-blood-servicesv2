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
  test("is the grid of 5 chapters + 4 tool tiles, and navigates", async ({ page }) => {
    await page.goto("/hub");
    await expect(page.getByTestId("hub")).toBeVisible();
    for (const id of ["blood-101", "collections", "journey", "distribution", "future-demand"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    // 4 tool tiles (#6-#9): merged map+dashboard, ops, hospital network, regions
    for (const id of ["map-dashboard", "ops-workbench", "hospital-network", "regions"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    // separated map + dashboard tiles are gone (merged into one)
    for (const id of ["map", "dashboard", "map-v3", "map-tool", "ops", "layers", "maps-menu"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toHaveCount(0);
    }
    await page.getByTestId("hub-card-distribution").click();
    await expect(page).toHaveURL(/\/s\/distribution/);
    await expect(page.getByTestId("deck")).toHaveAttribute("data-section", "distribution");
  });
});

test.describe("Notes panel", () => {
  test("adds, resolves, filters, reopens, and removes a shared page note", async ({ page }) => {
    const noteText = `Playwright shared notes probe ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: /Notes/i }).click();
    await expect(page.getByText("Notes & questions")).toBeVisible();
    await expect(page.getByText(/Shared live|Local fallback/)).toBeVisible();

    await page.getByLabel("Author").selectOption("Client");
    await page.getByLabel("Kind").selectOption("question");
    await page.getByPlaceholder(/Add a question for Home/).fill(noteText);
    await page.getByRole("button", { name: "Save" }).click();

    const note = page.locator(".np-note").filter({ hasText: noteText });
    await expect(note).toBeVisible({ timeout: 10_000 });
    await expect(note.getByText("Open")).toBeVisible();

    await page.getByRole("button", { name: /All pages/ }).click();
    await expect(note).toBeVisible();

    await note.getByRole("button", { name: "Resolve" }).click();
    await expect(note.getByText("Resolved")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Open only/ }).click();
    await expect(page.getByRole("heading", { name: "Open items across pages" })).toBeVisible();
    await expect(note).toHaveCount(0);

    await page.getByRole("button", { name: "All statuses" }).click();
    await expect(note).toBeVisible();
    await note.getByRole("button", { name: "Reopen" }).click();
    await expect(note.getByText("Open")).toBeVisible({ timeout: 10_000 });

    await note.getByRole("button", { name: "Delete note" }).click();
    await expect(note).toHaveCount(0);
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

  test("advancing past the final slide goes to the hub", async ({ page }) => {
    await page.goto("/s/blood-101");
    await expect(page.getByTestId("deck")).toBeVisible();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("home icon returns to the hub", async ({ page }) => {
    await page.goto("/s/collections");
    await expect(page.getByTestId("deck")).toBeVisible();
    await page.getByRole("link", { name: "Back to chapters" }).click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("presentation mode chains sections then ends at the hub", async ({ page }) => {
    // start at the LAST section in present mode to verify the finish -> hub hop
    await page.goto("/s/collections?present=1");
    await expect(page.getByTestId("deck")).toBeVisible();
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
    await page.keyboard.press("End");
    await expect(page.getByTestId("deck-next-section")).toContainText("Finish");
    await page.getByTestId("deck-next-section").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("presentation mode advances blood-101 -> journey", async ({ page }) => {
    await page.goto("/s/blood-101?present=1");
    await expect(page.getByTestId("deck")).toBeVisible();
    await expect(page.getByTestId("deck-counter")).toContainText("01 /");
    await page.keyboard.press("End");
    await expect(page.getByTestId("deck-next-section")).toBeVisible();
    await page.getByTestId("deck-next-section").click();
    await expect(page).toHaveURL(/\/s\/journey\?present=1/);
  });
});

test.describe("Maps (shared shell)", () => {
  test("/map renders the shared shell + sign-in gate", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByTestId("map-shell")).toBeVisible();
    await expect(page.getByTestId("map-gate")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("map-signin")).toBeVisible();
    await expect(page.getByTestId("map-tab-layers")).toBeVisible();
    await expect(page.getByTestId("map-tab-details")).toBeVisible();
  });

  test("/dashboard embeds the ArcGIS dashboard with a hub back link", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard")).toBeVisible();
    await expect(page.getByTestId("dash-frame")).toHaveAttribute("src", /arcgis\.com\/apps\/dashboards/);
    await page.getByTestId("dash-back").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("map back link returns to hub", async ({ page }) => {
    await page.goto("/map");
    await page.getByTestId("map-back").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  // Retired routes fall through to the home redirect.
  for (const path of ["/map-v3", "/map-tool", "/ops", "/layers", "/maps-menu"]) {
    test(`${path} redirects home`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});
