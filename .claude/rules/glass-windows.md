---
paths:
  - "apps/internal/**/*.tsx"
  - "apps/portal/**/*.tsx"
  - "apps/ceo/**/*.tsx"
  - "packages/ui/**"
---

# Glass Window Design Rules

These apps use spatial glass UI. NOT dashboards. See UI-VISION.md Section 3.

## Three Colors Only
White (#FFFFFF), Black (#0F172A / #09090B), Blue (#2563EB).
Semantic status colors (green/yellow/red) for DATA only, not design.
No slate-200, no zinc-500, no navy variants.

## CEO App Exception
Zero accent colors. No blue for interactive elements.
Emphasis through typography weight and contrast only.

## Window System
- Window tier: main panels (`backdrop-blur-xl bg-white/80 dark:bg-black/80`)
- Elevated tier: modals, command palette (`backdrop-blur-2xl bg-white/90 dark:bg-black/90`)
- Spring animation on enter (stiffness 200, damping 20)
- Tween animation on exit (200ms, easeIn)
- Window header: module icon (20px) + name (Inter 600 16px) + close button

## Canvas (Home State)
- Wide empty space. NO KPI cards, NO metrics, NO charts.
- Greeting: "Good morning, Ahmed" (time-aware, localized)
- Urgent item count if any
- Lion watermark at barely-perceptible opacity

## Navigation
- Internal: icon strip + single-key hotkeys (S/P/O/W/F/D/C/H/A/R/I)
- Portal: centered AI chat + two buttons (Orders, Market)
- CEO: search bar only. No navigation.
- Escape closes current window. Same hotkey toggles.
- Ctrl+K: command palette (Elevated glass)

## Unauthorized Elements
Hidden, NOT disabled. If user lacks permission, the element doesn't render.
