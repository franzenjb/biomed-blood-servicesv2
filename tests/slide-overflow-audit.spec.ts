import { test, expect } from "@playwright/test";
import { sections } from "../src/data/sections";

// Audit: every slide in every section deck must fit its viewport without
// internal scrolling (client requirement: charts, KPIs, text in one view).

const VIEWPORTS = [
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];

type Overflow = { cls: string; problem: string };

async function activeSlideOverflows(page: import("@playwright/test").Page): Promise<Overflow[]> {
  return page.evaluate(() => {
    const out: { cls: string; problem: string }[] = [];
    const active = document.querySelector(".slide.is-active") ?? document.querySelector("[data-testid='deck-stage']");
    if (!active) return out;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const els = [active, ...active.querySelectorAll("*")] as HTMLElement[];
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.opacity === "0") continue;
      // Decorative art (aria-hidden) bleeds off-edge by design.
      if (el.closest("[aria-hidden='true']")) continue;
      const cls = el.className.toString().slice(0, 80) || el.tagName;

      // Content laid out beyond the viewport = clipped or unreachable.
      if (rect.bottom > vh + 2) out.push({ cls, problem: `extends ${Math.round(rect.bottom - vh)}px below viewport` });
      if (rect.right > vw + 2) out.push({ cls, problem: `extends ${Math.round(rect.right - vw)}px past right edge` });
      if (rect.top < -2) out.push({ cls, problem: `extends ${Math.round(-rect.top)}px above viewport` });
      if (rect.left < -2) out.push({ cls, problem: `extends ${Math.round(-rect.left)}px past left edge` });

      // Scroll containers that actually need scrolling = client's complaint.
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight - el.clientHeight > 4) {
        out.push({ cls, problem: `requires ${el.scrollHeight - el.clientHeight}px of internal scrolling` });
      }
    }
    return out;
  });
}

for (const vp of VIEWPORTS) {
  for (const section of sections) {
    test(`no slide overflow — ${section.id} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/s/${section.id}`);
      await page.waitForSelector("[data-testid='deck']");

      const problems: string[] = [];
      for (let i = 0; i < section.slides.length; i++) {
        await page.waitForTimeout(600); // let entrance animations settle
        const overflows = await activeSlideOverflows(page);
        for (const o of overflows) {
          problems.push(
            `${section.id} slide ${i + 1}/${section.slides.length} (${section.slides[i].id}): .${o.cls} ${o.problem}`
          );
        }
        if (i < section.slides.length - 1) await page.keyboard.press("ArrowRight");
      }

      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
}
