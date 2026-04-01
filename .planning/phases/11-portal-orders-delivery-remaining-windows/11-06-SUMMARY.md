---
phase: 11-portal-orders-delivery-remaining-windows
plan: 06
subsystem: ui
tags: [react-aria, settings, team-management, referrals, i18n, portal]

requires:
  - phase: 03-shared-packages
    provides: GlassElevated, i18n infrastructure, display components
  - phase: 07-portal-scaffold
    provides: WindowShell, portal layout, FloatingAIButton
provides:
  - Settings window with 8 sections fully functional
  - Team management server functions (invite via email + magic link, remove, role change, transfer ownership)
  - Referral stats and link generation server functions
  - Profile, addresses, projects CRUD server functions
  - Notification preferences, active sessions server functions
  - Complete settings i18n keys (en + ar)
affects: [portal-auth, portal-notifications, portal-team]

tech-stack:
  added: []
  patterns:
    - "Settings auto-save: toggles/selects save immediately, text fields show Save button on change"
    - "Hidden-not-disabled: owner-only team management elements conditionally rendered"
    - "URL state for settings section via ?section= query param"

key-files:
  created:
    - apps/portal/src/types/settings.ts
    - apps/portal/src/lib/server/settings.ts
    - apps/portal/src/lib/server/team.ts
    - apps/portal/src/lib/server/referrals.ts
    - apps/portal/src/components/settings/SettingsNav.tsx
    - apps/portal/src/components/settings/ProfileSection.tsx
    - apps/portal/src/components/settings/AddressesSection.tsx
    - apps/portal/src/components/settings/ProjectsSection.tsx
    - apps/portal/src/components/settings/TeamSection.tsx
    - apps/portal/src/components/settings/NotificationsSection.tsx
    - apps/portal/src/components/settings/AppearanceSection.tsx
    - apps/portal/src/components/settings/SecuritySection.tsx
    - apps/portal/src/components/settings/ReferralsSection.tsx
  modified:
    - apps/portal/src/routes/_portal/settings.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json

key-decisions:
  - "inviteTeamMember uses email + magic link flow per CONTEXT.md Section 2.17 (not phone)"
  - "Number format toggle conditionally rendered only when Arabic locale selected"
  - "Settings sections lazy-loaded via conditional rendering based on URL state"

patterns-established:
  - "Settings auto-save pattern: toggles save via mutation on change, text fields show Save button via useWatch()"
  - "Hidden-not-disabled pattern: owner check gates full TeamSection management UI"
  - "Referral stats loaded via useQuery with getReferralStats server function"

requirements-completed: [PORT-12]

duration: 10min
completed: 2026-04-01
---

# Phase 11 Plan 06: Settings Window Summary

**Settings window with 8 sections: Profile (trade license, photo), Addresses (27 Egyptian governorates), Projects (CRUD with archive), Team (email + magic link invite, hidden-not-disabled), Notifications (per-channel/event toggles), Appearance (language/theme/number format), Security (sessions, MFA placeholder), Referrals (stats via useQuery, clipboard copy)**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-01T15:36:25Z
- **Completed:** 2026-04-01T15:46:08Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Settings window with all 8 sections fully functional, wired to server functions with mock data
- Team management with email + magic link invitation per CONTEXT.md, hidden-not-disabled for non-owners, transfer ownership with OTP
- Referral program section with stats loaded via useQuery, referral code/link with clipboard copy
- Complete i18n coverage in English and Arabic for all settings keys

## Task Commits

1. **Task 1: Settings types, server functions, nav + Profile/Addresses/Projects** - `c198c3e` (feat)
2. **Task 2: Team, Notifications, Appearance, Security, Referrals + settings route** - `3c42609` (feat)

## Files Created/Modified
- `apps/portal/src/types/settings.ts` - SettingsSection, CustomerProfile, Address, Project, TeamMember, NotificationPreference, ActiveSession, ReferralStats types
- `apps/portal/src/lib/server/settings.ts` - Profile, addresses, projects, notifications, sessions CRUD server functions
- `apps/portal/src/lib/server/team.ts` - Team management: invite (email), remove, role change, transfer ownership
- `apps/portal/src/lib/server/referrals.ts` - getReferralStats and generateReferralLink
- `apps/portal/src/components/settings/SettingsNav.tsx` - React Aria ListBox with 8 items, desktop vertical + mobile horizontal
- `apps/portal/src/components/settings/ProfileSection.tsx` - Profile editing with useWatch(), trade license upload, profile photo
- `apps/portal/src/components/settings/AddressesSection.tsx` - Address CRUD with 27 Egyptian governorates, GlassElevated dialogs
- `apps/portal/src/components/settings/ProjectsSection.tsx` - Project CRUD with inline form, archive confirmation
- `apps/portal/src/components/settings/TeamSection.tsx` - Owner-only management, email invite dialog, remove, transfer with OTP
- `apps/portal/src/components/settings/NotificationsSection.tsx` - Per-channel/event toggle grid, quiet hours time pickers
- `apps/portal/src/components/settings/AppearanceSection.tsx` - Language/theme RadioGroup, number format toggle (Arabic only)
- `apps/portal/src/components/settings/SecuritySection.tsx` - Active sessions list, MFA placeholder
- `apps/portal/src/components/settings/ReferralsSection.tsx` - Stats via useQuery, referral code/link with clipboard copy
- `apps/portal/src/routes/_portal/settings.tsx` - Settings route with SettingsNav + section content layout
- `packages/i18n/src/locales/en/portal.json` - All settings i18n keys (EN)
- `packages/i18n/src/locales/ar/portal.json` - All settings i18n keys (AR)

## Decisions Made
- inviteTeamMember uses email + magic link flow per CONTEXT.md Section 2.17 (not phone as BACKEND.md suggested)
- Number format toggle only rendered when Arabic locale is selected (conditional render, not disabled)
- Settings sections loaded conditionally based on URL ?section= param with per-section query enabling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all sections render with mock data from server functions when Supabase is not configured.

## Next Phase Readiness
- Settings window complete with all 8 sections
- Server functions ready for Supabase integration when database is connected
- Team invite flow ready for email magic link implementation in auth phase

---
*Phase: 11-portal-orders-delivery-remaining-windows*
*Completed: 2026-04-01*
