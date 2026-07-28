# Snapshot: Portfolio1.0

Saved: 2026-07-27

Full-site checkpoint before trying a new direction.

## Includes
- `index.html` — home (width-scale canvas, nav + stamp hotspots, mailto)
- `work.html` — work page (NABU / Brilliant Cities cards, tabs, footer stamps)
- `about.html` — about placeholder
- `styles/main.css`
- `scripts/home-scale.js`, `scripts/mailto.js`
- `assets/` — page art, nav tabs, stamps, project cards

## Restore
From repo root:

```bash
cp snapshots/Portfolio1.0/index.html index.html
cp snapshots/Portfolio1.0/work.html work.html
cp snapshots/Portfolio1.0/about.html about.html
cp snapshots/Portfolio1.0/styles/main.css styles/main.css
cp snapshots/Portfolio1.0/scripts/home-scale.js scripts/home-scale.js
cp snapshots/Portfolio1.0/scripts/mailto.js scripts/mailto.js
cp -R snapshots/Portfolio1.0/assets/. assets/
```

Then hard-refresh the browser.
