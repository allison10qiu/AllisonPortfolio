# Snapshot: home width-fit (scrollable)

Saved: 2026-07-26

## Behavior
- Fixed Figma canvas 1512×982
- Scales to **full Chrome width** (`scale = innerWidth / 1512`)
- Uniform scale (no component warp)
- Full height visible via **vertical scroll** if needed
- No side letterboxing

## Restore
From repo root:

```bash
cp snapshots/home-width-scroll/index.html index.html
cp snapshots/home-width-scroll/scripts/home-scale.js scripts/home-scale.js
cp snapshots/home-width-scroll/styles/main.css styles/main.css
cp snapshots/home-width-scroll/assets/home-page.png assets/home-page.png
```

Then hard-refresh the browser.

## Note
The live site was later switched to **fit width + height** (no scroll, `Math.min` scale).
This snapshot keeps the earlier **full-width + scroll** version.
