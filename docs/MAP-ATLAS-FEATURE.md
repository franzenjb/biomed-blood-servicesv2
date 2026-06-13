# BioMed Map Atlas — "On-the-Fly Report" Feature

> Handoff doc for the BioMed V2 build session. Describes a working Python map+report
> engine that turns the HS Sponsor File into publication-grade PDF maps for any ARC
> geography, and how to offer it as a feature inside biomed.jbf.com.
>
> Written 2026-06-13. NOT yet committed by this session — the V2 session held the git
> lock (dirty working tree). Commit this file when convenient.

---

## TL;DR

There is a standalone Python tool that, given **one geography name** (division / region /
chapter / state), renders a **beautiful editorial PDF** — Red Cross cream paper, ARC-red
rules, serif headlines — with a real map (county choropleth + dots), a stat rail, and
(for real estate) charts and a numbered roster. It runs in ~10–20 seconds per geography.

Two instances exist, same visual DNA:

| Instance | Repo | Data | Output |
|---|---|---|---|
| **BioMed Atlas Suite** | `biomed-blood-servicesv2` | HS Sponsor File (232K rows, FY22–26) | 5 map "apps" |
| **Real Estate Atlas** | `reintel-strategy-realestate` | CoStar + FY26 facilities budget | map + analytics + roster |

The BioMed one is the relevant one for your V2 work.

---

## Where it lives

**Script (BioMed):**
```
/Users/jefffranzen/dev/biomed-blood-servicesv2/scripts/biomed_atlas_suite.py
```
Committed: `4f66b44` — "Add biomed mapping app suite: five map concepts from the HS Sponsor File".
Tracked, pushed to `origin/main`.

**Sample output (committed PDFs):**
```
out/atlas/biomed-collections-north-carolina-region.pdf
out/atlas/biomed-growth-north-carolina-region.pdf
out/atlas/biomed-mix-north-carolina-region.pdf
out/atlas/biomed-yield-north-carolina-region.pdf
out/atlas/biomed-opportunity-north-carolina-region.pdf
```

**Data sources it reads (NOT in the repo — local/Desktop):**
- Sponsor file: `/Users/jefffranzen/Desktop/RED CROSS/Biomed/HSSponsorFileMay2026Update.xlsx`
  (columns: Year, Sponsor Ext ID, Status, Flag, Account Name, Account Type, Address, City,
  St, Zip, Drives, RBC Product Projection, RBC Products Collected, Lat, Long)
- Geography + demographics: `/Users/jefffranzen/dev/reintel-strategy-realestate/data/raw/geojson-tool-arc-counties.geojson`
  (3,140 US counties with ARC Chapter/Region/Division/ECODE/RCODE/DCODE + 2023 population,
  households, ALICE, income, etc.)
- Cache: first run pickles the sponsor file to `/tmp/hssponsor_cache.pkl` so later runs are fast.

> Note: the geojson currently lives in the **reintel** repo. If V2 wants to be self-contained,
> copy that file into `biomed-blood-servicesv2/data/` and update the `COUNTIES` path constant
> at the top of the script. It is the same authoritative ARC geography you already use.

---

## How to run it

```bash
cd /Users/jefffranzen/dev/biomed-blood-servicesv2

# all five apps for a region
python3 scripts/biomed_atlas_suite.py --region "North Carolina Region"

# just some apps
python3 scripts/biomed_atlas_suite.py --region "Tennessee Region" --apps growth,opportunity
```

`--region` accepts any ARC **Region** name (fuzzy/partial match works). Output lands in
`out/atlas/biomed-<app>-<region-slug>.pdf`, one PDF per app.

Dependencies: `geopandas`, `matplotlib`, `pandas`, `openpyxl`, `numpy` — all already on the
machine (geopandas 1.1.1, matplotlib 3.10.5).

---

## The five "apps" (what each map answers)

All use FY2025 as the current year (the sponsor file holds FY22–FY26 YTD). Geography is
shaded at the **county** level; chapter boundaries drawn as the mid-tier line.

| App | Question it answers | Encoding | Standout NC finding |
|---|---|---|---|
| **collections** | Where is blood collected? | Counties shaded by RBC units (red ramp); navy dots = sponsors sized by drives | Guilford / Mecklenburg lead |
| **growth** | Where is collection rising or falling? | Diverging navy→red: % change FY22→FY25 | Region +51%, but **west growing / east declining**; Stokes +741% |
| **mix** | Who hosts the drives? | Dots colored by Account Type; donut = units share | Civic/Community leads drives, Education leads **units** (24%) |
| **yield** | Where do drives work hardest? | Counties shaded by RBC units **per drive** (navy ramp, 25+ drives only) | Region avg 28.9; Wilson 140.9 = a fixed site, not mobile |
| **opportunity** | Where is the untapped market? | Reversed red ramp = units per 1,000 residents; **big-pop low-coverage counties outlined** | **Wake County #1**: 1.2M people, 2.5 units/k vs 25.8 region avg |

The **opportunity** map is the most decision-ready and does not exist anywhere in the current
biomed.jbf.com dashboard set. It directly answers "where should we add drives?"

There is also a 6th angle sitting unused in the data: the `Flag` column (e.g. "Latino")
marks outreach-program drives — a "diversity / outreach coverage" map is one function away.

---

## Visual system (so V2 can match it)

Defined as constants at the top of the script — reuse these to keep the brand consistent:

```
CREAM   #FBF8F1   page background
INK     #1C1B19   primary text
ARC_RED #ED1B2E   rules, kickers, "Owned"/Humanitarian, hot end of ramps
NAVY    #1F3A5F   "Leased"/Biomedical, cold end of diverging ramp
HAIR    #D8D1C7   hairline dividers
SERIF = Baskerville  (headlines)
SANS  = Avenir Next  (body, labels)
MONO  = Menlo        (kickers, footer, asset numbers)
```

Page anatomy (`editorial_frame()`): mono kicker → serif title → sans subtitle → ARC-red rule;
70%-width map on the left; a right rail at x≈0.755 holding a colorbar + ranked "top counties"
list; footer with source line. Every helper (`map_axes`, `rail_kicker`, `rail_colorbar`,
`rail_list`, `base_map`) is small and reusable.

---

## How to offer it inside BioMed V2

Three integration levels, cheapest first:

**1. "Download Report" button (fastest).**
On any region/chapter view in the React app, add a button that triggers PDF generation for
the current geography. Because the script is CLI-driven, wrap it behind a tiny endpoint:
- Vercel serverless / a small Flask or FastAPI route runs
  `python3 scripts/biomed_atlas_suite.py --region "<selected>"` and streams back the PDF(s).
- Or pre-generate the full national binder nightly (47 regions × 5 apps) and just serve the
  static PDF that matches the user's selection. No live Python needed at request time.

**2. Static gallery / amenity page.**
A "Field Reports" or "Atlas PDFs" page that lists every region's five maps as downloadable,
brand-consistent PDFs. This is the lowest-effort "amenity" framing — it looks like a premium
feature and is just hosted files. Generate once, drop in `public/`, deploy.

**3. Interactive port (highest value, most work).**
Each of the five maps is a candidate **page/tab** in the existing React + ArcGIS shell. The
data already feeds your AGOL layers, so an interactive version is a straight port:
- Counties → existing `biomed_counties` feature layer, styled by the same metric.
- Click a county → your standard right-hand side panel (per the no-default-popup rule).
- The **opportunity** and **yield** metrics are computed fields the dashboards don't show yet —
  those are the net-new analytical value, not just a restyle.

The math for all five metrics is in the script's `app_*` functions — copy the aggregation
logic (group by FIPS, units/drives/per-capita) into the layer query/Arcade and you have the
interactive equivalent.

---

## Provenance / sibling tool

Same engine, real-estate flavor, for context on how far the format can go:
`reintel-strategy-realestate/scripts/real_estate_atlas.py` (commit `a6b8368`). That one adds
features worth stealing for V2 if you go deep: **metro zoom insets** (auto-detects dense
marker clusters and renders a locator-boxed zoom), an **offshore page** (Alaska/Hawaii/PR get
their own page when 2+ exist), **outside-the-map region labels** with leader lines when a
polygon is too crowded, and a **portfolio analytics page** (bar charts + donuts). Those map
1:1 onto biomed needs (dense metros like Atlanta/Charlotte, the Pacific island regions, etc.)
and the cluster-inset + offshore-page code is generic enough to lift over.

---

## Caveats / known gaps

- Geojson dependency lives in the reintel repo (see note above) — copy it in for self-containment.
- `Pop_2023` and similar fields arrive as comma-formatted strings in the geojson; the loader
  strips commas before `to_numeric`. Keep that if you reuse the load function.
- HS **Chapter** geography ≠ BioMed **District** boundaries (documented in `dataSources.ts`).
  These maps use HS Chapter/Region/County. If V2 needs BioMed districts, swap the geojson for
  `biomed_boundaries.json` (80 districts) and re-point the join.
- Account Type values in the file are exact strings ("Civic / Community", "Government", etc.) —
  the color map keys must match exactly; mismatches fall into "Other".
