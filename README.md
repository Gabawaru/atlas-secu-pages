# atlas-secu-pages

Static GitHub Pages site for **Atlas SECU** (`https://atlas-secu.com`).

| Field | Value |
|-------|--------|
| Product brand | Atlas SECU |
| Custom domain | `atlas-secu.com` (`CNAME`) |
| Pages source | `main` / `/` |
| Binary | `/Atlas-Setup.exe` |
| Design tokens | `/assets/atlas-tokens.css` (shared with Atlas Scanner) |
| Hero mark | Three.js interactive Earth + static cyber-pro (`/assets/atlas-hero-mark.js`) |

Deploy = merge / push to `main`.

## Hero mark (ATLAS)

Landing brand wordmark is **ATLAS**. The hero visual is a static kneeling cyber-pro figure holding a textured Earth globe. The globe auto-rotates; drag (mouse/touch) spins it any direction while the character stays fixed. Network nodes/arcs sit on the globe surface. Loads Three.js from jsDelivr via import map; Earth map is `/assets/earth-atmos.jpg`.

## Design tokens

Canonical light-teal tokens live in [`assets/atlas-tokens.css`](assets/atlas-tokens.css):
palette (`--bg`, `--teal`, `--ink`, …), radii (`--radius` 2px buttons, `--radius-soft` 4px surfaces), fonts (Outfit / IBM Plex Mono), shadow, ease.
Atlas Scanner (`Gabawaru/Atlas` client + atlas-v1 Scan UI) mirrors the same names so site and product feel one.
