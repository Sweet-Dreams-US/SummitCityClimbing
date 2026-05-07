# Summit City Climbing Co. — Demo Site

A creative, single-page demo site for [Summit City Climbing Co.](https://www.summitcityclimbing.com) — Fort Wayne's first bouldering gym.

Built scrappy. Kept weird. Deployed to GitHub Pages.

## What's here

- `index.html` — All sections in a single document
- `styles.css` — Full design system, animations, responsive
- `script.js` — Custom cursor, interactive holds, booking flow, live status, konami easter egg
- `.nojekyll` — Tells GitHub Pages not to run Jekyll on the static files

## Tech

Pure HTML, CSS, and JavaScript. No build step. No framework. Just files. Deploys instantly.

## Booking flow

The 4-step modal is fully functional client-side and stores submissions to `localStorage` for the demo. To wire it to a real backend, point `submitBooking()` in `script.js` at your endpoint.

## Easter egg

Try the Konami code. ↑↑↓↓←→←→BA.

## Run locally

```bash
python -m http.server 8000
# then visit http://localhost:8000
```
