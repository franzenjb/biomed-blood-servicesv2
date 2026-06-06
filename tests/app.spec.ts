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
    await expect(page.locator(".hub__grid .hub__card")).toHaveCount(9);
    for (const id of ["blood-101", "collections", "journey", "distribution", "future-demand"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    // 4 tool tiles (#6-#9): merged map+dashboard, ops, hospital network, regions
    for (const id of ["map-dashboard", "ops-workbench", "hospital-network", "regions"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId("hub-card-hospital-network").locator(".hub__index")).toHaveText("08");
    await expect(page.getByTestId("hub-card-regions").locator(".hub__index")).toHaveText("09");
    // separated map/dashboard tiles and the internal atlas tile are gone from the hub
    for (const id of ["map", "dashboard", "map-v3", "map-tool", "ops", "layers", "maps-menu", "layer-atlas"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toHaveCount(0);
    }
    await expect(page.getByTestId("hub-card-ops-workbench")).toHaveAttribute("href", "/biomed-ops-workbench");
    await expect(page.getByTestId("hub-card-hospital-network")).toHaveAttribute("href", "/hospital-network");
    await page.getByTestId("hub-card-distribution").click();
    await expect(page).toHaveURL(/\/s\/distribution/);
    await expect(page.getByTestId("deck")).toHaveAttribute("data-section", "distribution");
  });
});

test.describe("Notes panel", () => {
  test("adds, edits, completes, reopens, and removes a universal task", async ({ page }) => {
    const noteText = `Playwright local notes probe ${Date.now()}`;
    const editedText = `${noteText} - edited`;

    await page.addInitScript(() => {
      window.localStorage.setItem("biomed-notes-force-local", "true");
      window.localStorage.removeItem("biomed-notes-v1");
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Notes/i }).click();
    await expect(page.getByText("Review tasks")).toBeVisible();
    await expect(page.getByText(/Shared live|Local fallback/)).toBeVisible();

    await page.getByLabel("Author").selectOption("Client");
    await page.getByLabel("Kind").selectOption("question");
    await page.getByPlaceholder(/Add task/).fill(noteText);
    await page.getByRole("button", { name: "Save" }).click();

    let note = page.locator(".np-note").filter({ hasText: noteText });
    await expect(note).toBeVisible({ timeout: 10_000 });
    await expect(note.getByText("Open task")).toBeVisible();

    await note.getByRole("button", { name: "Edit" }).click();
    await note.locator(".np-edit__text").fill(editedText);
    await note.locator(".np-edit__kind").selectOption("answer");
    await note.getByRole("button", { name: "Save edit" }).click();

    note = page.locator(".np-note").filter({ hasText: editedText });
    await expect(note).toBeVisible({ timeout: 10_000 });
    await expect(note.locator(".np-edit")).toHaveCount(0, { timeout: 10_000 });
    await expect(note.locator(".np-note__kind")).toHaveText("answer");
    await expect(page.locator(".np-note").filter({ hasText: noteText }).filter({ hasNotText: editedText })).toHaveCount(0);

    await note.getByRole("checkbox", { name: "Mark task completed" }).click();
    await expect(note).toHaveCount(0);

    await page.getByRole("button", { name: /Completed/ }).click();
    await expect(page.getByRole("heading", { name: "Completed tasks" })).toBeVisible();
    note = page.locator(".np-note").filter({ hasText: editedText });
    await expect(note).toBeVisible({ timeout: 10_000 });
    await expect(note.getByText("Completed")).toBeVisible();
    await expect(note.getByRole("checkbox", { name: "Reopen task" })).toBeChecked();

    await note.getByRole("checkbox", { name: "Reopen task" }).click();
    await expect(note).toHaveCount(0);
    await page.getByRole("button", { name: /Open tasks/ }).click();
    note = page.locator(".np-note").filter({ hasText: editedText });
    await expect(note).toBeVisible({ timeout: 10_000 });
    await expect(note.getByText("Open task")).toBeVisible();

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
    const mapWidgetOrder = await page.getByTestId("map-shell-arcgis").evaluate((element) =>
      Array.from(element.children)
        .filter((child) => child.getAttribute("slot") === "top-left")
        .map((child) => child.tagName.toLowerCase()),
    );
    expect(mapWidgetOrder).toEqual(["arcgis-home", "arcgis-zoom"]);
    await expect(page.locator('arcgis-scale-bar[slot="bottom-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-expand[slot="bottom-right"] arcgis-basemap-gallery')).toHaveCount(1);
    await expect(page.getByTestId("map-gate")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("map-signin")).toBeVisible();
    await expect(page.getByTestId("map-tab-layers")).toBeVisible();
    await expect(page.getByTestId("map-tab-details")).toBeVisible();
  });

  test("/dashboard embeds the ArcGIS dashboard with a home back link", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard")).toBeVisible();
    await expect(page.getByTestId("dash-frame")).toHaveAttribute("src", /arcgis\.com\/apps\/dashboards/);
    await expect(page.getByTestId("dash-back")).toContainText("Home");
    await page.getByTestId("dash-back").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("map back link returns to hub", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByTestId("map-back")).toContainText("Home");
    await page.getByTestId("map-back").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("/biomed-ops-workbench renders V2 layer controls and selected feature shell", async ({ page }) => {
    await page.goto("/biomed-ops-workbench");
    await expect(page.getByTestId("biomed-ops-workbench")).toBeVisible();
    await expect(page.getByTestId("ops-back-hub")).toHaveAttribute("href", "/hub");
    await expect(page.getByTestId("ops-back-hub")).toContainText("Home");
    await expect(page.getByText("Quick View")).toBeVisible();
    const opsWidgetOrder = await page.getByTestId("biomed-ops-arcgis").evaluate((element) =>
      Array.from(element.children)
        .filter((child) => child.getAttribute("slot") === "top-left")
        .map((child) => child.tagName.toLowerCase()),
    );
    expect(opsWidgetOrder).toEqual(["arcgis-home", "arcgis-zoom"]);
    await expect(page.getByTestId("biomed-ops-arcgis")).toHaveAttribute("basemap", "gray-vector");
    await expect(page.locator('arcgis-search[slot="top-right"]')).toHaveCount(1);
    await expect(page.locator('arcgis-scale-bar[slot="bottom-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-expand[slot="bottom-right"] arcgis-basemap-gallery')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Layer controls" })).toBeVisible();
    await expect(page.getByTestId("ops-layer-legend-marker")).toHaveCount(18);
    await expect(page.getByTestId("ops-layer-legend-marker").first()).toHaveAttribute("data-kind", /.+/);
    await expect(page.getByRole("button", { name: "Hospitals & Patient Care" })).toContainText("1/1");
    const hospitalLayer = page.locator("button.opsv2__layer").filter({ hasText: "Hospital Locations" });
    await expect(hospitalLayer).toContainText("Hospital location layer for patient-care reach and network context.");
    await expect(hospitalLayer.locator('[data-testid="ops-layer-legend-marker"]')).toHaveAttribute(
      "data-kind",
      "hospital",
    );
    await expect(page.getByText("Use for local donor access.")).toHaveCount(0);
    await expect(page.getByText("Use for distribution and patient-care readiness.")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Current" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
    await expect(page.getByText("Layer group subtotals")).toBeVisible();
    await expect(page.getByRole("button", { name: "Jurisdictions & Regions" })).toContainText(
      "BioMed ownership first; HS boundaries only for alignment comparison.",
    );
    await expect(page.getByRole("button", { name: "Biomed Divisions" })).toContainText("BioMed division boundaries.");
    await expect(page.getByRole("button", { name: "Biomed Divisions" })).not.toContainText(
      "Start here for the national leadership view.",
    );
    await page.getByRole("tab", { name: "Detail" }).click();
    await expect(page.getByText("No feature selected.")).toBeVisible();
  });

  test("/biomed-layer-atlas adds the supplemental layer to the workbench stack", async ({ page }) => {
    await page.goto("/biomed-layer-atlas");
    await expect(page.getByTestId("biomed-layer-atlas")).toBeVisible();
    await expect(page.getByRole("link", { name: /BioMed Layer Atlas/i })).toHaveAttribute("href", "/hub");
    await expect(page.getByText("Sign in to inspect the full layer atlas")).toBeVisible();
    await expect(page.getByTestId("biomed-ops-arcgis")).toHaveAttribute("basemap", "gray-vector");
    await expect(page.locator('arcgis-home[slot="top-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-zoom[slot="top-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-search[slot="top-right"]')).toHaveCount(1);
    await expect(page.locator('arcgis-scale-bar[slot="bottom-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-expand[slot="bottom-right"] arcgis-basemap-gallery')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Hospitals & Patient Care" })).toContainText("1/1");
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Hospital Locations" })).toContainText(
      "Hospital location layer for patient-care reach and network context.",
    );
    await expect(page.getByRole("button", { name: "Reference & Supplemental" })).toContainText("1/1");
    await expect(page.getByRole("button", { name: "Supplemental BioMed source layer" })).toContainText(
      "Additional private BioMed source layer loaded with the Workbench layer stack.",
    );
    await expect(page.getByTestId("ops-layer-legend-marker")).toHaveCount(19);
    await expect(page.getByText("Source layers", { exact: true })).toBeVisible();
    await expect(page.getByText("Layer groups", { exact: true })).toBeVisible();
  });

  test("/ops is the short V2 workbench route", async ({ page }) => {
    await page.goto("/ops");
    await expect(page.getByTestId("biomed-ops-workbench")).toBeVisible();
    await expect(page).toHaveURL(/\/ops$/);
  });

  test("/hospital-network renders the hospital portfolio map shell", async ({ page }) => {
    await page.goto("/hospital-network");
    await expect(page.getByTestId("map-shell")).toBeVisible();
    await expect(page.getByTestId("map-gate")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Hospital Network" })).toBeVisible();
  });

  // Retired routes fall through to the home redirect.
  for (const path of ["/map-v3", "/map-tool", "/layers", "/maps-menu"]) {
    test(`${path} redirects home`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});
