---
phase: 06-website-remaining-pages
plan: 05
subsystem: website
tags: [docs, sidebar, toc, i18n, ssg]
dependency_graph:
  requires: []
  provides: [docs-skeleton, docs-sidebar, docs-toc]
  affects: [website-navigation]
tech_stack:
  added: []
  patterns: [react-aria-listbox-navigation, intersection-observer-toc, bottom-sheet-mobile-nav]
key_files:
  created:
    - apps/website/src/routes/_website/docs/index.tsx
    - apps/website/src/routes/_website/docs/$sectionSlug.tsx
    - apps/website/src/components/docs/DocsSidebar.tsx
    - apps/website/src/components/docs/DocsContent.tsx
    - apps/website/src/components/docs/TableOfContents.tsx
  modified:
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json
decisions:
  - DocsSidebar uses ListBox selectionMode="single" with onSelectionChange for navigation
  - DocsContent uses defaultValue fallback for placeholder body text to avoid needing every body key in i18n
  - TableOfContents uses IntersectionObserver with -80px top margin to account for sticky header
metrics:
  duration: 3min
  completed: 2026-04-01
---

# Phase 06 Plan 05: Docs Skeleton Page Summary

Docs 3-column layout with React Aria ListBox sidebar navigation, prose content area, and IntersectionObserver-based table of contents on wide screens.

## What Was Built

### DocsSidebar (apps/website/src/components/docs/DocsSidebar.tsx)
- React Aria `ListBox` with `ListBoxSection` groupings for 3 doc sections
- 9 navigation items across Getting Started, Using the Portal, For Suppliers
- 256px width, sticky top-20, surface background, rounded-xl
- Active item: primary color text, bold weight, 2px inline-start blue border
- Navigation via `onSelectionChange` + TanStack Router `useNavigate`
- Exports `DOCS_SECTIONS`, `DEFAULT_SLUG`, `getAllSlugs` for route consumption

### DocsContent (apps/website/src/components/docs/DocsContent.tsx)
- Prose content area matching legal page typography
- 9 section definitions with h2 headings and placeholder body text
- Exports `getDocHeadings()` for TableOfContents consumption
- Not-found state with translated message

### TableOfContents (apps/website/src/components/docs/TableOfContents.tsx)
- Right sidebar, 200px wide, only visible on 2xl+ screens (>1440px)
- IntersectionObserver tracks active heading with -80px root margin
- Active heading highlighted in primary color
- h3 items indented with padding-inline-start

### Routes
- `docs/index.tsx`: SSG page, defaults to "What is HyperQuote?" content
- `docs/$sectionSlug.tsx`: Dynamic SSG route, validates slug against known list, redirects invalid slugs
- Both routes: mobile menu button triggers React Aria Modal bottom sheet with sidebar content

### i18n
- 12 sidebar label keys added to both EN and AR
- 9 content section title + heading keys in both locales
- TOC label key in both locales

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- DocsContent body text uses defaultValue fallback strings ("This section will be populated with detailed documentation...") -- placeholder content by design, to be replaced when actual docs are written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cc09803 | Docs skeleton with sidebar ListBox, prose content, IntersectionObserver TOC |

## Self-Check: PASSED
