---
phase: quick
plan: 260402-jf8
subsystem: website-docs
tags: [docs, wizard, markdown, content-registry, search]
dependency_graph:
  requires: []
  provides: [content-registry, wizard-renderer, article-renderer, docs-search]
  affects: [website-docs-routes, website-sidebar]
tech_stack:
  added: [marked]
  patterns: [content-registry, vite-raw-import, fuse-search, scroll-spy-toc]
key_files:
  created:
    - apps/website/src/content/registry.ts
    - apps/website/src/content/wizards/getting-started.ts
    - apps/website/src/content/docs/en/platform/what-is-hyperquote.md
    - apps/website/src/content/docs/ar/platform/what-is-hyperquote.md
    - apps/website/src/components/docs/AskLyonPill.tsx
    - apps/website/src/components/docs/WizardIllustration.tsx
    - apps/website/src/components/docs/WizardRenderer.tsx
    - apps/website/src/components/docs/ArticleRenderer.tsx
    - apps/website/src/components/docs/DocsSearch.tsx
    - apps/website/src/routes/_website/docs/guide/$guideSlug.tsx
    - apps/website/src/routes/_website/docs/$categorySlug/index.tsx
    - apps/website/src/routes/_website/docs/$categorySlug/$articleSlug.tsx
  modified:
    - apps/website/src/components/docs/DocsSidebar.tsx
    - apps/website/src/routes/_website/docs/index.tsx
    - apps/website/src/styles.css
    - apps/website/package.json
  deleted:
    - apps/website/src/routes/_website/docs/$sectionSlug.tsx
decisions:
  - Content registry as single source of truth for all docs/wizards
  - Vite ?raw imports for markdown content with locale switching
  - Inline TableOfContentsRaw in article route (displays raw text, not i18n keys)
metrics:
  duration: 7min
  completed: 2026-04-02
  tasks: 3/3 auto tasks complete (1 checkpoint pending)
  files: 17
---

# Quick Task 260402-jf8: Two-Tier Documentation System Summary

Registry-driven docs system with wizard guides + markdown articles, Fuse.js search, Ask Lyon integration, and 4 routes.

## What Was Built

### Content Layer
- **registry.ts**: Single source of truth with WIZARDS, DOC_CATEGORIES, helper functions (getAllArticles, findArticle, getAdjacentArticles)
- **getting-started.ts**: 8-step wizard with i18n keys for each step
- **what-is-hyperquote.md**: Full article content in English and Arabic

### Components (6)
- **AskLyonPill**: Shared pill button that opens chat widget with contextual message
- **WizardIllustration**: Placeholder SVG per step type (signup, verify, browse, search, quote, submit, track, support)
- **WizardRenderer**: Multi-step wizard player with progress bar, step dots, AnimatePresence, keyboard nav (Left/Right arrows)
- **ArticleRenderer**: Markdown to React using marked Lexer, drop-cap first paragraph, numbered h2s with Ask Lyon pills, prev/next navigation
- **DocsSearch**: Fuse.js search over WIZARDS + DOC_CATEGORIES with Ask Lyon fallback
- **DocsSidebar**: Rewritten to read from content registry

### Routes (4)
- **/docs**: Landing page with hero, search, wizard cards (01 Guides), doc category grid (02 Documentation), mobile sidebar
- **/docs/guide/$guideSlug**: Wizard guide player
- **/docs/$categorySlug**: Category index with numbered article listing
- **/docs/$categorySlug/$articleSlug**: Article reader with sidebar, TOC scroll-spy, markdown rendering

### CSS
- Drop-cap styling for article first paragraph (font-mono, 3.5em, primary blue)

## Bugs Fixed (from plan)

1. **DocsSearch.tsx**: Removed invalid `const openWithMessage = (await import(...))...` line -- AskLyonPill handles chat integration
2. **$articleSlug.tsx**: Moved `useEffect`, `useRef` imports to top of file (were illegally inside function body), imported `ExtractedHeading` type at top level

## Deviations from Plan

None -- plan executed exactly as written with the two documented bug fixes applied.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ad6aea5 | Install marked, content registry + wizard data + articles |
| 2 | 1b7f705 | Create all 6 components |
| 3 | 3af52b9 | Create all routes + drop-cap CSS |

## Known Stubs

None -- all components are fully wired to real data from the content registry.

## Awaiting Verification

Task 4 is a human-verify checkpoint. The dev server starts clean on localhost:3002.
