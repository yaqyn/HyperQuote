# HyperQuote Brand Assets

All apps import from this folder. Never hardcode colors, fonts, or legal text.

## Files

| File | Purpose | Import |
|------|---------|--------|
| `tokens.css` | Design tokens (colors, spacing, shadows, type scale) | `@import "../brand/tokens.css"` |
| `fonts/font-face.css` | @font-face declarations for all 3 font families | `@import "../brand/fonts/font-face.css"` |
| `UI-VISION.md` | Design philosophy — spatial glass, three colors, motion | Read every session |
| `STACK-DECISION.md` | Packages, versions, vite config, known bugs | Read before any import/config |

## Brand Assets

| Asset | Path |
|-------|------|
| Lion mark (light bg) | `logos/LyonBlack.svg` |
| Lion mark (dark bg) | `logos/LyonWhite.svg` |
| Inter (Latin, 9 weights) | `fonts/inter/*.woff2` |
| IBM Plex Sans Arabic (7 weights) | `fonts/ibm-plex-sans-arabic/*.woff2` |
| Geist Mono (4 weights) | `fonts/geist-mono/*.woff2` |

## Legal (Draft)

All in `legal/` — Arabic + English pairs. Draft status, needs legal review before launch.

| Document | Files |
|----------|-------|
| Privacy Policy | `privacy-policy-en.md`, `privacy-policy-ar.md` |
| Terms (Public) | `terms-of-use-public-en.md`, `terms-of-use-public-ar.md` |
| Terms (Internal) | `terms-of-use-internal-en.md`, `terms-of-use-internal-ar.md` |
| WhatsApp Consent | `whatsapp-consent.md` |
| ETA Disclosure | `eta-disclosure.md` |

## Rules

- Three colors only: White (#FFFFFF), Black (#0F172A/#09090B), Blue (#2563EB)
- Colors in `:root {}`, NEVER in `@theme` (Tailwind v4 collision)
- All fonts self-hosted as WOFF2, never from external CDNs
- Geist Mono for ALL numbers (prices, IDs, dates, quantities)
- Lion mark: never stretch, rotate, add shadows, or modify inline
