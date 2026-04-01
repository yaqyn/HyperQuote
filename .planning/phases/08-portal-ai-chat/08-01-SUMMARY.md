---
phase: 08-portal-ai-chat
plan: 01
subsystem: ai-chat
tags: [tanstack-ai, ag-ui, zustand, streaming, i18n, portal]

requires:
  - phase: 06-website-remaining-pages
    provides: AG-UI streaming pattern with stream() adapter and mock server function
  - phase: 07-portal-auth-shell
    provides: Portal shell, stores (portal.ts), canvas layout, floating AI button

provides:
  - portalChatFn server function with AG-UI StreamChunk[] and CUSTOM events
  - usePortalChat hook wrapping @tanstack/ai-react with role-awareness
  - Zustand chat store with sessionStorage persist and role-keyed conversations
  - RichContent type system (product_card, status_card, action_button, material_list, disclaimer)
  - SlashCommand types and SLASH_COMMANDS const
  - All Phase 8 i18n keys (EN + AR) for chat, chips, slash commands, a11y, supplier

affects: [08-portal-ai-chat, 30-ai-pipeline]

tech-stack:
  added: ["@tanstack/ai@0.9.2", "@tanstack/ai-react@0.7.6"]
  patterns: ["AG-UI CUSTOM events for rich messages", "Role-keyed Zustand store with sessionStorage", "skipHydration + rehydrate pattern for SSR"]

key-files:
  created:
    - apps/portal/src/lib/chat-types.ts
    - apps/portal/src/lib/chat.ts
    - apps/portal/src/stores/chat.ts
    - apps/portal/src/hooks/usePortalChat.ts
  modified:
    - apps/portal/package.json
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json

key-decisions:
  - "CUSTOM events emitted after TEXT_MESSAGE_END to prevent layout jumps during streaming"
  - "Rich content extracted from stream chunks via ref, not Zustand, to avoid re-render storms"
  - "Chat store uses sessionStorage (not localStorage) per CONTEXT.md spec"

patterns-established:
  - "AG-UI CUSTOM events for structured rich messages in portal chat"
  - "Role-keyed conversation storage: customerMessages/supplierMessages separate arrays"
  - "skipHydration + useEffect rehydrate for Zustand persist with SSR"

requirements-completed: [PORT-03]

duration: 3min
completed: 2026-04-01
---

# Phase 8 Plan 1: Portal AI Chat Foundation Summary

**AG-UI streaming server function with CUSTOM events for rich messages, role-aware usePortalChat hook, Zustand chat store with sessionStorage persistence, and complete Phase 8 i18n keys (EN + AR)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T08:29:14Z
- **Completed:** 2026-04-01T08:32:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- portalChatFn server function emits AG-UI StreamChunk[] with TEXT streaming and CUSTOM events for product cards, status cards, action buttons, material lists
- usePortalChat hook wraps @tanstack/ai-react stream() adapter with role-awareness from portal store
- Zustand chat store persists customer/supplier conversations separately in sessionStorage with SSR-safe hydration
- Complete type system: RichContent union, ChatMessage, SlashCommand, QUICK_ACTION_CHIPS
- All 44 i18n keys for Phase 8 added in both English and Arabic

## Task Commits

1. **Task 1: Install AI deps + create types + server function** - `7aa0a42` (feat)
2. **Task 2: usePortalChat hook + Zustand chat store + i18n keys** - `c36c6e0` (feat)

## Files Created/Modified

- `apps/portal/src/lib/chat-types.ts` - RichContent union type, ChatMessage, SlashCommand, SLASH_COMMANDS, QUICK_ACTION_CHIPS
- `apps/portal/src/lib/chat.ts` - portalChatFn server function with mock AG-UI stream and CUSTOM events
- `apps/portal/src/stores/chat.ts` - Zustand chat store with sessionStorage persist, role-keyed conversations
- `apps/portal/src/hooks/usePortalChat.ts` - Portal chat hook wrapping stream() adapter with role-awareness
- `apps/portal/package.json` - Added @tanstack/ai and @tanstack/ai-react dependencies
- `packages/i18n/src/locales/en/portal.json` - 44 new chat/chip/slash/a11y/supplier keys
- `packages/i18n/src/locales/ar/portal.json` - 44 matching Arabic translations

## Decisions Made

- CUSTOM events emitted after TEXT_MESSAGE_END (not interleaved) to prevent layout jumps during streaming
- Rich content extracted from stream chunks via useRef, not Zustand state, to avoid re-render storms
- Chat store uses sessionStorage (not localStorage) per CONTEXT.md spec -- conversations are session-scoped
- Mock responses differentiated by customer vs supplier role for realistic testing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all artifacts are complete implementations (mock data is intentional for Phase 30 swap).

## Next Phase Readiness

- usePortalChat hook ready for wiring to ChatContainer (Plan 2)
- Rich message types ready for ProductCard, StatusCard, ActionButton components (Plan 2-3)
- i18n keys ready for all Phase 8 UI components
- Chat store ready for conversation history overlay

---
*Phase: 08-portal-ai-chat*
*Completed: 2026-04-01*
