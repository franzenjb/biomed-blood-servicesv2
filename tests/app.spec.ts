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
    // 4 tool tiles (#6-#9): dashboard, ops, hospital network, Explore Regions map
    for (const id of ["map-dashboard", "ops-workbench", "hospital-network", "explore-regions"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId("hub-card-explore-regions").locator(".hub__title")).toHaveText("Explore Regions");
    await expect(page.getByTestId("hub-card-explore-regions").locator(".hub__q")).toHaveText("Guided tour — pick a region, fly there on the live map, and step through its donor story.");
    await expect(page.getByTestId("hub-card-map-dashboard").locator(".hub__title")).toHaveText("Jurisdiction Dashboard");
    await expect(page.getByTestId("hub-card-hospital-network").locator(".hub__index")).toHaveText("08");
    await expect(page.getByTestId("hub-card-explore-regions").locator(".hub__index")).toHaveText("09");
    // stale separated/legacy map links are gone from the hub
    for (const id of ["map", "dashboard", "map-v3", "map-tool", "ops", "layers", "maps-menu", "layer-atlas", "regions"]) {
      await expect(page.getByTestId(`hub-card-${id}`)).toHaveCount(0);
    }
    await expect(page.getByTestId("hub-card-map-dashboard")).toHaveAttribute("href", "/jurisdiction-dashboard");
    await expect(page.getByTestId("hub-card-ops-workbench")).toHaveAttribute("href", "/biomed-ops-workbench");
    await expect(page.getByTestId("hub-card-hospital-network")).toHaveAttribute("href", "/hospital-network");
    await expect(page.getByTestId("hub-card-explore-regions")).toHaveAttribute("href", "/ops?tour=1");
    await expect(page.getByTestId("hub-card-map-dashboard")).toHaveAttribute("style", /dashboard-preview\.svg/);
    await expect(page.getByTestId("hub-card-explore-regions")).toHaveAttribute("style", /explore-regions-map\.png/);
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
  test("/map redirects into the merged Jurisdiction Dashboard", async ({ page }) => {
    // BioMed Blood Map merged into Jurisdiction Dashboard per spec §7/§19.
    await page.goto("/map");
    await expect(page).toHaveURL(/\/jurisdiction-dashboard$/);
  });

  test("/dashboard embeds the ArcGIS dashboard with a home back link", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard")).toBeVisible();
    await expect(page.getByTestId("dash-frame")).toHaveAttribute("src", /arcgis\.com\/apps\/dashboards/);
    await expect(page.getByTestId("dash-back")).toHaveAttribute("aria-label", "Return to hub");
    const dashBackBox = await page.getByTestId("dash-back").boundingBox();
    expect(dashBackBox).not.toBeNull();
    expect(dashBackBox!.x).toBeGreaterThan(20);
    expect(dashBackBox!.x).toBeLessThan(45);
    expect(dashBackBox!.y).toBeGreaterThan(80);
    expect(dashBackBox!.y).toBeLessThan(115);
    expect(dashBackBox!.width).toBeLessThanOrEqual(44);
    await page.getByTestId("dash-back").click();
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("jurisdiction dashboard back link points to hub", async ({ page }) => {
    // Sign-in gate overlays the canvas, so verify the home link target rather than clicking through it.
    await page.goto("/jurisdiction-dashboard");
    await expect(page.locator(".rcbar__home")).toHaveAttribute("href", "/hub");
  });

  test("/biomed-ops-workbench renders V2 layer controls and selected feature shell", async ({ page }) => {
    await page.goto("/biomed-ops-workbench");
    await expect(page.getByTestId("biomed-ops-workbench")).toBeVisible();
    await expect(page.locator(".rcbar__home")).toHaveAttribute("href", "/hub");
    await expect(page.locator(".rcbar__titles h1")).toHaveText("BioMed Ops Workbench");
    await expect(page.getByText("Quick View")).toBeVisible();
    const opsWidgetOrder = await page.getByTestId("biomed-ops-arcgis").evaluate((element) =>
      Array.from(element.children)
        .filter((child) => child.getAttribute("slot") === "top-left")
        .map((child) => child.tagName.toLowerCase()),
    );
    expect(opsWidgetOrder).toEqual(["arcgis-home", "arcgis-zoom"]);
    await expect(page.getByTestId("biomed-ops-arcgis")).toHaveAttribute("basemap", "gray-vector");
    await expect(page.getByText("Open Street Map")).toHaveCount(0);
    await expect(page.locator('arcgis-search[slot="top-right"]')).toHaveCount(1);
    await expect(page.locator('arcgis-scale-bar[slot="bottom-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-expand[slot="bottom-right"] arcgis-basemap-gallery')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Layer Controls" })).toBeVisible();
    await expect(page.getByTestId("ops-layer-legend-marker")).toHaveCount(18);
    await expect(page.getByTestId("ops-layer-legend-marker").first()).toHaveAttribute("data-kind", /.+/);
    await expect(page.locator(".opsv2__layer-group").first()).toContainText("Hospitals & Patient Care");
    await expect(page.getByRole("button", { name: "Hospitals & Patient Care" })).toContainText("0/1");
    const hospitalLayer = page.locator("button.opsv2__layer").filter({ hasText: "Hospital Locations" });
    await expect(hospitalLayer).toContainText("Hospitals receiving Red Cross blood products.");
    await expect(hospitalLayer.locator('[data-testid="ops-layer-legend-marker"]')).toHaveAttribute(
      "data-kind",
      "hospital",
    );
    await expect(page.getByText("Use for local donor access.")).toHaveCount(0);
    await expect(page.getByText("Use for distribution and patient-care readiness.")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Current" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
    await expect(page.getByText("Layer Group Subtotals")).toBeVisible();
    await expect(page.getByRole("button", { name: "Jurisdictions & Regions" })).toContainText(
      "BioMed ownership first; HS boundaries only for alignment comparison.",
    );
    await expect(page.getByRole("button", { name: "Biomed Divisions" })).toContainText("BioMed division boundaries.");
    await expect(page.getByRole("button", { name: "Biomed Divisions" })).not.toContainText(
      "Start here for the national leadership view.",
    );
    await expect(page.locator("select")).toHaveValue("default-workbench");
    await expect(page.getByText("3 active of 18 layers.")).toBeVisible();
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Fixed Sites" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Distribution Sites" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Biomed Regions" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Hospital Locations" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("tab", { name: "Search" }).click();
    await page.getByPlaceholder("Search counties, regions, sites").fill("Dallas");
    await expect(page.getByTestId("ops-search-results")).toBeVisible();
    await expect(page.locator(".opsv2__panel--left")).toHaveAttribute("data-has-query", "true");
    await expect(page.locator(".opsv2__layer-groups")).toBeHidden();
    const searchResultBottomGap = await page.evaluate(() => {
      const panel = document.querySelector(".opsv2__panel--left")?.getBoundingClientRect();
      const results = document.querySelector(".opsv2__results")?.getBoundingClientRect();
      return panel && results ? panel.bottom - results.bottom : Number.POSITIVE_INFINITY;
    });
    expect(searchResultBottomGap).toBeLessThanOrEqual(24);
    await page.getByPlaceholder("Search counties, regions, sites").fill("");
    await expect(page.locator(".opsv2__panel--left")).toHaveAttribute("data-has-query", "false");

    // Geography drill-down tab (ported from the dashboard): three cascading
    // selects, child levels disabled until the parent is chosen.
    await page.getByRole("tab", { name: "Geography" }).click();
    await expect(page.getByTestId("ops-geo-division")).toBeVisible();
    await expect(page.getByTestId("ops-geo-region")).toBeDisabled();
    await expect(page.getByTestId("ops-geo-district")).toBeDisabled();
    await page.getByRole("tab", { name: "Filter" }).click();

    await page.getByRole("button", { name: "Reset map" }).click();
    await expect(page.locator("select")).toHaveValue("default-workbench");
    await expect(page.getByText("3 active of 18 layers.")).toBeVisible();
    await expect(page.getByTestId("biomed-ops-arcgis")).toHaveAttribute("basemap", "gray-vector");
    await expect(page.getByText("Open Street Map")).toHaveCount(0);
    await page.getByRole("tab", { name: "Detail" }).click();
    await expect(page.getByText("No feature selected.")).toBeVisible();
    await expect(page.getByText("Available fields")).toHaveCount(0);
    await expect(page.getByText("Source fields")).toHaveCount(0);
    await expect(page.getByText("Additional details")).toHaveCount(0);
    await page.getByRole("tab", { name: "List" }).click();
    await expect(page.getByText("Active Layer Stack")).toBeVisible();
    await expect(page.getByText("Search Results")).toHaveCount(0);
  });

  test("/biomed-layer-atlas adds the supplemental layer to the workbench stack", async ({ page }) => {
    await page.goto("/biomed-layer-atlas");
    await expect(page.getByTestId("biomed-layer-atlas")).toBeVisible();
    await expect(page.locator(".rcbar__home")).toHaveAttribute("href", "/hub");
    await expect(page.locator(".rcbar__titles h1")).toHaveText("Explore Regions");
    await expect(page.getByText("Sign in to inspect Explore Regions")).toBeVisible();
    await expect(page.getByTestId("biomed-ops-arcgis")).toHaveAttribute("basemap", "gray-vector");
    await expect(page.locator('arcgis-home[slot="top-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-zoom[slot="top-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-search[slot="top-right"]')).toHaveCount(1);
    await expect(page.locator('arcgis-scale-bar[slot="bottom-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-expand[slot="bottom-right"] arcgis-basemap-gallery')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Hospitals & Patient Care" })).toContainText("0/1");
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Hospital Locations" })).toContainText(
      "Hospitals receiving Red Cross blood products.",
    );
    await expect(page.getByRole("button", { name: "Distribution & Operations" })).toContainText("1/4");
    await expect(page.locator("button.opsv2__layer").filter({ hasText: "Trade Areas by ZIP" })).toContainText(
      "ZIP donor-share shading, trade-area outline, and supporting BioMed source layer.",
    );
    await expect(page.getByRole("button", { name: "Reference & Supplemental" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Supplemental BioMed source layer" })).toHaveCount(0);
    await expect(page.getByText("World Hillshade")).toHaveCount(0);
    await expect(page.getByText("World Topo")).toHaveCount(0);
    await expect(page.getByText("Open Street Map")).toHaveCount(0);
    await expect(page.getByTestId("ops-layer-legend-marker")).toHaveCount(19);
    await expect(page.getByText("4 active of 19 layers.")).toBeVisible();
  });

  test("/ops is the short V2 workbench route", async ({ page }) => {
    await page.goto("/ops");
    await expect(page.getByTestId("biomed-ops-workbench")).toBeVisible();
    await expect(page).toHaveURL(/\/ops$/);
  });

  test("/jurisdiction-dashboard renders KPI band, jurisdiction filters, map controls, and sign-in gate", async ({ page }) => {
    await page.goto("/jurisdiction-dashboard");
    await expect(page.getByTestId("jurisdiction-dashboard")).toBeVisible();
    await expect(page.locator(".rcbar__home")).toHaveAttribute("href", "/hub");
    await expect(page.locator(".rcbar__titles h1")).toHaveText("Jurisdiction Dashboard");
    // KPI band: 4 FY25 metrics + Fixed Sites
    await expect(page.getByTestId("jd-kpis").locator(".jd__kpi")).toHaveCount(5);
    await expect(page.getByText("FY25 Red Cell Drives")).toBeVisible();
    await expect(page.getByText("FY25 SDP Units")).toBeVisible();
    // Cascading jurisdiction filters; region/district disabled until parent picked
    await expect(page.getByTestId("jd-filter-division")).toBeVisible();
    await expect(page.getByTestId("jd-filter-region")).toBeDisabled();
    await expect(page.getByTestId("jd-filter-district")).toBeDisabled();
    // Standard ArcGIS controls
    const jdWidgetOrder = await page.getByTestId("jd-arcgis").evaluate((element) =>
      Array.from(element.children)
        .filter((child) => child.getAttribute("slot") === "top-left")
        .map((child) => child.tagName.toLowerCase()),
    );
    expect(jdWidgetOrder).toEqual(["arcgis-home", "arcgis-zoom"]);
    await expect(page.locator('arcgis-search[slot="top-right"]')).toHaveCount(1);
    await expect(page.locator('arcgis-scale-bar[slot="bottom-left"]')).toHaveCount(1);
    await expect(page.locator('arcgis-expand[slot="bottom-right"] arcgis-basemap-gallery')).toHaveCount(1);
    // Right panel + sign-in gate
    await expect(page.getByRole("tab", { name: /Sites/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to load the Jurisdiction Dashboard" })).toBeVisible({ timeout: 20_000 });
    // Collapsible sidebars (livessaved rail model) + Home in the left sidebar
    await expect(page.getByRole("button", { name: "Collapse filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Collapse sites" })).toBeVisible();
    await expect(page.locator(".jd__panel-home")).toHaveAttribute("href", "/hub");
  });

  test("/hospital-network renders the hospital portfolio map shell", async ({ page }) => {
    await page.goto("/hospital-network");
    await expect(page.getByTestId("map-shell")).toBeVisible();
    await expect(page.getByTestId("map-gate")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".map-shell__panel--left").getByRole("heading", { name: "Layers" })).toBeVisible();
    await expect(page.locator(".map-shell__panel--right").getByRole("heading", { name: "Details" })).toBeVisible();
  });

  // Retired routes fall through to the home redirect.
  for (const path of ["/map-v3", "/map-tool", "/layers", "/maps-menu"]) {
    test(`${path} redirects home`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

test.describe("Data Sources & Methodology modal", () => {
  test("global dock opens the modal with all seven accordion sections", async ({ page }) => {
    await page.goto("/s/future-demand");
    const trigger = page.getByTestId("about-the-data");
    await expect(trigger).toBeVisible();
    await trigger.click();
    const modal = page.getByRole("dialog", { name: "Data Sources and Methodology" });
    await expect(modal).toBeVisible();
    for (const name of [
      "Data Sources",
      "Reference Library",
      "Refresh Schedule",
      "Definitions",
      "Methodology",
      "Known Limitations",
      "Data Steward Contacts",
    ]) {
      await expect(modal.getByRole("button", { name, expanded: false }).or(
        modal.getByRole("button", { name, expanded: true }),
      )).toBeVisible();
    }
    // Future Demand deep-links methodology open.
    await expect(modal.getByRole("button", { name: "Methodology", expanded: true })).toBeVisible();
    // Dismiss on Escape.
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
  });

  test("dock is hidden on map tiles that carry their own help", async ({ page }) => {
    await page.goto("/jurisdiction-dashboard");
    await expect(page.getByTestId("about-the-data")).toHaveCount(0);
  });
});

test.describe("Explore Regions", () => {
  test("hub tile 09 opens the guided region tour on the ops workbench", async ({ page }) => {
    await page.goto("/hub");
    await page.getByTestId("hub-card-explore-regions").click();
    await expect(page).toHaveURL(/\/ops\?tour=1$/);
  });

  test("reuses the live jurisdiction engine, branded Explore Regions, with its own sign-in gate", async ({ page }) => {
    await page.goto("/regions");
    await expect(page.locator(".rcbar__titles h1")).toHaveText("Explore Regions");
    // Same live KPI band + region filters as the Jurisdiction Dashboard.
    await expect(page.getByTestId("jd-kpis").locator(".jd__kpi")).toHaveCount(5);
    await expect(page.getByTestId("jd-filter-division")).toBeVisible();
    // Branded sign-in gate (real private layers, not synthetic data).
    await expect(
      page.getByRole("heading", { name: "Sign in to explore regions" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".rcbar__home")).toHaveAttribute("href", "/hub");
    // No synthetic mock machinery remains.
    await expect(page.getByTestId("region-selector")).toHaveCount(0);
  });
});

test.describe("Hub dev notes", () => {
  test("About modal shows the Development Notes for Jennifer & Troy", async ({ page }) => {
    await page.goto("/hub");
    await page.getByRole("button", { name: "About this hub" }).click();
    const modal = page.getByRole("dialog", { name: "About the Blood Services Hub" });
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Development Notes — for Jennifer & Troy")).toBeVisible();
    // Status groups present.
    await expect(modal.getByText("Outstanding — Needs Troy", { exact: true })).toBeVisible();
    await expect(modal.getByText("In Progress", { exact: true })).toBeVisible();
    await expect(modal.getByText("Summary", { exact: true })).toBeVisible();
  });
});

test("Hub dev notes: PDF download link is present and points to the asset", async ({ page }) => {
  await page.goto("/hub");
  await page.getByRole("button", { name: "About this hub" }).click();
  const dl = page.getByTestId("devnotes-download");
  await expect(dl).toBeVisible();
  await expect(dl).toHaveAttribute("href", "/biomed-capabilities-status.pdf");
  await expect(dl).toHaveAttribute("download", /\.pdf$/);
});

test("BioMed Collections is restructured into the spec sequence", async ({ page }) => {
  await page.goto("/s/collections");
  await expect(page.getByTestId("deck")).toHaveAttribute("data-section", "collections");
  // 10 informational slides after the rebuild.
  await expect(page.getByTestId("deck-counter")).toContainText("/ 10");
  // Last slide is the BioMed-vs-HS boundary note.
  await page.keyboard.press("End");
  await expect(page.getByRole("heading", { name: "A note on geography" })).toBeVisible();
});
