# Contributing — Client Edit Workflow

This repo deploys to **biomed-blood-servicesv2.vercel.app** (future `biomed.jbf.com`).
All client-requested changes follow the same safe loop. Don't shortcut it.

## Golden rules

1. **Never edit `main` directly.** One topic = one branch.
2. **Branch name = scope:**
   - `client/<short-name>` — anything the client asked for
   - `feat/<topic>` — new internal feature
   - `fix/<topic>` — bug fix
   - `chore/<topic>` — tooling, deps, infra
3. **Tests must pass** (`npx playwright test` → 17/17) before any push.
4. **Client reviews the preview URL**, never prod.
5. **Tag every prod release** (`v1.0.1` patch, `v1.1.0` feature batch).
6. **Don't delete a feature branch** until the PR is merged + tagged.

## Per-batch cookbook

```bash
# 1. Start from clean main
git checkout main && git pull

# 2. One topic per branch
git checkout -b client/<short-name>

# 3. Edit + verify
npx playwright test          # must stay 17/17

# 4. Commit small, push
git add -A
git commit -m "Brief description of the client ask"
git push -u origin client/<short-name>

# 5. Preview URL
#   - Vercel-connected to GitHub:  preview URL appears on the PR.
#   - Bridge mode:  npx vercel deploy   (no --prod = preview only)

# 6. Client approves → merge to main
git checkout main
git merge --no-ff client/<short-name>
git tag v1.0.<n> -m "Client-approved: <short-name>"
git push origin main --tags
#   - Vercel-connected: prod auto-deploys.
#   - Bridge: npx vercel deploy --prod
```

## Safety nets

- **1-click rollback:** Vercel dashboard → Deployments → any prior deploy → "Promote to Production."
- **Hard rollback:** `git revert <bad-commit> && git push`.
- **Branch cap:** 3–5 active feature branches max. More = lost context.
- **Track every ask** as a GitHub Issue (use the *Client ask* template).
- **Branch protection on `main`:** direct pushes blocked; everything goes through a PR.

## Standing tooling

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (validates types + bundles) |
| `npx playwright test` | Full e2e suite (must pass 17/17) |
| `npx vercel deploy` | Preview deploy (no flags) |
| `npx vercel deploy --prod` | Production deploy (use only when merging to main outside of git-auto-deploy) |
| `bash ~/dev/update-projects.sh` | Refresh `~/dev/projects.json` after any repo/deploy change |

## When something goes wrong

1. Roll back via Vercel dashboard (instant, no code change).
2. Open a GitHub Issue describing the symptom + the broken commit.
3. Branch from `main`, fix, PR, merge.
