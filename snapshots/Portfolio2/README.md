# Portfolio2 snapshot

Saved: July 27, 2026 — state of the site right before the hero page-turn animation was added.

## What this version includes

- Home canvas synced to Figma `Home Page` (node `4:2`) at **1440×2694.4**
- Hero (0–812) with exact-length Figma lace (`32:17053`, 332×812 + bow overflow)
- Work section: 5 HTML cards in 3 rows (Terraform, ANDA, Operation Safe Escape, NABU, Brilliant Cities)
- ANDA + Operation Safe Escape cards play `assets/videos/*.mp4` on scroll (IntersectionObserver, ≥45% visible)
- Width-scaled canvas architecture (`scripts/home-scale.js`, FRAME 1440×2694.4)

## Restore

Copy these back over the repo root:

```bash
cd /Users/allisonqiu/AllisonPortfolio
cp -R snapshots/Portfolio2/index.html snapshots/Portfolio2/about.html snapshots/Portfolio2/work.html .
cp -R snapshots/Portfolio2/styles snapshots/Portfolio2/scripts .
cp -R snapshots/Portfolio2/assets .
```

Note: `assets/_build`, `assets/_cmp`, `assets/_pb`, and raw Figma exports were
excluded from this snapshot to keep it small; they are scratch files only.
