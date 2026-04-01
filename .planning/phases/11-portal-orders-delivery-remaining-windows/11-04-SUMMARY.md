---
phase: 11-portal-orders-delivery-remaining-windows
plan: 04
subsystem: portal-documents-support
tags: [portal, documents, support, tickets, whatsapp, i18n]
dependency_graph:
  requires: []
  provides: [documents-window, support-window, ticket-management]
  affects: [portal-navigation, portal-profile-menu]
tech_stack:
  added: []
  patterns: [react-aria-table, react-aria-listbox, react-aria-select, server-fn-mock-pattern]
key_files:
  created:
    - apps/portal/src/types/document.ts
    - apps/portal/src/types/support.ts
    - apps/portal/src/lib/server/documents.ts
    - apps/portal/src/lib/server/support.ts
    - apps/portal/src/components/documents/DocumentTable.tsx
    - apps/portal/src/components/support/TicketList.tsx
    - apps/portal/src/components/support/TicketForm.tsx
    - apps/portal/src/components/support/TicketThread.tsx
  modified:
    - apps/portal/src/routes/_portal/documents.tsx
    - apps/portal/src/routes/_portal/support.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
decisions:
  - Documents and support keys use nested namespace pattern (documents.*, support.*) matching quoteDetail pattern
  - TicketThread uses alternating left/right bubble layout with primary blue for customer, surface for support
metrics:
  duration: 6min
  completed: "2026-04-01T15:42:00Z"
  tasks: 2
  files: 12
---

# Phase 11 Plan 04: Documents & Support Windows Summary

Documents window with tabbed table, search, sortable columns, and PDF download. Support window with WhatsApp-primary contact, ticket submission form, and threaded conversation view.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Documents window with tabbed table, search, download | a554402 | document.ts, documents.ts, DocumentTable.tsx, documents.tsx |
| 2 | Support window with tickets, form, thread, WhatsApp | 9e19159 | support.ts, support.ts, TicketList/Form/Thread.tsx, support.tsx, en/ar portal.json |

## What Was Built

### Documents Window
- **Types:** DocumentType union, Document interface with Geist Mono fields (reference, date, fileSize)
- **Server functions:** getDocuments (with search, sort, pagination, type filter) and downloadInvoicePDF (canonical BACKEND.md name)
- **DocumentTable:** React Aria Table with sortable Reference/Date columns, View + Download action buttons, mobile card layout
- **Route:** 5 React Aria Tabs (Invoices, Delivery Notes, Quotes, Certificates, All), SearchField with real-time filtering, skeleton loading, empty states

### Support Window
- **Types:** TicketStatus (5 states), TicketCategory (5 categories), Ticket, TicketReply interfaces
- **Server functions:** getTickets, getTicketDetail, submitSupportTicket, replySupportTicket -- all with isSupabaseConfigured mock pattern
- **3 contact method cards:** WhatsApp (primary, border-2 accent), In-app chat, Submit ticket
- **TicketList:** React Aria ListBox with category/status badges and date in Geist Mono
- **TicketForm:** React Aria Form with TextField (subject), Select (category), TextArea (description), optional related order and attachments
- **TicketThread:** Alternating bubble layout -- customer messages in primary blue, support in surface gray. Timestamps in Geist Mono 11px. Reply TextArea + Send button at bottom. Disabled for closed/resolved tickets.

### i18n
- Full EN + AR translations for all documents and support UI text
- Nested namespace pattern: documents.*, support.category.*, support.status.*

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

- **WhatsApp number:** `wa.me/201000000000` is a placeholder number in support.tsx. Will be replaced with real business WhatsApp number when configured.
- **In-app chat button:** Currently a no-op (comment indicates deferred to chat routing). The chat system already exists but navigation from support card is not wired.
- **Download URLs:** Mock documents use `#` as downloadUrl. downloadInvoicePDF returns placeholder CDN URL. R2 signed URL generation deferred to infrastructure phase.

## Self-Check: PASSED
