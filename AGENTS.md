
---

# ⛔⛔ ABSOLUTE RULE — NEVER SIGN IN VIA THE IN-APP PREVIEW BROWSER ⛔⛔

The Claude in-app **preview browser** (`mcp__Claude_Preview__*`) **CANNOT** sign in,
do OAuth, or load any ArcGIS / Red Cross AGOL / `*.jbf.com` app that requires login.
It **blocks all non-localhost / external URLs** ("Preview only supports localhost URLs")
and can never complete the ArcGIS sign-in popup. On these apps it will ONLY ever show the
sign-in gate — it is physically impossible for it to show live data.

- **DO NOT** launch the preview browser to "see how it works" on any auth/OAuth/ArcGIS app.
  Jeff has said this many times and it is infuriating to repeat.
- To view a LIVE authenticated app working, use a **real Chrome browser**
  (Claude in Chrome MCP, `mcp__Claude_in_Chrome__*`) and **expect Jeff to do the sign-in himself**.
- OAuth only works on a `*.jbf.com` host (wildcard redirect `https://*.jbf.com/oauth-callback.html`);
  `localhost` and `*.vercel.app` aliases also fail sign-in regardless of browser. Test live at the
  real `*.jbf.com` URL.
- For layout/CSS-only checks, verify with `tsc`/`build`/Playwright — do NOT keep relaunching the
  preview browser on these apps.
