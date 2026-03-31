# Phase 11: Portal Orders + Delivery + Remaining Windows

## Goal
Customers have a complete portal experience: order tracking with GPS, real-time notifications, document access, support, settings, and PWA installation.

## Dependencies
- Phase 10 (Quote Detail + Acceptance) must be complete
- Phase 9 (Material List Builder) must be complete
- Database tables for orders, deliveries, notifications, documents, tickets must exist

## Requirements

- **PORT-06**: Orders window — 4 tabs (Active, Quotes, History, Drafts), order cards with status badges, one-tap reorder from history
- **PORT-07**: Order tracking — 5-stage progress bar, GPS delivery map (MapLibre GL in ClientOnly), driver location, ETA, drop-ship POD confirmation/dispute flow
- **PORT-08**: Market window — catalog browse inside glass window, infinite scroll, quick-add mode
- **PORT-09**: Notifications window — real-time via Supabase Realtime, grouped by time, click-through navigation
- **PORT-10**: Documents window — invoices, delivery notes, quote PDFs, certificates with view/download
- **PORT-11**: Support window — WhatsApp (primary), in-app chat, ticket submission with thread
- **PORT-12**: Settings — profile, addresses, projects, team (multi-user with roles), notifications, language/theme, security
- **PORT-14**: Repeat purchase — saved lists, one-tap reorder, favorites, AI reorder suggestions
- **PORT-15**: Guest order claiming — unclaimed customer matches phone -> masked hint -> link auth user
- **PORT-16**: PWA — service worker, install prompt after 3rd visit, push notifications

## Success Criteria
1. Orders window shows 4 tabs with status badges and one-tap reorder from history
2. Order tracking displays 5-stage progress bar and GPS delivery map (MapLibre GL in ClientOnly) with driver location and ETA
3. Notifications arrive in real-time via Supabase Realtime, grouped by time, with click-through navigation
4. Guest order claiming matches phone number to existing customer record via masked hint flow
5. PWA installs after 3rd visit with push notification permission requested on first notification-worthy action

## What to Build
- Orders window with 4 tabs (Active, Quotes, History, Drafts)
- Order tracking: 5-stage progress bar + GPS map (MapLibre GL in ClientOnly)
- Market window (catalog browse inside portal)
- Notifications window (Supabase Realtime subscription)
- Documents window (invoices, delivery notes, quote PDFs)
- Support window (ticket submission + thread)
- Settings window (profile, addresses, team, notifications, security, data/privacy)
- PWA manifest + service worker
- Drop-ship POD confirmation/dispute flow
- Guest order claiming flow
- Repeat purchase features (reorder, favorites, saved lists)

## Spec References

### FRONTEND.md Section 2.4 — Orders Window (Pixel-Level Detail)

**URL:** `/orders`. Glass window opens over canvas.

**Window header:**
- Title: "Orders" — Inter 600 18px.
- Right side: "New Quote Request" button — blue bg, white text, Inter 500 14px, height 36px, px-16px, rounded-lg. Lucide `Plus` 16px inline-start.

**Tab bar (below header, border-bottom):**
- React Aria `Tabs`. 4 tabs: "Active" (default), "Quotes", "History", "Drafts".
- Each tab: Inter 500 14px. Inactive: `var(--color-text-muted)`. Active: `var(--color-text)` + 2px bottom border `var(--color-primary)`. px-16px, height 44px.
- **Tab count badges** in Geist Mono 12px: "Active (3)", "Quotes (1)", "Drafts (2)".
- **Tab content crossfade animation:** tween 150ms on switch.

**Each order/quote card:**
- Background: `var(--color-base)`. Rounded-xl. p-16px. mb-12px. Border 1px `var(--color-border)`.
- Top row: Reference number (Geist Mono 14px `var(--color-primary)`, e.g., "QR-2026-00042") + status badge (semantic color bg + text, rounded-sm, px-6px py-2px, Inter 500 11px).
  - Status badges: "Draft" (muted gray), "Submitted" (blue/info), "Quote Ready" (blue), "Negotiating" (yellow/warning), "Accepted" (green/success), "Order Confirmed" (green), "Being Prepared" (blue), "Out for Delivery" (blue), "Delivered" (green), "Expired" (red/error), "Cancelled" (red).
- Second row: Brief description — "5 items · Cement, Rebar, Plywood" — Inter 400 13px `var(--color-text-muted)`. Item count in Geist Mono.
- Third row: Date (Geist Mono 12px `var(--color-text-subtle)`) + amount (Geist Mono 14px `var(--color-text)`, e.g., "EGP 245,000").
- Right side: Lucide `ChevronRight` 16px `var(--color-text-muted)`. (Flips in RTL.)
- **Hover effect:** border color `var(--color-primary)` at 30% opacity, `translateY(-1px)`. 150ms ease.

**Active tab:** orders in progress + quotes awaiting response. Sorted by most recent activity.

**Quotes tab:** all quotes with filter chips (All, Pending, Ready, Negotiating, Expired). React Aria `ToggleButton` group. Chips: height 32px, rounded-full, px-12px. Active: `var(--color-primary)` bg, white text. Inactive: `var(--color-surface)` bg, `var(--color-text-muted)`.

**History tab:** completed/cancelled with date range filter (two React Aria `DatePicker`, default last 90 days) + "Reorder" button on each completed order (blue outline, 32px).

**Drafts tab:** saved drafts. Each shows "Last edited: {date}" (Geist Mono 12px). "Continue" button (blue, 36px) and "Delete" button (Lucide `Trash2` 16px, `var(--color-error)` on hover). Delete confirmation: elevated modal.

**Loading state:** 4 skeleton cards — rectangle with 3 line placeholders each. Shimmer animation.

**Empty states (per tab, each unique):**
- Active: Lucide `Package` 48px `var(--color-text-subtle)`. "No active orders" Inter 600 16px. "Create a quote request to get started." Inter 400 14px muted. "New Quote Request" button (blue, 40px).
- Quotes: "No quotes yet." + "New Quote Request" button.
- History: "No order history." + "Your completed orders will appear here." text only (no CTA).
- Drafts: "No drafts." + "Start building a material list." button.

**Error state:** Inline error card — Lucide `AlertTriangle` + "Failed to load orders" + "Retry" button.

### FRONTEND.md Section 2.5 — Market Window

Functionally identical to website Market page (1.4) but inside glass window. Key differences:
- Window header: "Market" title + search field (inline, 240px width on desktop, full width on mobile).
- No login modal for "Add to Quote" (already authenticated). Adds directly to active draft. Toast: "{Product} added to your quote."
- **"Quick Add" mode toggle** in toolbar. When active, clicking any product shows a compact quantity popover immediately (no navigation to detail). For power users.
- **Infinite scroll** via TanStack Query `useInfiniteQuery` with **`maxPages: 5`**. Scroll sentinel at bottom triggers next page. Loading: 2 skeleton cards appended.
- **Filter sidebar breakpoint:** same behavior but constrained within window width. **On narrow windows (<1024px), becomes a filter button with bottom sheet.**
- Product detail opens as sub-view within Market window (URL: `/market/{product-slug}`). Back button in header.

### FRONTEND.md Section 2.7b — Order Tracking View

5-stage progress bar: "Confirmed" -> "Being Prepared" -> "Out for Delivery" -> "Delivered" -> "Invoice Generated".
- GPS map (MapLibre GL in ClientOnly): driver blue dot + route line + ETA (Geist Mono).
- Payment instructions: bank details card with copyable IBAN.

### FRONTEND.md Section 2.8 — Notifications Window

Glass window, max-width 480px, max-height 70vh. Notification list (React Aria ListBox), newest first.
- Each notification: min height 64px, px-16px py-12px, border-bottom 1px `var(--color-border)`.
- Unread: 8px blue dot at inline-start + `var(--color-surface)` bg. Read: transparent bg.
- Icon by type: Quote ready = Lucide `FileCheck` (blue), Order update = `Truck` (blue), Delivery = `MapPin` (green), Payment = `CreditCard` (blue), Support = `MessageCircle` (blue). Size: 20px.
- Title: Inter 500 14px. Body: Inter 400 13px muted. Time: Geist Mono 11px `var(--color-text-subtle)` (relative: "2 min ago", "1 hour ago", absolute after 7 days).
- Click: marks read + navigates to relevant content. Window closes.
- "Show older" link at bottom (if > 20 notifications): Inter 400 12px `var(--color-primary)`. Loads next 20.
- Real-time via Supabase Realtime on `notifications` table filtered by user. New notifications spring in at top.

### FRONTEND.md Section 2.9 — Documents, Support, Settings

**Documents:** Tab bar (Invoices, Delivery Notes, Quotes PDF, Certificates, All). Table with sortable columns, date/search filters, View + Download actions.

**Support:** Active tickets list + "Contact Support" (WhatsApp primary, in-app chat, ticket form with category/description/related order/attachments).

**Settings:** Sections (vertical menu inline-start, content inline-end):

- **Profile:** Company name (editable), Contact name (editable), Phone (read-only, change requires support, Geist Mono), Email (editable if Stage 2 complete), **Trade license upload** with status badges ("Not uploaded", "Under Review", "Verified"), **Profile photo** 64px circle with crop interface (elevated modal, JPG/PNG max 2MB).
- **Addresses:** Saved delivery addresses list with Edit/Delete/Set as Default. "Add New Address" button.
- **Projects:** List of projects (name, order count, date created). **Create/Edit/Archive** project. Inline form: name (required) + description (optional).
- **Team:** Multi-user management (see Section 2.17 below).
- **Notifications:** Per-channel toggles (WhatsApp, Email, Push, SMS). Per-event toggles (Quote ready, Order status, Delivery update, Invoice generated, Payment confirmation, Support response). "Quiet hours" from/to pickers.
- **Language & Appearance:** Language RadioGroup (Arabic/English, changes immediately). Theme RadioGroup (Light/Dark/System). **Number format toggle: "Arabic-Indic (١٢٣)" / "Western (123)"** (only shown when Arabic selected). **Date format: "Gregorian" / "Hijri" option.**
- **Security:** Active sessions list (device, last active Geist Mono, location, "Sign out" per session). MFA toggle with TOTP QR code setup.

**"Save Changes" behavior:** Changes save **immediately on blur/change for toggles and selects**. **Text fields show a "Save" button** that appears when content changes. **Unsaved changes warning** if navigating away (React Router `beforeLoad` prompt).

### FRONTEND.md Section 2.15 — Repeat Purchase Features

Integrated across the portal, not a separate window.

- **Saved Lists** in Drafts tab (sub-section). Each: list name, item count (Geist Mono), last used date (Geist Mono). "Reorder" button (blue outline, 36px). "Edit" link.
- **One-tap Reorder** on history cards: pre-fills Material List Builder (Step 1) with all items. Confirmation: "Reorder {N} items from order ORD-2026-00015?" with "Edit First" (outline) and **"Quick Submit"** (blue) options. **"Quick Submit" skips to Step 2 (delivery details) with last-used address pre-selected.**
- **Favorites:** Heart icon (Lucide `Heart` 16px, outline by default). On click: toggles favorite — **fills with `var(--color-error)` (red fill — exception to three-color rule, this is a data state)**. Saved in user profile. "Favorites" filter chip in Market window toolbar.
- **AI reorder suggestions** (in AI chat): Proactive suggestion card above chat input (not a chat message — a contextual hint). Card: **`var(--color-info-bg)` bg**, rounded-xl, p-12px. "You ordered cement 30 days ago. Time to reorder?" + "Reorder" button (blue, 32px) + dismiss "X". **Dismissed suggestions don't reappear for 7 days (cooldown). Maximum 1 suggestion visible at a time.**

### FRONTEND.md Section 2.16 — Guest Order Claiming

Flow: customer signs up -> phone matches unclaimed record -> masked hint "A**** C****" -> "Yes, that's me" links account. All previous order history immediately visible.

### FRONTEND.md Section 2.17 — Multi-User Account

**Full permissions matrix:**

| Feature | Buyer | Approver | Site Manager |
|---------|-------|----------|-------------|
| Browse market | Yes | Yes | Yes |
| Create quote requests | Yes | Yes | No |
| Accept/decline quotes | No | Yes | No |
| View orders | Yes | Yes | Yes (own projects only) |
| Track deliveries | Yes | Yes | Yes |
| View invoices | No | Yes | No |
| View documents | Own only | All | Project only |
| Manage team | No | Account owner only | No |
| AI chat | Full (within role) | Full | Read-only + status queries |

**"Hidden not disabled" rule:** Unauthorized elements are HIDDEN, not disabled (per UI-VISION.md). If a Buyer cannot accept quotes, they don't see the "Accept" button. If a Site Manager can't view invoices, the "Invoices" tab in Documents is hidden.

**Account owner:** The first user (who created the account). Has all Approver permissions + can manage team + can **transfer ownership** (Settings > Team > "Transfer Ownership" link, **requires confirmation with OTP**).

**Invitation magic link flow:**
1. Owner enters email + role in Settings > Team.
2. Email sent with magic link to `portal.hyperquote.net/join?token={uuid}`.
3. Invitee clicks link -> if no HyperQuote account: goes through signup (phone OTP + name only, company auto-assigned). If has account: confirms joining the organization.
4. New team member appears in the team list with their role.

### FRONTEND.md Section 2.18 — PWA Behavior

Manual Workbox (vite-plugin-pwa incompatible with TanStack Start). Install prompt after 3rd visit. Push notification permission requested on first notification-worthy action.

### Drop-Ship POD Flow (from BACKEND.md)

**72h auto-confirm cron:** `auto_confirm_drop_ship` runs daily at 8:00 AM (pg_cron). Auto-confirms drop-ship deliveries where 72h deadline passed with no dispute.

**Customer confirm/dispute flow:**
- Customer sees POD photos in portal, prompted to confirm or dispute within 72h.
- Confirm: `confirmDropShipDelivery({ deliveryId })` -> updates `drop_ship_pod`, transitions delivery to 'delivered', triggers invoice generation.
- Dispute: `disputeDropShipDelivery({ deliveryId, reason, photoUrls? })` -> updates `drop_ship_pod`, creates support ticket, notifies ops.

**`drop_ship_pod` table schema:**
```sql
CREATE TABLE drop_ship_pod (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  delivery_id               UUID NOT NULL REFERENCES deliveries(id),
  supplier_id               UUID NOT NULL REFERENCES suppliers(id),
  order_id                  UUID NOT NULL REFERENCES orders(id),
  customer_id               UUID NOT NULL REFERENCES customers(id),
  -- Supplier submission (via WhatsApp)
  supplier_photo_urls       TEXT[],
  supplier_submitted_at     TIMESTAMPTZ,
  supplier_phone            TEXT,
  supplier_whatsapp_msg_id  TEXT,
  supplier_notes            TEXT,
  -- Customer confirmation
  customer_confirmed        BOOLEAN DEFAULT FALSE,
  customer_confirmed_at     TIMESTAMPTZ,
  customer_confirmed_via    TEXT,          -- 'whatsapp' | 'portal'
  customer_confirmed_by     UUID REFERENCES auth.users(id),
  -- Customer dispute
  customer_disputed         BOOLEAN DEFAULT FALSE,
  customer_disputed_at      TIMESTAMPTZ,
  customer_dispute_reason   TEXT,
  customer_dispute_photos   TEXT[],
  -- Auto-confirm
  auto_confirmed            BOOLEAN DEFAULT FALSE,
  auto_confirm_deadline     TIMESTAMPTZ,   -- dispatch time + 72h
  -- Invoice trigger
  invoice_triggered         BOOLEAN DEFAULT FALSE,
  invoice_triggered_at      TIMESTAMPTZ,
  invoice_id                UUID,
  -- Status
  status                    drop_ship_pod_status DEFAULT 'awaiting_supplier_pod',
  -- Matching metadata
  matched_by                TEXT,           -- 'delivery_reference' | 'supplier_phone' | 'manual'
  matched_at                TIMESTAMPTZ,
  manually_matched_by       UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (delivery_id)
);
```

### Portal Customer GET Functions (from BACKEND.md Section 6 — Portal Customer)

These are the core read functions for the portal customer experience:

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getCustomerDashboard` | GET | `{}` | `{ activeOrders, pendingQuotes, openInvoices, recentActivity }` | customer | none |
| `getCustomerOrders` | GET | `{ status?, page, limit, dateRange? }` | `{ orders[], total }` | customer | none |
| `getCustomerOrderDetail` | GET | `{ orderId }` | `{ order, timeline, documents }` | customer (owner) | none |
| `getCustomerQuotes` | GET | `{ status?, page, limit }` | `{ quotes[], total }` | customer | none |
| `getCustomerInvoices` | GET | `{ status?, page, limit }` | `{ invoices[], totalOutstanding }` | customer | none |
| `downloadInvoicePDF` | GET | `{ invoiceId }` | `{ url }` (signed R2 URL) | customer (owner) | Log download |
| `getCustomerProfile` | GET | `{}` | `{ company, contacts, addresses }` | customer | none |
| `updateCustomerProfile` | POST | `{ companyName?, phone?, addresses? }` | `{ success }` | customer | Update customer, audit log |
| `getCustomerStatements` | GET | `{ period }` | `{ statement, downloadUrl }` | customer | none |
| `submitSupportTicket` | POST | `{ subject, category, message, orderId?, attachments? }` | `{ ticketId }` | customer | Creates ticket, notifies support |
| `replySupportTicket` | POST | `{ ticketId, message, attachments? }` | `{ responseId }` | customer | Adds reply |
| `getNotifications` | GET | `{ page, limit }` | `{ notifications[], unread }` | authenticated | none |
| `markNotificationRead` | PATCH | `{ notificationId }` | `{ success }` | authenticated | Updates read status |

### Portal Customer Mutation Functions (from BACKEND.md Section 6 — Portal Customer)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `submitReorder` | POST | `{ previousOrderId, adjustments? }` | `{ rfqId }` | customer | Clone from previous order |
| `inviteTeamMember` | POST | `{ phone, role }` | `{ inviteId }` | customer (owner) | Sends invite via WhatsApp/SMS |
| `removeTeamMember` | DELETE | `{ memberId }` | `{ success }` | customer (owner) | Removes membership |
| `changeTeamMemberRole` | PATCH | `{ memberId, newRole }` | `{ success }` | customer (owner) | Updates role |
| `updateNotificationPreferences` | PATCH | `{ preferences[] }` | `{ success }` | customer | Updates settings |
| `confirmDropShipDelivery` | POST | `{ deliveryId }` | `{ success, invoiceId? }` | customer (owner) | Update drop_ship_pod, transition delivery to delivered, trigger invoice |
| `disputeDropShipDelivery` | POST | `{ deliveryId, reason, photoUrls? }` | `{ success, ticketId }` | customer (owner) | Update drop_ship_pod, create support ticket, notify ops |
| `markAllNotificationsRead` | PATCH | `{}` | `{ success }` | authenticated | Bulk update |

## Referral Program

**Location:** Portal Settings > Referrals tab.

- Referral program: $250-1,000 account credit for referring new accounts (credit amount based on referred customer's first order value).
- Referred customers have 15-25% higher LTV (industry benchmark).
- Referral flow: existing customer generates referral link/code in Settings > Referrals -> shares via WhatsApp/email -> new customer signs up with referral code -> upon first completed order, referrer receives account credit.
- Referral tracking: `referrals` table (referrer_id, referred_customer_id, referral_code, status: pending/qualified/credited, credit_amount, credited_at).
- Dashboard in Settings > Referrals: total referrals, pending credits, earned credits, referral link with copy button.

## Non-Negotiable Rules

1. **`ClientOnly` for maps.** MapLibre GL must be wrapped in `ClientOnly` for SSR compatibility.
2. **Geist Mono for ALL numbers.** Order numbers, amounts, dates, notification timestamps.
3. **React Aria Components** for all UI (ListBox, Tabs, Table, Switch, RadioGroup, ComboBox, DatePicker, etc.).
4. **Three colors only.** Status colors are data-semantic only.
5. **Supabase Realtime** for notifications — invalidates TanStack Query cache, never writes directly to store.
6. **PWA install prompt after 3rd visit** (localStorage counter). Never auto-prompt push notifications.
7. **Arabic-Indic numerals** in Arabic context. All numbers, dates, references.

## Known Risks & Gotchas

- **MapLibre GL v5 breaking changes:** new `canvasContextAttributes`, `on()` returns Subscription.
- **vite-plugin-pwa incompatible with TanStack Start** — use manual Workbox.
- **Supabase Realtime subscriptions** must be RLS-filtered by user.
- **Guest claiming flow** modifies `customers.auth_user_id` and `status` — needs careful RLS.
- **Drop-ship POD 72h auto-confirm** is a pg_cron job, not a UI timer.

## Tips

- GPS map: use `react-map-gl/maplibre` import. Arabic labels via MapTiler.
- Notifications: badge count updates via Supabase Realtime subscription filtered by user_id.
- PWA: precache app shell, runtime cache API responses (stale-while-revalidate, 5min).
- Settings: changes save immediately on blur/change for toggles. Text fields show "Save" button on change.
