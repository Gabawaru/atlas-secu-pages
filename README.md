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
| CGU | [`/cgu.html`](cgu.html) (brouillon produit) |
| Confidentialité | [`/confidentialite.html`](confidentialite.html) (brouillon produit) |

Deploy = merge / push to `main`.

## Hero mark (ATLAS)

Landing brand wordmark is **ATLAS**. The hero visual is a static classical kneeling Atlas (beard, curly hair) in dark tailored armor/suit, carrying a textured Earth globe on the shoulders — engraving silhouette, not a stick figure. The globe auto-rotates; drag (mouse/touch) spins it any direction while the character stays fixed. Network nodes/arcs sit on the globe surface. Loads Three.js from jsDelivr via import map; Earth map is `/assets/earth-atmos.jpg`.

Legal pages are **draft product copy** (à valider conseil), linked from footer, register, PEC, and account delete surfaces.

## Design tokens

Canonical light-teal tokens live in [`assets/atlas-tokens.css`](assets/atlas-tokens.css):
palette (`--bg`, `--teal`, `--ink`, …), radii (`--radius` 2px buttons, `--radius-soft` 4px surfaces), fonts (Outfit / IBM Plex Mono), shadow, ease.
Atlas Scanner (`Gabawaru/Atlas` client + atlas-v1 Scan UI) mirrors the same names so site and product feel one.

## Auth / compte (ATL-642)

- **No staff allowlist and no plaintext passwords** in the public JS bundle.
- Register / login / YOOO / PEC use the Atlas API **Bearer** token when `window.ATLAS_API_BASE` is set (see [`config.runtime.js`](config.runtime.js) / [`config.runtime.example.js`](config.runtime.example.js)).
- If the API base is unset, the UI shows a clear French message that compte / prise en charge are unavailable — **no fake success**.
- Account wipe clears the Bearer locally always; remote `DELETE /v1/auth/account` is reported only on HTTP 2xx.
- Self-serve path is public (Créer un compte / Connexion). Staff product links are not gated by a marketing allowlist.

**Do not commit secrets** (passwords, JWT secrets, API keys). `ATLAS_API_BASE` is an origin URL only.
