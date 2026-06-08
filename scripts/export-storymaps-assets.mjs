// Export-StoryMaps-assets
// =========================
// One command that produces a drop-in asset pack + paste-ready build kit for
// rebuilding the BioMed Capabilities site as an ArcGIS StoryMaps "Briefing".
//
//   node scripts/export-storymaps-assets.mjs
//
// What it does (all output under ./storymaps-export/):
//   1. Builds the app, serves the production bundle on a local port.
//   2. For each of the 5 narrative chapters (/s/:id) it drives the deck with the
//      keyboard, capturing every slide as a retina (2x) PNG and a combined
//      per-chapter PDF — and scrapes each slide's text for the build kit.
//   3. Full-page screenshots of the 4 map tools (signed-out preview state) as
//      508 fallback / orientation images.
//   4. Collates the existing decks, infographics, and covers (no regeneration).
//   5. Writes BUILD-KIT.md (paste-ready Briefing script) + MAPS.md (native AGOL
//      web-map handoff sheet) + README.md.
//
// StoryMaps has no write API: the final story is assembled by hand in the web
// builder. This pack makes that assembly mechanical (copy/paste/drag), not
// creative. Nothing here changes the live app — it only reads it.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";
import { mkdirSync, writeFileSync, readFileSync, cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = 4178;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = resolve(".");
const OUT = resolve("storymaps-export");
const VW = 1600;
const VH = 900;
const DSF = 2;
const SETTLE = 1400; // ms for count-up + entrance animations to finish

/* ---- content model -------------------------------------------------- */

const CHAPTERS = [
  { id: "blood-101", n: "01", title: "Blood 101" },
  { id: "journey", n: "02", title: "Blood Journey" },
  { id: "distribution", n: "03", title: "Hospital Distribution" },
  { id: "future-demand", n: "04", title: "Future Demand" },
  { id: "collections", n: "05", title: "BioMed Collections" },
];

const MAPS = [
  {
    route: "jurisdiction-dashboard",
    title: "Jurisdiction Dashboard",
    webMap: "8cb78614758548e3b39597b43eb0a573",
    webMapTitle: "ARC Jurisdiction Map FY25 (04.2026)",
    dashboard: "https://arc-nhq-gis.maps.arcgis.com/apps/dashboards/25b0a8b8459244dbb7220790fb735429",
    note: "Sites, geography, hospitals, operations layers. Private RC item.",
  },
  {
    route: "biomed-ops-workbench",
    title: "Ops Workbench",
    webMap: "8cb78614758548e3b39597b43eb0a573",
    webMapTitle: "ARC Jurisdiction Map FY25 (04.2026)",
    dashboard: "https://arc-nhq-gis.maps.arcgis.com/apps/dashboards/d0061c0fec8244b299bff93ec3739736",
    note: "Same FY25 jurisdiction web map; ops-focused view + hospital locations layer.",
  },
  {
    route: "hospital-network",
    title: "Hospital Network",
    webMap: "1824471e366f4cd1ac8f326a6c0a86af",
    webMapTitle: "Hospital Portfolio_WorkingCopy",
    dashboard: "",
    note: "Hospital portfolio points/tiering, footprint polygons, distribution sites. Private RC item.",
  },
  {
    route: "regions",
    title: "Explore Regions",
    webMap: "8cb78614758548e3b39597b43eb0a573",
    webMapTitle: "ARC Jurisdiction Map FY25 (04.2026)",
    dashboard: "",
    note: "Jurisdiction web map + Fixed Site Trade Areas (6af8a323...) + Hospital Locations (87e9189c...).",
  },
];

const COLLECTIONS_WEBMAP = {
  id: "fe8739d16bf148ad9244c6c4bb0ed816",
  title: "Biomed Collections 22-26",
  dashboard: "https://arc-nhq-gis.maps.arcgis.com/apps/dashboards/d0061c0fec8244b299bff93ec3739736",
};

/* ---- small utils ---------------------------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForPort(port, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((res, rej) => {
    const tryOnce = () => {
      const sock = net.connect(port, "127.0.0.1");
      sock.once("connect", () => {
        sock.destroy();
        res();
      });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) rej(new Error(`port ${port} never opened`));
        else setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
    p.on("error", rej);
  });
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Read intrinsic pixel width/height from a PNG's IHDR chunk. */
function pngSize(path) {
  const b = readFileSync(path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/* ---- chapter PDF from captured PNGs --------------------------------- */

async function buildChapterPdf(browser, pngPaths, outPath) {
  const page = await browser.newPage();
  // Page size = first slide's intrinsic size scaled back to CSS points (÷DSF),
  // so the landscape pages match the slides' true aspect (no stretching).
  const { w, h } = pngSize(pngPaths[0]);
  const pw = Math.round(w / DSF);
  const ph = Math.round(h / DSF);
  // Inline each PNG as a base64 data URI — file:// srcs do not load via setContent.
  const imgs = pngPaths
    .map((p) => `<img src="data:image/png;base64,${readFileSync(p).toString("base64")}" />`)
    .join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${pw}px ${ph}px; margin: 0; }
    html,body { margin:0; padding:0; }
    img { width:${pw}px; height:${ph}px; display:block; page-break-after:always; }
    img:last-child { page-break-after:auto; }
  </style></head><body>${imgs}</body></html>`;
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({ path: outPath, width: `${pw}px`, height: `${ph}px`, printBackground: true });
  await page.close();
}

/* ---- main ----------------------------------------------------------- */

const manifest = []; // [{ chapter, slides: [{ idx, kind, eyebrow, title, body, info, png }] }]

async function main() {
  // fresh output
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  mkdirSync(resolve(OUT, "slides"), { recursive: true });
  mkdirSync(resolve(OUT, "pdf"), { recursive: true });
  mkdirSync(resolve(OUT, "maps"), { recursive: true });
  mkdirSync(resolve(OUT, "resources"), { recursive: true });

  console.log("• building app…");
  await run("npm", ["run", "build"]);

  console.log(`• serving on ${BASE}…`);
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--host", "127.0.0.1"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  let serverDown = false;
  server.on("exit", () => (serverDown = true));

  try {
    await waitForPort(PORT);
    const browser = await chromium.launch();

    /* 1 — narrative chapters --------------------------------------- */
    const deckCtx = await browser.newContext({
      viewport: { width: VW, height: VH },
      deviceScaleFactor: DSF,
      colorScheme: "light",
    });
    const page = await deckCtx.newPage();

    for (const ch of CHAPTERS) {
      console.log(`• chapter ${ch.n} ${ch.title}`);
      const dir = resolve(OUT, "slides", ch.id);
      mkdirSync(dir, { recursive: true });
      await page.goto(`${BASE}/s/${ch.id}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".deck__dot", { timeout: 15000 });
      const count = await page.locator(".deck__dot").count();

      // Hide only the fixed-position global overlays (Notes FAB, About-the-Data
      // dock, keyboard hint). NOT the deck bar/controls — hiding those reflows the
      // stage and clips the hero. We capture the .deck__stage element, which
      // already excludes the bar and controls.
      await page.addStyleTag({
        content: `.np-fab,.dsm-trigger,.slide__hint{display:none!important}`,
      });
      await page.evaluate(() => document.fonts && document.fonts.ready);

      const stage = page.locator(".deck__stage");
      const pngPaths = [];
      const slides = [];
      for (let i = 0; i < count; i++) {
        await sleep(SETTLE);
        const png = resolve(dir, `${ch.id}-${String(i + 1).padStart(2, "0")}.png`);
        await stage.screenshot({ path: png });
        pngPaths.push(png);

        const data = await page.$eval(".deck__stage", (el) => {
          const txt = (s) => el.querySelector(s)?.innerText?.trim() || "";
          const article = el.querySelector("article.slide");
          const kind = article ? article.className.match(/slide--(\w+)/)?.[1] || "content" : "content";
          const infoEl =
            el.querySelector(".slide__info") ||
            el.querySelector(".viz--quote") ||
            el.querySelector(".slide__heroquote");
          return {
            kind,
            eyebrow: txt(".slide__eyebrow"),
            title: txt(".slide__title") || txt(".slide__kicker"),
            body: txt(".slide__body"),
            info: infoEl ? infoEl.innerText.trim() : "",
          };
        });
        slides.push({ idx: i + 1, png: `slides/${ch.id}/${ch.id}-${String(i + 1).padStart(2, "0")}.png`, ...data });

        if (i < count - 1) await page.keyboard.press("ArrowRight");
      }

      const pdfPath = resolve(OUT, "pdf", `${ch.n}-${ch.id}.pdf`);
      await buildChapterPdf(browser, pngPaths, pdfPath);
      manifest.push({ chapter: ch, slides });
      console.log(`  ↳ ${count} slides + pdf`);
    }
    await deckCtx.close();

    /* 2 — map fallback screenshots --------------------------------- */
    const mapCtx = await browser.newContext({
      viewport: { width: 1440, height: 980 },
      deviceScaleFactor: 1,
      colorScheme: "light",
    });
    const mp = await mapCtx.newPage();
    for (const m of MAPS) {
      console.log(`• map ${m.title}`);
      try {
        await mp.goto(`${BASE}/${m.route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(9000); // let ArcGIS / preview render
        await mp.screenshot({ path: resolve(OUT, "maps", `${m.route}.png`), fullPage: true });
        console.log("  ↳ captured");
      } catch (e) {
        console.log(`  ↳ skipped (${e.message})`);
      }
    }
    await mapCtx.close();
    await browser.close();

    /* 3 — collate existing assets ---------------------------------- */
    console.log("• collating decks / infographics / covers");
    const copyDir = (src, dst) => {
      if (existsSync(resolve(ROOT, src))) cpSync(resolve(ROOT, src), resolve(OUT, "resources", dst), { recursive: true });
    };
    copyDir("public/decks", "decks");
    copyDir("public/infographics", "infographics");
    copyDir("public/covers", "covers");

    /* 4 — write docs ----------------------------------------------- */
    writeFileSync(resolve(OUT, "BUILD-KIT.md"), buildKitMd());
    writeFileSync(resolve(OUT, "MAPS.md"), mapsMd());
    writeFileSync(resolve(OUT, "README.md"), readmeMd());

    console.log(`\n✓ done → ${OUT}`);
  } finally {
    if (!serverDown) server.kill("SIGTERM");
  }
}

/* ---- doc generators ------------------------------------------------- */

function buildKitMd() {
  const lines = [];
  lines.push("# BioMed Capabilities → ArcGIS StoryMaps **Briefing** — Build Kit\n");
  lines.push(
    "Paste-ready assembly script. Build **one Briefing** at https://storymaps.arcgis.com " +
      "(New story → **Briefing**). Each chapter below is one Briefing **section**; drop the " +
      "listed PNG as the section media and paste the headline/body. Map sections get a **native " +
      "web map** — see `MAPS.md`.\n"
  );
  lines.push("**Branding:** cover logo = American Red Cross; accent `#ED1B2E`; footer `American Red Cross · Biomedical Services · FY24–FY25`.\n");
  lines.push("**Why static slides:** the narrative is delivered as images so RC staff can later swap any slide for native StoryMaps blocks (text below is the source copy to retype if/when they do).\n");
  lines.push("---\n");

  for (const { chapter, slides } of manifest) {
    lines.push(`## Section ${chapter.n} — ${chapter.title}\n`);
    lines.push(`Per-chapter PDF: \`pdf/${chapter.n}-${chapter.id}.pdf\` · Slides: \`slides/${chapter.id}/\`\n`);
    for (const s of slides) {
      lines.push(`### ${chapter.n}.${String(s.idx).padStart(2, "0")} — ${s.title || "(untitled)"}  _(${s.kind})_`);
      lines.push(`- **Image:** \`${s.png}\``);
      if (s.eyebrow) lines.push(`- **Eyebrow:** ${s.eyebrow.replace(/\s+/g, " ")}`);
      if (s.body) lines.push(`- **Body:** ${s.body.replace(/\s+/g, " ")}`);
      if (s.info) lines.push(`- **Data/Detail:**\n\n  > ${s.info.replace(/\n+/g, "\n  > ")}`);
      lines.push("");
    }
    lines.push("---\n");
  }

  lines.push("## Appendix — Resources (optional gallery section)\n");
  lines.push("Drop these existing assets into a closing **Resources** section (image gallery / links):\n");
  lines.push("- Slide decks (PDF + page JPGs): `resources/decks/`");
  lines.push("- Infographics (JPG): `resources/infographics/`");
  lines.push("- Section covers (PNG): `resources/covers/`\n");
  return lines.join("\n");
}

function mapsMd() {
  const L = [];
  L.push("# Map Handoff Sheet — native AGOL web maps for the Briefing\n");
  L.push(
    "The 4 interactive tools are **already RC-owned ArcGIS Online items** (org " +
      "`arc-nhq-gis.maps.arcgis.com`). In StoryMaps do **not** embed `biomed.jbf.com` — add each " +
      "as a **native Map block** (Add content → **Map** → *Add map from ArcGIS* → paste the web-map " +
      "item ID). That keeps everything Esri-native and RC-maintainable, no React/Vercel dependency.\n"
  );
  L.push("Static fallback screenshots (508 / public-sharing fallback) are in `maps/`.\n");
  L.push("| Briefing section | Add as native web map (item ID) | Web map title | Companion dashboard (Embed block) | Fallback image |");
  L.push("|---|---|---|---|---|");
  for (const m of MAPS) {
    L.push(
      `| ${m.title} | \`${m.webMap}\` | ${m.webMapTitle} | ${m.dashboard ? m.dashboard : "—"} | \`maps/${m.route}.png\` |`
    );
  }
  L.push(
    `| (Collections, if used) | \`${COLLECTIONS_WEBMAP.id}\` | ${COLLECTIONS_WEBMAP.title} | ${COLLECTIONS_WEBMAP.dashboard} | — |`
  );
  L.push("");
  L.push("### How to add a native web map in the Briefing");
  L.push("1. In the section, **Add content → Map**.");
  L.push("2. Choose **Add map** → search your org or paste the item ID above.");
  L.push("3. Set the start location/zoom; toggle the layers you want on by default.");
  L.push("4. (Optional) Below it, **Add content → Embed** the dashboard URL for the live KPIs.\n");
  L.push("### Sharing-level caveat (decide before publishing)");
  L.push(
    "- **Internal / RC-authenticated viewers:** the private web maps draw live as-is. No extra work."
  );
  L.push(
    "- **Public story (e.g. Esri UC):** anonymous viewers can't see private layers. Either (a) make " +
      "public copies of the specific layers needed, or (b) use the `maps/*.png` fallback image + a " +
      "button linking to the live tool. The fallback images are bundled so either choice works."
  );
  L.push(
    "- **508 / accessibility:** supply the underlying layer data as a plain table for any map you keep " +
      "interactive (the data-viz/federal requirement from the navigation-formats note)."
  );
  L.push("");
  L.push("### Source of truth");
  L.push("All IDs above are from `src/config/arcgisLayers.ts`. Dashboards also referenced in `src/data/dataSources.ts` and `src/pages/HomePage.tsx`.\n");
  return L.join("\n");
}

function readmeMd() {
  return [
    "# storymaps-export — BioMed Capabilities → ArcGIS StoryMaps",
    "",
    "Generated by `node scripts/export-storymaps-assets.mjs`. Drop-in asset pack + build kit for",
    "rebuilding the site as a single StoryMaps **Briefing** (5 narrative chapters + 4 native map",
    "sections). StoryMaps has no write API — final assembly is by hand in the builder, but this pack",
    "makes it copy/paste.",
    "",
    "## Contents",
    "- `BUILD-KIT.md` — paste-ready, section-by-section assembly script (headline + body + which image).",
    "- `MAPS.md` — the 4 maps → their RC-owned AGOL web-map item IDs + how to add them natively.",
    "- `slides/<chapter>/` — retina PNG of every narrative slide (drop straight into a section).",
    "- `pdf/` — one combined PDF per chapter.",
    "- `maps/` — full-page fallback screenshot of each map tool (508 / public-sharing fallback).",
    "- `resources/` — existing decks, infographics, covers (for an optional closing gallery).",
    "",
    "## How to build the story (≈ click/paste, no authoring)",
    "1. storymaps.arcgis.com → **New story → Briefing**. Set cover (logo, title, `#ED1B2E`).",
    "2. For each chapter in `BUILD-KIT.md`: add a section, drop its slide PNGs, paste headline/body.",
    "3. For each map in `MAPS.md`: add a section with a **native Map** block (paste the item ID).",
    "4. Add the optional **Resources** gallery from `resources/`.",
    "5. Decide sharing level (see `MAPS.md` caveat) and publish.",
    "",
  ].join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
