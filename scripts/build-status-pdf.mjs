// Renders scripts/status-pdf-source.html -> public/biomed-capabilities-status.pdf
// Run: node scripts/build-status-pdf.mjs   (keep the source HTML in sync with the
// Hub "Development Notes" accordion content in src/data/hubInfo.ts)
import { chromium } from "playwright";
import { pathToFileURL } from "url";
import { resolve } from "path";
const src = resolve("scripts/status-pdf-source.html");
const out = resolve("public/biomed-capabilities-status.pdf");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });
await page.pdf({
  path: out,
  format: "Letter",
  printBackground: true,
  margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
});
await browser.close();
console.log("PDF:", out);
