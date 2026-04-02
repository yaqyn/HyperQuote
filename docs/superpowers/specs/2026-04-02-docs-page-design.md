# Docs Page — Design Spec

## Overview

Redesign the `/docs` section of the HyperQuote website into a two-tier documentation system: **wizard guides** (interactive multi-step walkthroughs) and **full documentation** (long-form markdown articles). A single content registry drives everything — zero duplication.

## Prototype Scope

Build the full system with one wizard ("Getting Started") and one doc article ("What is HyperQuote" under "Platform Overview"). Once design is approved, content scales by adding data files only.

---

## Routes

```
/docs                                → Landing page
/docs/guide/$guideSlug               → Wizard walkthrough
/docs/guide/$guideSlug/$stepIndex    → Deep link to specific step
/docs/$categorySlug                  → Category index (list of articles)
/docs/$categorySlug/$articleSlug     → Full article
```

---

## Content Registry (`content/registry.ts`)

Single file that defines all wizards and all doc categories. Every component reads from this. Adding content = adding data here + the content file.

```ts
export interface WizardDef {
  slug: string
  titleKey: string            // i18n key
  descriptionKey: string
  iconComponent: string       // which SVG illustration to use
  steps: string               // import path to steps module
}

export interface DocArticleDef {
  slug: string
  titleKey: string
}

export interface DocCategoryDef {
  slug: string
  titleKey: string
  articles: DocArticleDef[]
}

export const WIZARDS: WizardDef[]
export const DOC_CATEGORIES: DocCategoryDef[]
```

### Prototype Data

**Wizards:** 1 entry — "Getting Started" (8 steps: sign up, verify phone, browse market, search products, add to quote, submit quote, track order, access support)

**Doc Categories:** 1 entry — "Platform Overview" with 1 article "What is HyperQuote"

### Full Scale (later)

Wizards: Getting Started, For Customers, For Suppliers, For Drivers
Doc Categories: Platform Overview, Website & Market, Quotes & Orders, Customer Portal, Supplier Portal, Delivery & Logistics, Payments & Finance, AI & Lyon, Driver App, Support

---

## Component Architecture

### `AskLyonPill` — Shared

Small pill button with Lyon logo + "Ask Lyon" text. Props: `context: string`. On click: calls `useChatWidget.openWithMessage(context)`. Used in wizard steps, article headings, and search results.

Styling: inline-flex, text-[12px], border, rounded-full, hover opacity transition. Lyon logo is the existing LyonBlack/LyonWhite SVG at 14px.

### `DocsSearch` — Landing Page

Search input styled like support page (border-bottom, no box). Indexes:
- All wizard step titles
- All doc article titles + heading text

Powered by Fuse.js. Results dropdown grouped into "Guides" and "Documentation" sections. Each result: title, category tag, snippet. Bottom: "Ask Lyon about [query]" option.

Search index built at module scope from registry data.

### `WizardRenderer` — Generic Wizard

Props: `steps: WizardStep[]`, `guideSlug: string`

```ts
interface WizardStep {
  titleKey: string
  bodyKey: string
  illustration: 'signup' | 'browse' | 'quote' | 'track' | 'support' | string
  screenshotUrl?: string      // optional real screenshot
  tip?: string                // optional callout text key
}
```

**Layout:**
- Top: step fraction "3 / 8" in Geist Mono + progress bar (thin line, filled portion in primary blue)
- Center: illustration/screenshot area (aspect-4/3, rounded, border) + step title + body text + optional tip callout
- Bottom: Back / Next buttons. Next is primary blue filled, Back is border-only. Both with arrow icons.
- Floating: AskLyonPill in bottom-end corner with step context

**Interactions:**
- Keyboard: Left/Right arrow keys for navigation
- URL updates to `?step=N` for deep linking (search param, not route param)
- Motion: content crossfades on step change (opacity + slight y shift, 200ms tween)
- Progress bar animates width with CSS transition

**Illustrations:** Simple SVG components. For prototype, use placeholder rectangles with the step number. Real illustrations added later.

**Mobile:** Full-width, illustration above text, buttons full-width stacked.

### `ArticleRenderer` — Generic Article

Props: `markdown: string`, `categorySlug: string`, `articleSlug: string`

**Markdown parsing:** Use a lightweight parser that converts `.md` to React elements. Need to handle: h1, h2, h3, p, ul, ol, li, strong, em, code, blockquote, img, hr. No full MDX — just standard markdown.

Library: `marked` (already lightweight, 30kb) or hand-roll a simple regex parser for the subset we need. Decision: use `marked` + `DOMPurify` for safety since we control all content anyway.

**Rendering:**
- First `<p>` gets `.drop-cap` class — oversized first letter in Geist Mono, primary blue, floated start, spans ~3 lines
- Every `<h2>` gets an `AskLyonPill` appended after it with context: "Tell me about [heading] in [article title]"
- All headings get `id` attributes for TOC linking + `scroll-mt-24` for fixed header offset
- Images render with rounded corners, border, optional caption
- Blockquotes render as callout boxes with left blue border
- Code blocks render with mono font, surface background

**Drop cap CSS:**
```css
.drop-cap::first-letter {
  font-family: var(--font-mono);
  font-size: 3.5em;
  float: inline-start;
  line-height: 0.8;
  padding-inline-end: 0.15em;
  padding-block-start: 0.05em;
  color: var(--color-primary);
  font-weight: 700;
}
```

**Navigation:** Prev/Next article links at bottom, pulled from registry. Same pattern as current DocsContent.

### `DocsSidebar` — Refactored

Now reads from `DOC_CATEGORIES` registry instead of hardcoded `DOCS_SECTIONS`. Shows all categories with nested article links. Active item gets 1px indicator line. Numbered section headers (01, 02, ...).

Also shows wizard guides at the top under a "Guides" group.

### `TableOfContents` — Reused

Same component, but headings are now extracted from parsed markdown rather than hardcoded. The `ArticleRenderer` extracts h2/h3 during parse and passes to TOC.

---

## Landing Page Layout

```
┌─────────────────────────────────────────┐
│ Hero: "Documentation" + subtitle        │
│ DocsSearch bar                          │
├─────────────────────────────────────────┤
│ 01 Guides                               │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ │ GS │ │ CU │ │ SU │ │ DR │           │
│ └────┘ └────┘ └────┘ └────┘           │
├─────────────────────────────────────────┤
│ 02 Documentation                        │
│ Platform Overview    │ Website & Market  │
│  · What is HQ       │  · Browsing       │
│  · White-label       │  · Search         │
│                      │                   │
│ Quotes & Orders      │ Customer Portal   │
│  · RFQ flow          │  · Dashboard      │
│  ...                 │  ...              │
└─────────────────────────────────────────┘
```

Wizard cards: illustration, title, description, step count badge, arrow. Numbered row header "01 Guides".

Doc categories: numbered row header "02 Documentation". Grid of category blocks, each listing article titles as links.

---

## File Structure

```
apps/website/src/
  content/
    registry.ts                          ← single source of truth
    wizards/
      getting-started.ts                 ← step data (prototype)
    docs/
      en/
        platform/
          what-is-hyperquote.md          ← article content (prototype)
      ar/
        platform/
          what-is-hyperquote.md
  components/docs/
    AskLyonPill.tsx                      ← shared Ask Lyon button
    DocsSearch.tsx                        ← search with Fuse.js
    WizardRenderer.tsx                   ← generic wizard player
    ArticleRenderer.tsx                  ← markdown article renderer
    DocsSidebar.tsx                       ← refactored, reads registry
    TableOfContents.tsx                  ← reused, headings from markdown
    WizardIllustration.tsx               ← placeholder SVG per step type
  routes/_website/docs/
    index.tsx                            ← landing page
    guide/
      $guideSlug.tsx                     ← wizard route
    $categorySlug/
      index.tsx                          ← category index
      $articleSlug.tsx                   ← article route
```

---

## Styling Rules

- Three colors only (white/black/blue #2563EB)
- Numbered section headers in Geist Mono
- Opacity-based text hierarchy (35% for subtle, 45% for muted)
- 7% opacity dividers
- clamp() responsive typography for headings
- Spring enter animations, tween exits
- Logical properties (ps/pe/ms/me) for RTL
- All colors via CSS custom properties

---

## i18n

- Wizard step titles/body: i18n keys in translation files
- Article content: separate .md file per locale
- UI chrome (buttons, labels): i18n keys with defaultValue fallbacks
- "Ask Lyon" label: i18n key `docs.askLyon`

---

## Dependencies

- `marked` — markdown to HTML (new dependency, ~30kb)
- `fuse.js` — already installed
- `motion` — already installed
- All other deps already in place

---

## What Scales Without Code Changes

| To add... | You edit... |
|-----------|-------------|
| New wizard | `registry.ts` + new steps file in `content/wizards/` |
| New doc category | `registry.ts` |
| New doc article | `registry.ts` + new `.md` file per locale in `content/docs/` |
| New wizard illustration | `WizardIllustration.tsx` (add case) |

Zero component changes. Zero route changes. Zero layout changes.
