---
phase: 09-portal-material-list-builder-quote-submission
verified: 2026-04-01T12:30:00Z
status: gaps_found
score: 22/27 items verified (all tiers)
gaps:
  - truth: "3-step flow (Build -> Details -> Review) completes and creates a quote_request in the database"
    status: failed
    reason: "Step 2 (Details) renders a placeholder div in QuoteBuilderFlow.tsx — DetailsStep.tsx exists but is orphaned (not imported). Plan 04 commit 06ca333 wired it but Plan 05 commit 21195c9 was applied on top of the Plan 02 base (parallel worktree), reverting the wiring."
    artifacts:
      - path: "apps/portal/src/components/quote-builder/QuoteBuilderFlow.tsx"
        issue: "Step 2 renders `<div className='text-sm ...'>quoteBuilder.step2</div>` placeholder. DetailsStep import is absent. Line 103: `{/* Step 2: Details -- placeholder for Plan 04 */}`"
      - path: "apps/portal/src/components/quote-builder/step2/DetailsStep.tsx"
        issue: "File exists and is substantive (8562 bytes, DatePicker, AddressComboBox wired) but is ORPHANED — nothing imports it"
    missing:
      - "Import DetailsStep in QuoteBuilderFlow.tsx and replace the step 2 placeholder with `<DetailsStep />`"

  - truth: "Step 3 shows read-only summary with edit links back to relevant steps"
    status: failed
    reason: "ReviewStep has no Pencil edit links back to step 1 or step 2. Plan 04 required edit navigation. Because step 2 is a placeholder, the DeliveryAddress is also absent from the review summary."
    artifacts:
      - path: "apps/portal/src/components/quote-builder/step3/ReviewStep.tsx"
        issue: "No Pencil icon imports, no edit links to setStep(1) or setStep(2). ReviewStep shows deliveryDate and notes conditionally but no delivery address (deliveryAddressId never set because step 2 is bypassed)."
    missing:
      - "Add Pencil edit links in ReviewStep that call setStep(1) and setStep(2)"
      - "Show delivery address in ReviewStep summary (requires step 2 to be wired first)"

  - truth: "Confirmation modal uses isKeyboardDismissDisabled"
    status: failed
    reason: "CLAUDE.md requires isKeyboardDismissDisabled on all Dialogs. ReviewStep's ModalOverlay uses isDismissable instead, which is the opposite behavior."
    artifacts:
      - path: "apps/portal/src/components/quote-builder/step3/ReviewStep.tsx"
        issue: "Line 188: `isDismissable` on ModalOverlay. Should be `isKeyboardDismissDisabled` per project non-negotiable rule."
    missing:
      - "Replace `isDismissable` with `isKeyboardDismissDisabled` on ModalOverlay in ReviewStep.tsx"
---

# Phase 9: Portal Material List Builder + Quote Submission — Verification Report

**Phase Goal:** Customers can build a material list using any of 4 input methods and submit it for quoting, with buyer-side approval workflows for team accounts
**Verified:** 2026-04-01T12:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC1 | All 4 input methods work: Search & Add, CSV/Excel upload, Quick Pad, AI Assist | ✓ VERIFIED | SearchAndAdd.tsx (4855B), UploadMethod.tsx (10547B), QuickPad.tsx (16420B), AIAssistMethod.tsx (6417B) all exist, substantive, wired to file-parser/useProductSearch/parseWithAI |
| SC2 | 3-step flow completes and creates a quote_request in the database | ✗ FAILED | Step 2 (DetailsStep) is orphaned — QuoteBuilderFlow.tsx renders a placeholder div for step 2. Submit path works (ReviewStep->useQuoteSubmit->submitQuoteRequest->DB insert) but user cannot enter delivery details. |
| SC3 | Auto-save preserves draft every 30 seconds; returning user sees in-progress list | ✓ VERIFIED | useQuoteDraft.ts: 30s interval localStorage write confirmed (line 50+), rehydrate on mount, DraftResumeBanner rendered in orders_.new.tsx route |
| SC4 | Buyer with "approver" role receives notification; pending approvals tab shows actionable items | ✓ VERIFIED | approvals.ts: submitForApproval, getPendingApprovals, approveQuoteRequest, requestChanges. ApprovalBanner.tsx renders in orders.tsx pending approvals query. useIsApprover/useNeedsApproval hooks wired. |
| SC5 | Delivery address ComboBox loads saved addresses and auto-expands new address form | ✓ VERIFIED | AddressComboBox.tsx (12979B) exists and is wired to getCustomerAddresses (line 235) and createAddress (line 90). Rendered in DetailsStep.tsx — but DetailsStep itself is orphaned (not reached by user). |

**Score:** 3/5 ROADMAP success criteria verified

---

### Plan-Level Must-Have Truths

#### Plan 01 (Data Layer)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P01.T1 | quote_requests and quote_request_items tables exist with correct constraints and RLS | ✓ VERIFIED | Migration file 13805B, contains CREATE TABLE quote_requests, CREATE TABLE quote_request_items, ENABLE ROW LEVEL SECURITY (11 matches), approval_required, generate_request_number, `(SELECT auth.uid())` pattern |
| P01.T2 | Server functions for submit, saveDraft, parseWithAI, product search, and addresses are callable | ✓ VERIFIED | quote-requests.ts (14933B) has submitQuoteRequest+saveDraft+parseWithAI+inputValidator; addresses.ts (7823B); products-search.ts (7767B) with PUBLIC_COLUMNS whitelist |
| P01.T3 | Zustand store holds items, step, and cross-step state with localStorage persistence | ✓ VERIFIED | quote-builder.ts (4376B) has useQuoteBuilderStore, skipHydration, persist middleware |
| P01.T4 | CSV files parse correctly including UTF-8 BOM, semicolon delimiters, and Arabic headers | ✓ VERIFIED | file-parser.ts (8345B) uses PapaParse (header:true, skipEmptyLines:true), Arabic header mapping confirmed |
| P01.T5 | Excel .xlsx files parse into structured row data | ✓ VERIFIED | file-parser.ts uses SheetJS XLSX (13 matches for parseCSV/XLSX/xlsx) |
| P01.T6 | Egyptian business day validation blocks Friday and Saturday | ✓ VERIFIED | business-days.ts (3626B): isWeekend with 'ar-EG' locale (8 matches), always uses ar-EG regardless of display locale |
| P01.T7 | Auto-save draft writes to localStorage every 30 seconds and restores on mount | ✓ VERIFIED | useQuoteDraft.ts: 30s interval (5036B), localStorage 6 matches, useQuoteBuilderStore.persist.rehydrate() on mount |

#### Plan 02 (Core Step 1 UI)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P02.T1 | User navigates to /orders/new and sees 3-step flow with Build List as step 1 | ✓ VERIFIED | orders_.new.tsx renders WindowShell + QuoteBuilderFlow + DraftResumeBanner. QuoteBuilderFlow renders StepIndicator and BuildListStep at step 1. |
| P02.T2 | User can search for products via ComboBox and add them to the material list | ✓ VERIFIED | SearchAndAdd.tsx: ComboBox with useProductSearch (debounced, 150ms), items added to useQuoteBuilderStore |
| P02.T3 | Product list table shows items with drag reorder, quantity editing, notes, and delete | ✓ VERIFIED | ProductListTable.tsx (10900B): GridList + useDragAndDrop, useQuoteBuilderStore (4 selectors), NumberField/TextField/Trash2 |
| P02.T4 | Step indicator shows active/completed/upcoming states with correct colors | ✓ VERIFIED | StepIndicator.tsx (3023B) rendered in QuoteBuilderFlow |
| P02.T5 | Back to Orders button returns to orders window | ✓ VERIFIED | QuoteBuilderFlow.tsx line 69: navigate({ to: '/orders' }) |

#### Plan 03 (Alternative Input Methods)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P03.T1 | CSV upload with messy files parses correctly and populates product list | ✓ VERIFIED | UploadMethod.tsx calls parseCSV/parseExcel from file-parser.ts (lines 13-14, 88). DropZone confirmed. |
| P03.T2 | Excel .xlsx upload parses and populates product list | ✓ VERIFIED | Same UploadMethod.tsx, parseExcel call |
| P03.T3 | Upload validation shows ALL errors at once with error table | ✓ VERIFIED | UploadValidation.tsx exists (substantive). UploadMethod.tsx triggers validation display |
| P03.T4 | Quick Pad allows rapid multi-row entry with Tab key flow and paste support | ✓ VERIFIED | QuickPad.tsx (16420B), ComboBox confirmed, custom quickpad-paste DOM event |
| P03.T5 | AI Assist textarea parses natural language into structured items | ✓ VERIFIED | AIAssistMethod.tsx calls parseWithAI (line 84): `await parseWithAI({ data: { text: text.trim() } })` |
| P03.T6 | Unmatched products show yellow warning badge with manual product selection dropdown | ✓ VERIFIED | UploadValidation.tsx has unmatched badge. AIAssistMethod and QuickPad flag low-confidence items |

#### Plan 04 (Steps 2 & 3)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P04.T1 | Step 2 collects delivery address, preferred date, notes, and file attachments | ✗ FAILED | DetailsStep.tsx exists and is substantive, but is ORPHANED. Step 2 in QuoteBuilderFlow renders a placeholder. |
| P04.T2 | Address ComboBox loads saved addresses and auto-expands new address form | ✓ VERIFIED | AddressComboBox.tsx wired to getCustomerAddresses. Exists standalone — but unreachable via UI because DetailsStep is orphaned. WIRED but HOLLOW PATH. |
| P04.T3 | DatePicker blocks Friday and Saturday as delivery dates | ✓ VERIFIED | DetailsStep.tsx line 85: `isDateUnavailable={isDateUnavailable}` — but unreachable (same as above) |
| P04.T4 | Step 3 shows read-only summary with edit links back to relevant steps | ✗ FAILED | ReviewStep.tsx has no Pencil imports and no edit link navigation. deliveryAddressId absent from summary (never set). |
| P04.T5 | Submit creates quote_request in database and shows success confirmation with reference number | ✓ VERIFIED | ReviewStep.tsx lines 93-100: result triggers SubmitConfirmation with reference. submitQuoteRequest inserts to quote_requests table (confirmed in server function). |
| P04.T6 | Confirmation modal uses elevated glass tier with spring animation | PARTIAL | ReviewStep uses backdrop-blur-2xl and spring animation (confirmed in Plan 04 summary). BUT `isDismissable` used instead of required `isKeyboardDismissDisabled` (CLAUDE.md non-negotiable). |

#### Plan 05 (Approval Workflows)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P05.T1 | Non-approver buyer sees "Submit for Approval" instead of "Submit Quote Request" | ✓ VERIFIED | ReviewStep.tsx line 182: `needsApproval ? t('quoteBuilder.submitForApproval') : t('quoteBuilder.submitCTA')` |
| P05.T2 | Approval submission creates approval record and notifies approver | ✓ VERIFIED | approvals.ts has submitForApproval (server function), inserts to approvals table |
| P05.T3 | Approver sees pending approvals in Orders window with actionable review buttons | ✓ VERIFIED | orders.tsx: getPendingApprovals query (line 119), ApprovalBanner.tsx map (line 130-131) |
| P05.T4 | Approver can approve or request changes | ✓ VERIFIED | ApprovalBanner.tsx contains "Approve" (1 match). approvals.ts has approveQuoteRequest and requestChanges server functions. |
| P05.T5 | Pending approval status badge shows on quote request cards | ? UNCERTAIN | Orders window "Active/Quotes" tabs are empty states per Plan 05 summary — populated by future phases. Approval badge on quote cards not verifiable without quote card rendering (Phase 10). |

**Total plan-level score:** 22/27 truths verified

---

### Required Artifacts

| Artifact | Size | Status | Notes |
|----------|------|--------|-------|
| `supabase/migrations/20260401000009_quote_requests.sql` | 13805B | ✓ VERIFIED | All 5 tables, RLS, generate_request_number |
| `apps/portal/src/lib/server/quote-requests.ts` | 14933B | ✓ VERIFIED | submitQuoteRequest, saveDraft, parseWithAI with inputValidator |
| `apps/portal/src/lib/server/addresses.ts` | 7823B | ✓ VERIFIED | getCustomerAddresses, createAddress, getCustomerProjects, createProject |
| `apps/portal/src/lib/server/products-search.ts` | 7767B | ✓ VERIFIED | searchProducts with PUBLIC_COLUMNS whitelist |
| `apps/portal/src/lib/server/approvals.ts` | 14451B | ✓ VERIFIED | submitForApproval, getPendingApprovals, approveQuoteRequest, requestChanges |
| `apps/portal/src/stores/quote-builder.ts` | 4376B | ✓ VERIFIED | useQuoteBuilderStore, skipHydration, persist |
| `apps/portal/src/lib/file-parser.ts` | 8345B | ✓ VERIFIED | parseCSV, parseExcel, Arabic header mapping |
| `apps/portal/src/lib/business-days.ts` | 3626B | ✓ VERIFIED | isEgyptianBusinessDay, isDateUnavailable, ar-EG locale |
| `apps/portal/src/hooks/useProductSearch.ts` | 3336B | ✓ VERIFIED | fuse.js client + server fallback |
| `apps/portal/src/hooks/useQuoteDraft.ts` | 5036B | ✓ VERIFIED | 30s interval, localStorage, rehydrate on mount |
| `apps/portal/src/hooks/useQuoteSubmit.ts` | 2316B | ✓ VERIFIED | useMutation wrapping submitQuoteRequest |
| `apps/portal/src/hooks/useApproval.ts` | 2318B | ✓ VERIFIED | useIsApprover, useNeedsApproval |
| `apps/portal/src/routes/_portal/orders_.new.tsx` | 978B | ✓ VERIFIED | Renders QuoteBuilderFlow, useQuoteDraft, DraftResumeBanner |
| `apps/portal/src/components/quote-builder/QuoteBuilderFlow.tsx` | 5632B | ✗ STUB | Step 2 renders placeholder div. DetailsStep not imported. |
| `apps/portal/src/components/quote-builder/StepIndicator.tsx` | 3023B | ✓ VERIFIED | Rendered in QuoteBuilderFlow |
| `apps/portal/src/components/quote-builder/step1/BuildListStep.tsx` | 3097B | ✓ VERIFIED | 4-tab container |
| `apps/portal/src/components/quote-builder/step1/SearchAndAdd.tsx` | 4855B | ✓ VERIFIED | ComboBox + useProductSearch |
| `apps/portal/src/components/quote-builder/step1/ProductListTable.tsx` | 10900B | ✓ VERIFIED | GridList + drag reorder + useQuoteBuilderStore |
| `apps/portal/src/components/quote-builder/step1/UploadMethod.tsx` | 10547B | ✓ VERIFIED | DropZone + parseCSV/parseExcel |
| `apps/portal/src/components/quote-builder/step1/UploadValidation.tsx` | exists | ✓ VERIFIED | Error table with inline editing |
| `apps/portal/src/components/quote-builder/step1/QuickPad.tsx` | 16420B | ✓ VERIFIED | ComboBox, Tab flow, paste |
| `apps/portal/src/components/quote-builder/step1/AIAssistMethod.tsx` | 6417B | ✓ VERIFIED | parseWithAI wired |
| `apps/portal/src/components/quote-builder/step2/DetailsStep.tsx` | 8562B | ⚠️ ORPHANED | Substantive (DatePicker, AddressComboBox) but not imported anywhere |
| `apps/portal/src/components/quote-builder/step2/AddressComboBox.tsx` | 12979B | ⚠️ ORPHANED | Wired to addresses server functions but only reachable via DetailsStep which is orphaned |
| `apps/portal/src/components/quote-builder/step2/AttachmentUpload.tsx` | exists | ⚠️ ORPHANED | Only used in DetailsStep |
| `apps/portal/src/components/quote-builder/step3/ReviewStep.tsx` | 8710B | ✓ VERIFIED | Wired to useQuoteSubmit + submitForApproval. Missing edit links. |
| `apps/portal/src/components/quote-builder/step3/SubmitConfirmation.tsx` | 2777B | ✓ VERIFIED | CheckCircle, reference number, wired in ReviewStep |
| `apps/portal/src/components/quote-builder/ApprovalBanner.tsx` | 5470B | ✓ VERIFIED | Approve action, rendered in orders.tsx |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| SearchAndAdd.tsx | useProductSearch.ts | `useProductSearch` hook | ✓ WIRED | Line 16 import, line 27 usage |
| ProductListTable.tsx | quote-builder store | `useQuoteBuilderStore` | ✓ WIRED | Lines 22, 49-52 |
| UploadMethod.tsx | file-parser.ts | `parseCSV`, `parseExcel` | ✓ WIRED | Lines 13-14 import, line 88 call |
| AIAssistMethod.tsx | quote-requests.ts | `parseWithAI` | ✓ WIRED | Line 12 import, line 84 call |
| AddressComboBox.tsx | addresses.ts | `getCustomerAddresses`, `createAddress` | ✓ WIRED | Lines 28-29 import, lines 90, 235 calls |
| DetailsStep.tsx | business-days.ts | `isDateUnavailable` | ✓ WIRED | Line 29 import, line 85 prop |
| QuoteBuilderFlow.tsx | DetailsStep.tsx | import + render at step 2 | ✗ NOT WIRED | DetailsStep not imported. Step 2 is a placeholder div. |
| ReviewStep.tsx | useQuoteSubmit.ts | `submit` mutation | ✓ WIRED | Line 11 import, line 28 destructure |
| ReviewStep.tsx | approvals.ts | `submitForApproval` | ✓ WIRED | Line 13 import, line 44 call |
| orders.tsx | approvals.ts | `getPendingApprovals` | ✓ WIRED | Line 21 import, line 119 query |
| quote-requests.ts | DB table | supabase insert into quote_requests | ✓ WIRED | Lines 135-137: `.from('quote_requests').insert(...)` |
| useQuoteDraft.ts | quote-builder store | `useQuoteBuilderStore.getState()` | ✓ WIRED | Line 8 import, lines 36, 50, 69, 87 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| ReviewStep.tsx | `items` | `useQuoteBuilderStore((s) => s.items)` | Yes — Zustand store populated by all 4 input methods | ✓ FLOWING |
| ReviewStep.tsx | `deliveryAddressId` | `useQuoteBuilderStore((s) => s.deliveryAddressId)` | No — never set because step 2 placeholder never renders DetailsStep | ✗ HOLLOW PATH |
| orders.tsx (approvals) | `approvals` | `getPendingApprovals()` query | Yes — server function queries `approvals` table via Supabase | ✓ FLOWING |
| SearchAndAdd.tsx | `results` | `useProductSearch(inputValue)` | Yes — fuse.js against first 500 products, server fallback | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — No runnable entry points available for automated behavioral testing (requires browser + Supabase connection).

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PORT-04 | 09-01, 09-02, 09-03, 09-04 | Material list builder: 3-step flow, 4 input methods, auto-save drafts | PARTIAL | All 4 input methods verified. Auto-save verified. Step 2 (Details) orphaned — 3-step flow incomplete. |
| PORT-13 | 09-05 | Buyer-side approval workflows: submit for approval, approver notification, pending approvals tab | ✓ SATISFIED | approvals.ts server functions, conditional submit button, Orders window with pending approvals tab, ApprovalBanner |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `QuoteBuilderFlow.tsx` | 103-106 | Step 2 placeholder div — DetailsStep orphaned | 🛑 Blocker | Users cannot enter delivery address, preferred date, notes, or attachments. The 3-step flow cannot complete. |
| `ReviewStep.tsx` | 188 | `isDismissable` instead of `isKeyboardDismissDisabled` | 🛑 Blocker | Violates CLAUDE.md non-negotiable rule: "isKeyboardDismissDisabled on Dialogs". Confirmation modal can be dismissed by keyboard during active submission. |
| `ReviewStep.tsx` | (absent) | No Pencil edit links to steps 1 and 2 | ⚠️ Warning | Plan 04 required edit links. Review summary is read-only with no way to go back to correct specific sections. |
| `AttachmentUpload.tsx` | 37, 44 | `// TODO: show toast` comments | ℹ️ Info | Missing toast feedback for max-files and file-too-large validation errors. UX gap, not blocker. |
| `QuoteBuilderFlow.tsx` | 50 | `// TODO: show toast "Draft saved"` | ℹ️ Info | No user feedback when draft is saved manually. |

---

### Human Verification Required

#### 1. Auto-save and Draft Restore Flow

**Test:** Build a partial list (2-3 items via Search & Add), wait 30 seconds, close browser, reopen portal. Does DraftResumeBanner appear?
**Expected:** DraftResumeBanner appears with "Continue" CTA; items list is restored exactly.
**Why human:** localStorage timing and hydration behavior requires real browser interaction.

#### 2. CSV Upload with Arabic Headers

**Test:** Upload a CSV with Arabic column headers (اسم المنتج, الكمية, الوحدة) and semicolon delimiters.
**Expected:** Items parse correctly into the product list with correct quantity and UOM mapping.
**Why human:** Requires real file system interaction and browser File API.

#### 3. Drag Reorder Accessibility

**Test:** With keyboard only (no mouse), reorder items in the product list using arrow keys.
**Expected:** React Aria GridList drag-and-drop works via keyboard; screen reader announces reorder.
**Why human:** Complex keyboard interaction requiring real browser + accessibility tooling.

#### 4. AI Assist Parsing Confidence

**Test:** Enter "200 ton rebar 16mm + 50 bags white cement + 10 rolls barbed wire" in the AI Assist textarea.
**Expected:** 3 items parsed with productName, quantity, and UOM; any unmatched shows yellow warning badge.
**Why human:** Mock keyword matching quality needs human judgment.

#### 5. Approval Role-Based Conditional Submit

**Test:** Log in as a user WITHOUT approver role and navigate to /orders/new, build a list, proceed to step 3.
**Expected:** Submit button reads "Submit for Approval" not "Submit Quote Request".
**Why human:** Requires real auth session with specific role assignment.

---

### Gaps Summary

**Root cause:** Plans 02-05 ran in parallel worktrees. Plan 05 (commit `21195c9`) was based on the Plan 02 base (`c9ae430`) without incorporating the Plan 04 change that wired DetailsStep into QuoteBuilderFlow. The result is that Plan 04's QuoteBuilderFlow modification — replacing the step 2 placeholder with `<DetailsStep />` — was lost when Plan 05 wrote the final version of QuoteBuilderFlow.

**What's missing:**
1. `QuoteBuilderFlow.tsx` step 2: add `import { DetailsStep } from './step2/DetailsStep'` and replace the placeholder div with `<DetailsStep />` (1-line fix from Plan 04's commit `06ca333`)
2. `ReviewStep.tsx`: add edit links (Pencil + setStep) back to steps 1 and 2
3. `ReviewStep.tsx` ModalOverlay: replace `isDismissable` with `isKeyboardDismissDisabled`

All underlying components (DetailsStep, AddressComboBox, AttachmentUpload) are fully implemented and correct — they just need to be connected. Fix complexity is very low: items 1 and 3 are single-line changes; item 2 requires ~10 lines of edit-link UI.

---

*Verified: 2026-04-01T12:30:00Z*
*Verifier: Claude (gsd-verifier)*
