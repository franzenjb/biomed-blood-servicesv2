# BioMed Capabilities — Spec vs. Built

**Reconstructed:** 2026-06-08
**Spec:** `BioMed_Capabilities_Experience_Builder_Master_Specification.pdf` (44 sections, 41 pages)
**Live:** https://biomed.jbf.com · **Repo:** biomed-blood-servicesv2

This is the phase-by-phase comparison of the Master Specification (Section 36,
Implementation Sequence) against what is actually committed and live. Built
evidence is cited to file + git commit. **This file is the durable record — keep
it updated as phases close.**

## Status at a glance

| Phase | Spec | Status | Evidence |
|---|---|---|---|
| 1 | Structure & Naming | ✅ Done | commit `ed54f7d` |
| 2 | Content Relocation | ✅ Done | commit `ed54f7d`+`5a50010` |
| 3 | Volunteer & Narrative Additions | ✅ Drafted — pending M&C validation | `sections.ts` (11 volunteer blocks) |
| 4 | Data Source & Methodology Framework | ✅ Done | commit `36b5e4e` |
| 5 | BioMed Collections Enhancements | ✅ Done | commit `2714f19` (latest, Jun 8) |
| 6 | **Operations Workbench Enhancements** | 🟡 **In progress — current phase** | infra layers + rail done; GOAT bookmarks + disclaimer pending; WIP in `git stash` |
| 7 | Explore Regions Foundation | ✅ Done | commits `5a50010`/`652c11d`/`61bfa8f` |
| 8 | Fixed Site Trade Area Integration | 🟡 Partial | polygons live (`50ef508`); drill-down/infographic pending |
| 9 | Hospital Network | ⏸ Blocked — waiting Troy's dashboard concept | placeholder page, correctly not over-built |

**You are up to Phase 6**, with Phase 8 partially pulled forward (trade-area
polygons already render) and Phase 9 correctly parked pending Troy.

---

## Phase 1 — Structure & Naming ✅
Spec §6, §7. Commit `ed54f7d`.
- ✅ Homepage "Explore the Experience" → **"Inside BioMed Capabilities"** — `HomePage.tsx:128`.
- ✅ Nine-tile structure — `hubInfo.ts` `hubSectionIndex` (5 narrative chapters + 4 tools).
- ✅ Biomed Blood Map merged into **Jurisdiction Dashboard**; `/map` → redirect — `App.tsx:37`.
- ✅ Explore Regions added as Tile 9.
- ✅ No visible tenth tile for data sources; "About the Data" modal pattern instead.

## Phase 2 — Content Relocation ✅
Spec §13, §18. Commits `ed54f7d`, `5a50010`.
- ✅ Clara AI / RapidPass / Track Your Blood → **Blood Journey** (`sections.ts`).
- ✅ Sickle Cell → **Explore Regions** (`RegionsPage.tsx`).
- ✅ Moved, not duplicated; old locations updated.

## Phase 3 — Volunteer & Narrative Additions ✅ (pending external review)
Spec §8–10, §17, §34. 
- ✅ Volunteer sections in Blood 101, Blood Journey, Hospital Distribution, Collections — 11 volunteer blocks in `sections.ts`.
- ⏳ **Needs Jennifer / Marketing & Communications** to validate language (spec §34 — external dependency, not a code gap).

## Phase 4 — Data Source & Methodology Framework ✅
Spec §30–33. Commit `36b5e4e`.
- ✅ `DataSourcesModal.tsx` — accordion layout (`dsm__accordion`), app-wide.
- ✅ Subtle "About the Data" trigger that deep-links to a matching accordion section (e.g. Future Demand → methodology).
- ✅ Sections: Data Sources, Refresh Schedule, Definitions, Methodology, Known Limitations, Stewards.
- ⏳ **Needs Troy:** complete dataset inventory to finish populating (spec §32).

## Phase 5 — BioMed Collections Enhancements ✅
Spec §12–17. Commit `2714f19` (latest).
- ✅ Overview → Mobile Collections → Fixed Sites (+ Fixed Site Growth Program) → Donor Diversity & Population → Volunteers → BioMed-vs-HS boundary note.
- ✅ Division / Region / Chapter filtering referenced (filters live in Jurisdiction Dashboard + Explore Regions, not duplicated).
- ✅ Boundary disclaimer present.
- 🔶 **OPEN QUESTION (today's meeting):** Troy asked for an *interactive* territory-footprint map with Division/Region/Chapter filters. Undecided: embed a live map inside a Collections slide (Option A) **or** a button → pop-up modal + accordion (Option B), and which slide. **Build only after the call decision.**

## Phase 6 — Operations Workbench Enhancements 🟡 CURRENT PHASE
Spec §20–21. Partial across Ops Workbench commits.
- ✅ Existing layout retained (spec: do not rebuild — Jennifer liked it).
- ✅ Infrastructure layers present: Manufacturing, Mobile Staging, etc. — `arcgisLayers.ts:103–169`.
- ✅ Collapsible left rail — `BiomedOpsWorkbenchPage.tsx:2134` (`opsv2__panel--left` collapse).
- ⛔ **TODO — GOAT hierarchy bookmarks/nav** for Division / Region / District / Chapter (spec §20–21).
- ⛔ **TODO — boundary disclaimer** where chapter vs BioMed boundaries appear.
- ⛔ **TODO — confirm real vs prototype** infrastructure layers (Staging / Manufacturing / Kitting / IRL / Distribution); replace prototype layers with authoritative ones if needed.
- 📦 **Uncommitted WIP exists:** `git stash` → `wip-before-hub-modal-edit` (Ops Workbench rail redesign, 152 lines in `BiomedOpsWorkbenchPage.css/.tsx`). Decide: restore or drop.

## Phase 7 — Explore Regions Foundation ✅
Spec §23–25, §29. Commits `5a50010`, `652c11d`, `61bfa8f`, `65a3969`.
- ✅ Region selector, regional summary, regional map, KPIs.
- ✅ Sickle Cell moved + reframed as community impact — `RegionsPage.tsx`.
- ✅ Community-impact / donor-diversity narrative.
- ✅ Built on real layers (RC Geo 2026, BioMed Collections 22-26, FS Map Layer), synthetic mock data pulled off prod.

## Phase 8 — Fixed Site Trade Area Integration 🟡 PARTIAL
Spec §26–28. Commit `50ef508`.
- ✅ FS Map Layer confirmed and loaded — item `6af8a323a0b5468f9427baa4d6ee7481` ("FS RSMO Trade Areas") = the Red Cell fixed-site trade-area polygons — `arcgisLayers.ts:259–270`.
- ✅ Red Cell trade-area polygons render in Explore Regions on top of mobile collections — `RegionsPage.tsx:54`.
- ⛔ **TODO — fixed-site selector** (region → fixed sites → select one → zoom to trade area).
- ⛔ **TODO — selected-site infographic panel** ("Fixed Site Market Reach": population, donors, avg distance, donor reach).
- ⛔ **TODO — trade-area methodology** entry in Data Sources modal; label clearly as red-cell-only.
- ⛔ **TODO — empty-state** for regions with no fixed sites (show zero-state, don't hide).
- 🔭 Platelet trade areas = later phase; add product toggle only when both red-cell + platelet data ready (spec §28). **Needs Troy** to confirm blessed SDP layer.

## Phase 9 — Hospital Network ⏸ BLOCKED (correct)
Spec §22. 
- ✅ Kept as Tile 8, placeholder, not over-built — correct per spec.
- ⏸ **Waiting on Troy's dashboard concept** before building. Treat as distinct from Hospital Distribution (Tile 3).

---

## External dependencies (not code gaps)
- **Needs Troy:** complete dataset inventory (P4); confirm real vs prototype infra layers (P6); blessed SDP/platelet layer (P8); Hospital Network dashboard concept (P9); verify Future Demand numbers.
- **Needs Jennifer / M&C:** validate Blood 101, volunteer, diversity, Sickle Cell language (P3); confirm which Future Demand figures were the concern.

## The one open decision from today's meeting
Collections interactive territory map — **Option A (embed in a Collections slide)** vs
**Option B (button → pop-up modal + accordion)**, and which slide. Resolve, then build
into Phase 5.
