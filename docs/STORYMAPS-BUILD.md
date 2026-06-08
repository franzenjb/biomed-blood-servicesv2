# StoryMaps Build Walkthrough — BioMed Capabilities → ArcGIS StoryMaps Briefing

Hand-held, click-by-click guide for assembling the Briefing in the ArcGIS
StoryMaps builder. Pairs with the generated pack in `storymaps-export/`:
- `storymaps-export/BUILD-KIT.md` — the per-section copy + which image (paste source)
- `storymaps-export/MAPS.md` — the 4 native web-map item IDs
- `storymaps-export/slides/<chapter>/` — the slide PNGs to upload
- `storymaps-export/maps/` — static map fallback images

> **Why this is a manual step:** ArcGIS StoryMaps has **no write API** — stories are
> only authored in the web builder. Auto-driving it from here was blocked because the
> Claude-in-Chrome extension is disabled by a managed (MDM) policy on this Mac, on all
> Chrome profiles. If IT allowlists the extension later, the build can be driven; until
> then, follow this guide. It's ~1 hour of paste/drag, no design work.

---

## 0. Open the builder
1. Go to **storymaps.arcgis.com** and sign in with your Red Cross AGOL account (SSO).
2. **New story → Briefing.** (Briefing = slide-deck feel, jump-anywhere Table of
   Contents, present-live, footers/branding — the format chosen.)

## 1. Cover
1. Click the **title** placeholder → type: `Inside Biomedical Capabilities`
   (or your preferred title).
2. Click the **subtitle** → e.g. `American Red Cross · Biomedical Services · FY24–FY25`.
3. Cover media: use `storymaps-export/resources/covers/blood-101.png` (or any cover),
   or the hero slide `storymaps-export/slides/blood-101/blood-101-01.png`.
4. **Design** (top bar) → set theme accent toward Red Cross red `#ED1B2E`; pick a
   serif heading + clean sans body to match the source deck.

## 2. Build each narrative section (repeat 5×)
Briefing is organized into **sections**; each chapter = one section, each slide = one
**Image block** (optionally with a caption). Work from `BUILD-KIT.md` top to bottom.

For **each chapter** (Blood 101, Blood Journey, Hospital Distribution, Future Demand,
BioMed Collections):
1. **Add section** (the section divider / “+ Add section” control). Name it the chapter
   title, e.g. `01 — Blood 101`. This name becomes a Table-of-Contents entry.
2. For **each slide** in that chapter (per `BUILD-KIT.md`):
   - In the section, click **+** (add block) → **Image** → **Browse / upload** →
     pick the listed PNG, e.g. `storymaps-export/slides/blood-101/blood-101-01.png`.
   - The slide image already contains the headline + body + visuals, so you usually
     need **no extra text**. (If you want selectable/searchable text or 508 text, paste
     the **Body** from `BUILD-KIT.md` into a Text block or the image **caption**.)
   - Set image display to **Large / Full width** so it reads like a slide.
3. Tip: you can multi-select and drag all of a chapter's PNGs into an **Image gallery**
   if you prefer one scrolling block per chapter instead of one block per slide.

**Static-slide rationale:** because each slide is an image, RC staff can later replace
any one slide with native StoryMaps blocks (heading + text + chart) — the source copy
to retype is right there in `BUILD-KIT.md`.

## 3. Add the 4 map sections (native, RC-owned)
Use `MAPS.md`. For **each** of Jurisdiction Dashboard, Ops Workbench, Hospital Network,
Explore Regions:
1. **Add section**, name it (e.g. `06 — Jurisdiction Dashboard`).
2. Click **+** → **Map** → **Add map** → search your org **or paste the web-map item ID**
   from `MAPS.md` (e.g. `8cb78614758548e3b39597b43eb0a573`). Do **not** embed
   biomed.jbf.com — these are native RC AGOL web maps, so RC owns/maintains them.
3. Set the start **location/zoom** and toggle default layers on.
4. *(Optional)* Below the map, **+ → Embed** the companion dashboard URL from `MAPS.md`
   for live KPIs.
5. *(Sharing fallback)* If the story will be **public**, private layers won't draw for
   anonymous viewers — instead add the `storymaps-export/maps/<route>.png` image and a
   **Button** block linking to the live tool. See the sharing caveat in `MAPS.md`.

## 4. Optional closing "Resources" section
Add a final section → **Image gallery** with the decks + infographics from
`storymaps-export/resources/` for a downloadable appendix.

## 5. Publish
1. Top-right **Publish**.
2. Choose sharing level deliberately:
   - **Organization (RC)** → native maps draw live; simplest, fully maintainable. Recommended.
   - **Everyone (public)** → use the map **fallback images** for any private-layer map
     (see step 3.5 and `MAPS.md`).
3. Copy the published link. (You can later add this story to a StoryMaps **Collection**
   if you want one wrapper over multiple stories.)

---

## If IT later allowlists the Claude-in-Chrome extension
Then this build can be driven automatically end-to-end from Claude Code (you do the AGOL
SSO sign-in; Claude clicks through steps 1–5, uploading the PNGs and pasting from
`BUILD-KIT.md`). The blocker today was: `storymaps.arcgis.com`, `arcgis.com`, and even
`example.com` returned “blocked by your organization's policy” in **both** the JBF and
Personal Chrome profiles — i.e. the extension itself is MDM-disabled on this machine,
not an ArcGIS- or profile-specific block.
