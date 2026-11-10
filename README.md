# atlas-secu-pages

Static GitHub Pages site for **Atlas** (`https://atlas-secu.com`).

| Field | Value |
|-------|--------|
| Product brand | Atlas (not Atlas CQ / Atlas Circuit / Atlas SECU) |
| Custom domain | `atlas-secu.com` (`CNAME`) |
| Pages source | `main` / `/` |
| Binary | `/Atlas-Setup.exe` |
| Design tokens | `/assets/atlas-tokens.css` (shared with Atlas Scanner) |

Deploy = merge / push to `main`.

## Design tokens

Canonical light-teal tokens live in [`assets/atlas-tokens.css`](assets/atlas-tokens.css):
palette (`--bg`, `--teal`, `--ink`, …), radii (`--radius` 2px buttons, `--radius-soft` 4px surfaces), fonts (Outfit / IBM Plex Mono), shadow, ease.
Atlas Scanner (`Gabawaru/Atlas` client + atlas-v1 Scan UI) mirrors the same names so site and product feel one.
