---
phase: 15-internal-platform-shell
plan: "04"
subsystem: activity-feed
tags: [activity-feed, mentions, hot-potato, comments, shared-infrastructure]
dependency_graph:
  requires: [15-02]
  provides: [ActivityFeed, ActivityItem, MentionInput, useActivityFeed, activity-feed-server-fns]
  affects: [16-*, 17-*, 18-*, 19-*, 20-*, 21-*, 22-*]
tech_stack:
  added: []
  patterns: [useQuery-with-staleTime, useMutation-with-invalidation, mention-regex-parsing, keyboard-scope-integration]
key_files:
  created:
    - apps/internal/src/components/activity-feed/types.ts
    - apps/internal/src/components/activity-feed/ActivityFeed.tsx
    - apps/internal/src/components/activity-feed/ActivityItem.tsx
    - apps/internal/src/components/activity-feed/MentionInput.tsx
    - apps/internal/src/lib/server/activity-feed.ts
    - apps/internal/src/hooks/useActivityFeed.ts
  modified: []
decisions:
  - "Textarea for MentionInput instead of React Aria TextField -- need multi-line with @mention detection"
  - "CSS transitions for mention popover, not Motion -- follows React Aria popover pattern from Phase 7"
  - "Internal/External toggle uses native buttons, not React Aria RadioGroup -- simpler two-state toggle"
metrics:
  duration: 3min
  completed: "2026-04-05T16:45:56Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 0
requirements:
  - INT-08
---

# Phase 15 Plan 04: Activity Feed Infrastructure Summary

Reusable activity feed with internal/external comments, @mention autocomplete, system events, and Hot Potato escalation countdown -- ready for any entity in Phases 16-22.

## What Was Built

### Task 1: Activity feed types and server functions (389a614)

Created the type system and server layer for activity feed operations:

- **types.ts**: `ActivityEntry` (5 entry types), `MentionTarget`, `HandoffStatus`, `ActivityFeedProps`
- **activity-feed.ts**: 5 server functions with Zod `.inputValidator()`:
  - `getActivityEntries` -- fetches entries for entity, mock returns 5 mixed types
  - `postComment` -- posts comment with @mention parsing via `/@\[([^\]]+)\]\(([^)]+)\)/g`
  - `searchMentionTargets` -- user search for autocomplete, scoped to tenant
  - `getHandoffStatus` -- Hot Potato status check
  - `acknowledgeHandoff` -- handoff acknowledgment

### Task 2: Components and hook (7fb378c)

Built 4 files providing the complete activity feed UI:

- **useActivityFeed.ts**: useQuery (30s staleTime) + useMutation with cache invalidation
- **ActivityItem.tsx**: Entry rendering by type -- blue border (internal), gray border (external), italic (system), orange border (handoff). @mention badges parsed and rendered inline. Geist Mono timestamps with relative time.
- **MentionInput.tsx**: Textarea with @mention detection, debounced search (200ms), keyboard navigation (arrows/enter/escape), internal/external toggle, Ctrl+Enter submit, keyboard scope integration.
- **ActivityFeed.tsx**: Scrollable container (max 400px), auto-scroll to bottom, Hot Potato banner with countdown (30min window), loading skeletons, empty state. Mounts as `<ActivityFeed entityType="order" entityId={id} auth={auth} />`.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all server functions return mock data (by design for Phase 15 shell), and all UI components render correctly from that mock data. Real Supabase queries will be wired in Phases 16-22 when each entity module is built.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 389a614 | feat(15-04): create activity feed types and server functions |
| 2 | 7fb378c | feat(15-04): build ActivityFeed, ActivityItem, MentionInput components and useActivityFeed hook |

## Self-Check: PASSED
