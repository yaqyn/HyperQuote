---
phase: 08-portal-ai-chat
plan: 02
subsystem: ai-chat-ui
tags: [chat-ui, rtl, motion, react-aria, streaming, portal]
dependency_graph:
  requires: [08-01]
  provides: [chat-messages, chat-bubbles, typing-indicator, quick-action-chips, scroll-to-bottom]
  affects: [SpatialCanvas, AIChatInput, portal-route]
tech_stack:
  added: []
  patterns: [RTL-aware bubble rounding, CSS keyframe typing dots, Geist Mono number wrapping, Arabic-Indic numeral conversion, rate limiting]
key_files:
  created:
    - apps/portal/src/components/chat/ChatBubble.tsx
    - apps/portal/src/components/chat/ChatMessages.tsx
    - apps/portal/src/components/chat/TypingIndicator.tsx
    - apps/portal/src/components/chat/ScrollToBottom.tsx
    - apps/portal/src/components/chat/QuickActionChips.tsx
  modified:
    - apps/portal/src/components/canvas/AIChatInput.tsx
    - apps/portal/src/components/canvas/SpatialCanvas.tsx
    - apps/portal/src/routes/_portal/index.tsx
decisions:
  - SpatialCanvas uses greeting prop to conditionally show greeting vs ChatMessages
  - Rate limit uses in-memory timestamp array (no server round-trip needed)
  - TypingIndicator uses CSS keyframes (not Motion) per UI-SPEC mandate
  - Mic button feature-detects SpeechRecognition API and hides if unsupported
metrics:
  duration: 4min
  completed: 2026-04-01
---

# Phase 08 Plan 02: Chat UI Core Summary

Streaming chat UI with RTL-aware message bubbles, Geist Mono numbers, typing indicator, stop button, quick action chips, and scroll-to-bottom pill.

## What Was Built

### Task 1: Chat Message Components
- **ChatBubble**: User (blue bg, white text) and AI (card bg, border) bubbles with RTL-aware corner rounding (`rounded-br-md` / `rtl:rounded-bl-md`). Numbers in AI text auto-wrapped in Geist Mono spans. Arabic-Indic numeral conversion when locale is AR. Spring entrance animation. Blinking cursor during streaming.
- **TypingIndicator**: 3-dot CSS bounce animation (600ms cycle, 200ms stagger). i18n text "HyperQuote is thinking...". 12px muted styling per UI-SPEC.
- **ScrollToBottom**: AnimatePresence pill with ChevronDown + i18n label. Tween entrance/exit at 200ms.
- **ChatMessages**: Scrollable container with auto-scroll via `scrollIntoView`, 200px threshold for scroll-to-bottom pill, empty state with heading/body, `aria-live="polite"` for screen reader announcements.

### Task 2: Input Upgrade + Quick Actions + Canvas Wiring
- **AIChatInput**: Converted from `<input>` to `<textarea>` with auto-expand (max 6 lines). Enter sends, Shift+Enter newline. Wired to `usePortalChat()` for `sendMessage`, `isLoading`, `stop`. Send button morphs to red Stop (Square icon) during streaming. Added Paperclip (file attach placeholder), Mic (voice placeholder, hidden if unsupported), History button. Rate limiting: warning at 25 msg/min, disabled at 30 with Geist Mono countdown.
- **QuickActionChips**: Horizontal scrollable row with React Aria Buttons. Contextual chip sets (home vs afterProduct) from Zustand `quickActionContext`. Tween entrance with 50ms stagger. On press sends chip text as message.
- **SpatialCanvas**: Now imports ChatMessages and QuickActionChips. Greeting shown when no messages, ChatMessages fills space when messages exist. QuickActionChips rendered below input.
- **Portal route**: Updated to pass Greeting+NavButtons as `greeting` prop, AIChatInput as children.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c99afbf | Chat message components with RTL-aware bubbles, typing indicator, scroll-to-bottom |
| 2 | 2ed92e8 | Upgrade AIChatInput to textarea, add quick action chips, wire chat to canvas |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SpatialCanvas children restructuring**
- **Found during:** Task 2
- **Issue:** Route rendered Greeting + AIChatInput + NavButtons as flat children. SpatialCanvas needed to conditionally show Greeting vs ChatMessages while keeping AIChatInput always visible.
- **Fix:** Added `greeting` prop to SpatialCanvas. Route passes Greeting+NavButtons as greeting, AIChatInput as children. Canvas shows greeting when no messages, ChatMessages when messages exist, input always at bottom.
- **Files modified:** SpatialCanvas.tsx, _portal/index.tsx

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| AIChatInput.tsx | handleFileAttach | console.info placeholder | Real R2 upload deferred per plan |
| AIChatInput.tsx | handleMic | console.info placeholder | Real voice input deferred per plan |

Both stubs are intentional per plan spec -- real implementations deferred to later phases.

## Self-Check: PASSED
