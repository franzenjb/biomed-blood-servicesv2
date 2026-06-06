# Graph Report - .  (2026-06-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 347 nodes · 412 edges · 26 communities (22 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb1a680d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 11 edges
3. `ensureRedCrossOAuth()` - 8 edges
4. `Contributing — Client Edit Workflow` - 6 edges
5. `scripts` - 5 edges
6. `checkRedCrossArcGISSignIn()` - 5 edges
7. `signInToRedCrossArcGIS()` - 5 edges
8. `summarizeMasterFeature()` - 5 edges
9. `deckPage()` - 4 edges
10. `deckPdf()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `DeckViewerPage()` --calls--> `getBonusDeck()`  [EXTRACTED]
  src/pages/DeckViewerPage.tsx → src/data/bonusDecks.ts
- `DeckViewerPage()` --calls--> `deckPage()`  [EXTRACTED]
  src/pages/DeckViewerPage.tsx → src/data/bonusDecks.ts
- `DeckViewerPage()` --calls--> `deckPdf()`  [EXTRACTED]
  src/pages/DeckViewerPage.tsx → src/data/bonusDecks.ts
- `InfographicsPage()` --calls--> `igPath()`  [EXTRACTED]
  src/pages/InfographicsPage.tsx → src/data/infographics.ts
- `SectionDeckPage()` --calls--> `getSection()`  [EXTRACTED]
  src/pages/SectionDeckPage.tsx → src/data/sections.ts

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (25): Dial(), MK, MOTIFS, parseNum(), Props, renderViz(), Slide(), Props (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (26): arcJurisdictionMapSource, useArcgisComponents(), CATEGORY_LABELS, CATEGORY_ORDER, Props, Props, Tab, AuthStatus (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (33): HospitalNetworkRecord, hospitalNetworkRecords, HospitalNetworkRegion, hospitalNetworkRegions, HospitalTier, hospitalTierColors, hospitalTierLabels, NetworkRecordType (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): arcgisLayerConfig, ArcgisLayerSlot, arcJurisdictionDashboardSource, ArcJurisdictionLayerCategory, ArcJurisdictionLayerSource, biomedCollectionsSource, hospitalPortfolioMapSource, MasterMapLayerSource (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (16): Kind, Note, PAGE_LABELS, SEED, anonKey, url, DashboardPage, DecksGalleryPage (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): dependencies, @arcgis/core, @arcgis/map-components, @esri/calcite-components, lucide-react, react, react-dom, react-router-dom (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (8): Props, buildFeatureInfo(), FeatureInfo, FeatureSection, LayerWithFields, pickFeatureTitle(), sectionFromGraphic(), TITLE_KEYS

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (11): ArcGISAuthState, ArcGISAuthStatus, authState, checkArcGISAuthSession(), listeners, setAuthState(), signInArcGISSession(), checkRedCrossArcGISSignIn() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (5): NODES, Props, Props, HERO_SPEED, VIDEO_VERSIONS

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.40
Nodes (6): BonusDeck, bonusDecks, deckPage(), deckPdf(), getBonusDeck(), DeckViewerPage()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): Contributing — Client Edit Workflow, Golden rules, Per-batch cookbook, Safety nets, Standing tooling, When something goes wrong

### Community 13 - "Community 13"
Cohesion: 0.53
Nodes (4): igPath(), Infographic, infographics, InfographicsPage()

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (4): Checklist, Linked issue, Screenshots / preview, Summary

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (4): Acceptance criteria, Notes / context, What did the client ask for?, Where on the site?

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (3): Region, sections, Stat

### Community 18 - "Community 18"
Cohesion: 0.50
Nodes (3): env, jobs, key

## Knowledge Gaps
- **172 isolated node(s):** `allow`, `name`, `version`, `private`, `type` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ensureRedCrossOAuth()` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `checkRedCrossArcGISSignIn()` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `signInToRedCrossArcGIS()` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `allow`, `name`, `version` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0549645390070922 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._