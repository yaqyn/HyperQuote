> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Order Cancellation and Change Order Policies for B2B Building Materials Distribution

**Research Date:** 2026-03-29
**Scope:** Cancellation fees, restocking, non-cancellable items, change orders, supplier PO cancellation, Egyptian commercial law, refund process
**Context:** HyperQuote -- quote-based B2B building materials distributor operating in Egypt/ME. Orders $100K-$100M+. Offline payments. Egyptian/ME regional suppliers.

---

## Table of Contents

1. [Cancellation Fees in B2B Building Materials](#1-cancellation-fees-in-b2b-building-materials)
2. [Restocking Fees](#2-restocking-fees)
3. [Non-Cancellable Items](#3-non-cancellable-items)
4. [Change Order Process in Distribution](#4-change-order-process-in-distribution)
5. [Supplier PO Cancellation](#5-supplier-po-cancellation)
6. [Egyptian Commercial Law on Order Cancellation](#6-egyptian-commercial-law-on-order-cancellation)
7. [Refund Process and Advance Payment Recovery](#7-refund-process-and-advance-payment-recovery)
8. [HyperQuote Recommended Policy Framework](#8-hyperquote-recommended-policy-framework)

---

## 1. Cancellation Fees in B2B Building Materials

### Industry Standard: Tiered by Order Stage

Cancellation fees in B2B building materials are NOT flat -- they are **tiered based on how far along the fulfillment process has progressed**. This is the universal standard across all markets.

| Order Stage | Typical Fee | Rationale |
|---|---|---|
| **Quote accepted, no POs sent** | 0% (free cancellation) | No supplier commitment yet; only HyperQuote labor lost |
| **POs sent to suppliers, not yet confirmed** | 0-5% | Minimal commitment; POs can often be recalled |
| **POs confirmed by suppliers, production not started** | 5-15% | Supplier may charge cancellation; admin costs |
| **Materials in production / fabrication** | 15-35% | Raw materials committed, labor expended |
| **Materials ready / in transit** | 25-50% | Full material cost minus resale value of standard items |
| **Materials delivered** | Not a cancellation -- this is a return/RMA | See restocking fees below |

### Egyptian/Middle Eastern Context

The Egyptian market does NOT have published, standardized cancellation fee schedules like US lumber yards. Instead:

- **Relationship-driven negotiations** dominate. A first-time customer who cancels gets the full penalty. A long-standing customer (e.g., a major contractor who orders monthly) gets flexibility.
- **Verbal agreements matter** but are legally weak. Egyptian Commercial Code (Law 17 of 1999) requires written proof for commercial transactions above a threshold.
- **The practical reality**: Egyptian distributors typically absorb cancellation costs for good customers and pass them through for problematic ones. HyperQuote needs to systematize this into a policy that is fair but protectable.
- **No formal "cancellation fee" tradition** exists in the Egyptian building materials market. Instead, suppliers simply refuse to return deposits and insist the buyer take delivery. HyperQuote's innovation is making this transparent and tiered.

### Recommended Fee Structure for HyperQuote

| Stage | Customer-Facing Fee | Internal Logic |
|---|---|---|
| Before PO submission | 0% | No cost incurred |
| POs submitted, awaiting supplier confirmation | 3% admin fee | Covers quoting labor, opportunity cost |
| POs confirmed, pre-production | 10% of order value | Covers supplier cancellation risk + admin |
| Materials in production | 15-25% depending on item type | Custom items higher, standard items lower |
| Materials ready/shipped from supplier | Actual supplier cost pass-through + 10% margin | HyperQuote should not lose money |
| Materials in HyperQuote warehouse | Full cost minus recoverable resale value | Standard items can be resold; custom cannot |

---

## 2. Restocking Fees

### Industry Benchmarks

Research across LBM (Lumber and Building Materials) distributors shows:

| Scenario | Typical Fee | Source/Reference |
|---|---|---|
| Standard stock items, returned within 30 days | 10-15% | Industry average across US/global distributors |
| Standard stock items, returned 30-90 days | 15-25% | Simonson Lumber policy: 25% after 90 days |
| Special order items (if returnable at all) | 25-30% minimum | Simonson Lumber: minimum 30% for special orders |
| Custom fabricated items | **Non-returnable / 50-100%** | Industry standard: no returns on custom |
| Items returned by dealer pickup (not customer drop-off) | Additional 5-10% for transport | LBM Journal reports this is common practice |

### Key Statistic

**74% of building materials retailers charge restocking fees on some returns**, 14% charge on all returns, and only 12% charge no restocking fees at all.

### Egyptian Market Application

Egyptian building materials suppliers generally do NOT have formal restocking fee policies. The norm is:

- **Cement, steel rebar (standard lengths), aggregates**: These are commodity items with active markets. A supplier can resell them easily. Restocking is low friction, but the supplier will still deduct transport and handling costs.
- **Cut-to-spec rebar, custom steel fabrication**: Non-returnable. The supplier has no other buyer for custom-cut pieces. This is universally true in Egypt as elsewhere.
- **Tiles, finishing materials**: Returnable only if unopened, original packaging, no damage. Color batch matching makes partial returns problematic.
- **Electrical/plumbing fittings**: Standard items are returnable; custom-ordered specifications are not.

### HyperQuote Restocking Fee Schedule

| Item Category | Restocking Fee | Conditions |
|---|---|---|
| Commodity items (cement, standard rebar, aggregates) | 10% | Undamaged, within 15 days of delivery |
| Standard catalog items (fittings, hardware, standard tiles) | 15% | Original packaging, within 30 days |
| Special order items (non-stock colors, specific grades) | 25% minimum | Only if supplier accepts return |
| Custom fabricated items (cut rebar, mixed concrete, custom windows) | **100% -- non-returnable** | No returns accepted |
| Bulk items requiring HyperQuote pickup | +5% transport surcharge | On top of base restocking fee |

---

## 3. Non-Cancellable Items

### Universal Non-Returnable Building Materials

These items CANNOT be cancelled once the supplier has begun production, regardless of market or jurisdiction:

| Item | Why Non-Cancellable |
|---|---|
| **Cut-to-spec rebar** | Custom bent/cut to project specifications; cannot be resold |
| **Ready-mix concrete** | Perishable; begins curing immediately; completely non-returnable |
| **Custom windows and doors** | Manufactured to specific dimensions; no standard resale market |
| **Trusses (roof/floor)** | Engineered to specific spans and loads; project-specific |
| **Pre-cast concrete elements** | Cast to project drawings; non-standard dimensions |
| **Mixed paint / custom colors** | Cannot be unmixed; shelf life concerns |
| **Cut-to-size glass** | Custom dimensions; cannot be re-cut larger |
| **Custom electrical panels** | Wired to project-specific specifications |
| **Treated/coated materials** | Epoxy-coated rebar, galvanized custom pieces; treatment is irreversible |
| **Imported special-order items** | Already shipped from overseas supplier; return logistics prohibitive |

### Communication to Customer

This information MUST be communicated at two critical moments:

1. **At quote stage**: The quote document should flag non-cancellable line items with a clear icon/label. Customer must acknowledge before accepting the quote.
2. **At order confirmation**: Before the order moves to "Confirmed" status, the customer sees a summary that explicitly lists non-cancellable items and must digitally acknowledge.

### Suggested Quote Line Item Markup

```
Line Item: Rebar 16mm, cut to 3.2m, bent per drawing RB-042
Qty: 500 pieces
Unit Price: EGP [quoted]
Status: NON-CANCELLABLE ONCE CONFIRMED
Note: Custom fabrication. Cannot be returned or cancelled after supplier PO is placed.
```

---

## 4. Change Order Process in Distribution

### Scenario: "Add 200 more bags of cement to my confirmed order"

There are three types of change orders:

### Type 1: Quantity Increase (Add Items / Increase Qty)

| Aspect | Policy |
|---|---|
| **Process** | Create a Change Order (CO) linked to the original order. NOT a new order. NOT an amendment to the original PO. |
| **Pricing** | **Current market price at time of change order**, not the original quote price. Material prices fluctuate (especially steel and cement in Egypt). The original quote locked a price for a specific quantity. Additional quantity is a new commitment. |
| **Exception** | If the original quote included a clause like "valid for +/- 10% quantity adjustment at quoted price," honor that. Common in construction where exact quantities are estimates. |
| **Approval** | Requires new approval if the change order exceeds a threshold (e.g., >10% of original order value or >EGP 500K absolute). |
| **Supplier impact** | New PO or PO amendment to supplier. If supplier has capacity, no issue. If supplier is at capacity, may need alternate supplier at different price. |
| **Timeline** | Change order resets the delivery timeline for the added items only. Original items maintain their schedule. |

### Type 2: Quantity Decrease (Reduce Qty)

| Aspect | Policy |
|---|---|
| **Process** | Change Order with cancellation of reduced quantity. |
| **Pricing** | Customer pays cancellation fee on the reduced portion (per stage-based fee schedule in Section 1). |
| **Volume pricing impact** | If original price was based on volume discount, and the reduction drops below the volume threshold, the **remaining items may be repriced upward**. This must be stated in the original quote terms. |
| **Supplier impact** | HyperQuote must negotiate PO reduction with supplier. Supplier may or may not accept. If materials are already produced, HyperQuote absorbs them or resells. |

### Type 3: Item Substitution

| Aspect | Policy |
|---|---|
| **Process** | Treat as simultaneous cancellation of old item + new order for replacement item. |
| **Pricing** | Cancellation fee on old item (per stage). New item at current market price. |
| **Supplier impact** | May involve different suppliers entirely. |

### Change Order Workflow in System

```
1. Customer requests change via portal or sales rep
2. System creates Change Order (CO-XXXX) linked to Order (ORD-XXXX)
3. If increase: new pricing calculated, presented to customer for approval
4. If decrease: cancellation fee calculated, presented to customer for acknowledgment
5. If approved: CO status -> Approved
6. System generates new/amended Supplier POs as needed
7. Original order timeline updated for affected line items only
8. CO history maintained as audit trail on the order
```

### Key Principle: Change Orders Are NOT Free

In the Egyptian/ME market, customers often expect to modify orders casually ("just add 200 more bags, same price, same truck"). HyperQuote must establish that:

- Changes AFTER confirmation have cost implications
- Price is locked at quote acceptance, not retroactively
- Additional quantities are at current price unless the original quote explicitly allowed variance
- Reductions incur fees proportional to fulfillment stage

---

## 5. Supplier PO Cancellation

### When HyperQuote Needs to Cancel a Supplier PO

This happens when:
- Customer cancels their order
- Customer reduces quantity
- HyperQuote finds a better supplier price (risky -- damages relationship)
- Supplier quality issue discovered pre-delivery

### Consequences by Stage

| Stage | Supplier Response | HyperQuote Liability |
|---|---|---|
| **PO sent, not yet confirmed** | Usually no penalty. PO can be withdrawn. | None or minimal admin cost |
| **PO confirmed, zero-liability period** | Many suppliers allow a grace period (24-72 hours) after confirmation. Cancellation is free within this window. | None |
| **PO confirmed, materials not yet allocated** | Supplier may charge 5-10% or simply refuse future priority. | 5-10% of PO value |
| **Raw materials purchased by supplier** | Supplier has committed capital. Charges actual material cost + handling. | Actual cost of materials |
| **Production/fabrication started** | Supplier charges for completed work + materials + lost production time. | 25-50% of PO value, or cost of completed work |
| **Materials ready for shipment** | Supplier expects full payment. May agree to cancel with 10-25% penalty if they can resell. Standard items are more negotiable. | 50-100% of PO value (custom items) |
| **Materials shipped** | No cancellation possible. This is now a delivery/return scenario. | Full PO value |

### Standard Supplier Agreement Clauses HyperQuote Should Include

1. **Zero-liability period**: "Buyer may cancel the PO within 48 hours of confirmation at no charge."
2. **Tiered cancellation fees**: Pre-agreed fee schedule per stage (see table above).
3. **Force majeure**: Neither party liable for cancellation due to force majeure events.
4. **Documentation requirement**: "Supplier must provide itemized breakdown of cancellation costs including raw materials purchased, labor expended, and third-party commitments."
5. **Resale offset**: "If Supplier can resell cancelled materials to another buyer, cancellation charges shall be reduced by the resale amount."
6. **Mutual cancellation**: "If Supplier cancels a confirmed PO, Supplier shall pay Buyer a penalty of [X]% of PO value to cover Buyer's losses and customer relationship damage."

### Supplier Cancellation (Supplier-Initiated)

When the supplier cancels after confirming:

| Scenario | Typical Cause | HyperQuote Response |
|---|---|---|
| Supplier cannot fulfill | Raw material shortage, production failure | Find alternate supplier; charge original supplier penalty per agreement |
| Supplier delays beyond agreed timeline | Capacity issues, logistics | Customer may cancel; HyperQuote claims damages from supplier |
| Supplier delivers wrong specifications | Quality issue | Reject delivery, demand replacement or refund |
| Force majeure | War, pandemic, government ban (e.g., Egypt's construction ban) | No penalty; force majeure clause applies |

### Egyptian Context: Supplier Relationships

In Egypt, formal supplier agreements with explicit cancellation clauses are RARE in the building materials sector. The norm is:

- **Verbal agreements**: "Send me 500 tons of rebar" over the phone or WhatsApp
- **Relationship-based penalties**: A supplier who cancels on you loses future business. A buyer who cancels frequently gets deprioritized.
- **No formal cancellation fees**: Instead, the supplier simply keeps the deposit and refuses further credit.
- **HyperQuote's innovation**: Formalizing supplier agreements with written POs and explicit cancellation terms. This is unusual in the Egyptian market but necessary at scale.

---

## 6. Egyptian Commercial Law on Order Cancellation

### Governing Legislation

| Law | Relevance |
|---|---|
| **Egyptian Civil Code (Law 131 of 1948)** | General contract law: formation, breach, damages, termination |
| **Egyptian Commercial Code (Law 17 of 1999)** | Commercial transactions, sale of goods between merchants, cheques |
| **UN Convention on Contracts for International Sale of Goods (CISG)** | Egypt ratified effective Jan 1, 1988. Applies to international sales. |

### Key Articles

#### Article 147 -- Binding Force of Contracts
- A contract legally formed "becomes the law of the parties."
- Cannot be revoked or modified except by mutual consent or for reasons provided by law.
- **Article 147(2) -- Hardship Doctrine**: If exceptional and unpredictable events make performance "excessively onerous" (not impossible), a judge may reduce obligations to reasonable limits. **Parties cannot contractually waive this protection.** This is significant -- a customer facing genuine hardship (e.g., project cancellation by the government) may have a legal basis to seek reduced cancellation fees.

#### Article 148 -- Good Faith
- All contracts must be performed in good faith.
- Rights must be exercised in a manner consistent with the agreement's spirit.
- A customer who cancels an order knowing HyperQuote has already placed supplier POs may be acting in bad faith if they do not compensate for costs incurred.

#### Articles 157-161 -- Contract Termination
- If one party does not perform their obligations, the other party may seek court-ordered termination AND compensation.
- For HyperQuote: if a customer cancels (i.e., refuses to perform their obligation to accept and pay), HyperQuote can claim damages.
- For customers: if HyperQuote fails to deliver, the customer can seek termination and damages.

### Damages Under Egyptian Law

| Type | Recoverable? | Notes |
|---|---|---|
| **Actual/direct losses** | Yes | Cost of materials purchased, supplier penalties paid, transport costs |
| **Lost profits** | Yes, if foreseeable | HyperQuote's margin on the cancelled order |
| **Consequential damages** | Limited | Only if a "natural result" of the breach |
| **Indirect/consequential profits** | No | Not compensable under Egyptian law |
| **Punitive damages** | No | Egyptian law does not provide for punitive damages |
| **Moral damages** | Rare | Reputational harm, but rarely awarded in commercial cases |

### Liquidated Damages Clauses

- Parties CAN agree on liquidated damages (pre-determined cancellation fees) in the contract.
- **However**: Egyptian courts retain the power to REVIEW and REDUCE liquidated damages if they are "excessively high and disproportionate to actual loss."
- **Implication for HyperQuote**: Cancellation fees must be reasonable and proportional. A 50% flat cancellation fee on an order where HyperQuote incurred only 10% in costs could be struck down by an Egyptian court.

### Statute of Limitations

| Claim Type | Period |
|---|---|
| General contractual claims | 15 years |
| Commercial obligations (between merchants) | 7 years |
| Cheque-related criminal action | 3 years |

### Cheques Under Egyptian Law

This is critically important for HyperQuote because Egyptian B2B transactions heavily use post-dated cheques.

- **Issuing a cheque without sufficient funds is a CRIMINAL offense** under Egyptian law (not just civil). This carries potential imprisonment.
- Post-dated cheques were technically made illegal under the Commercial Code of 1999, but they remain **extremely common** in practice in Egyptian B2B commerce.
- **Stopping payment on a cheque** (asking the bank not to honor it) is also a criminal offense unless the cheque was lost or stolen.
- **Implication for cancellations**: If a customer has given HyperQuote post-dated cheques as payment and then wants to cancel the order, the customer CANNOT simply stop payment on the cheques -- that is a criminal act. They must negotiate the return of the cheques as part of the cancellation settlement.

### Dispute Resolution

Egyptian commercial law provides three paths:

1. **Negotiation/Mediation**: Preferred in the Egyptian business culture. Most cancellation disputes are resolved through direct negotiation.
2. **Arbitration**: Governed by Law 27 of 1994. Faster than courts. Preferred for large commercial disputes. HyperQuote contracts should include an arbitration clause.
3. **Litigation**: Egyptian Economic Courts handle commercial disputes. Slower but enforceable. Egypt is a signatory to the 1958 New York Convention (foreign arbitral award enforcement).

---

## 7. Refund Process and Advance Payment Recovery

### Scenario: Ahmed Paid 50% Advance and Cancels

This is the most common and most contentious cancellation scenario. Here is the policy framework:

### Step 1: Determine What Ahmed Is Owed

```
Original Order Value:        EGP 10,000,000
Advance Payment (50%):       EGP  5,000,000

Costs HyperQuote Has Incurred:
- Supplier PO deposits paid:         EGP 3,000,000
- Non-cancellable items (custom):    EGP 1,200,000
- Cancellable items (supplier fee):  EGP    300,000  (10% of EGP 3,000,000 remaining)
- HyperQuote admin/processing:       EGP    150,000  (estimated)
                                     ──────────────
Total Unrecoverable Costs:           EGP 4,650,000

Refund to Ahmed:
  Advance Payment:                   EGP 5,000,000
- Total Unrecoverable Costs:         EGP 4,650,000
                                     ──────────────
= Net Refund:                        EGP   350,000
```

### The Legal Framework for Deposits vs. Advance Payments

This distinction is CRITICAL under both Egyptian and common law:

| Payment Type | Legal Treatment on Cancellation | Practical Implication |
|---|---|---|
| **Deposit** (earnest money / عربون) | Non-refundable by default. Serves as commitment guarantee. Seller keeps it as liquidated damages without needing to prove loss. | If HyperQuote calls the advance a "deposit," Ahmed forfeits it entirely upon cancellation. |
| **Advance Payment / Part-Payment** (دفعة مقدمة) | Refundable minus actual damages. Seller must prove specific losses to retain any portion. | If HyperQuote calls the advance a "part-payment," Ahmed can claim a refund of the full amount minus proven costs. |

**Recommendation for HyperQuote**: Structure the payment as follows:
- **10-15% non-refundable deposit** (clearly labeled as "deposit/عربون" in the contract)
- **Remaining advance as part-payment** (refundable minus actual costs upon cancellation)
- This gives HyperQuote guaranteed retention of 10-15% while maintaining fairness.

### Refund Calculation by Cancellation Stage

| Stage When Ahmed Cancels | HyperQuote Retains | Ahmed Gets Back |
|---|---|---|
| Before any POs sent | Non-refundable deposit (10-15%) only | 85-90% of advance |
| POs sent but not confirmed | Deposit + 3-5% admin fee | 80-87% of advance |
| POs confirmed, pre-production | Deposit + actual supplier cancellation fees | Varies; typically 70-85% of advance |
| Materials in production | Deposit + actual costs incurred (documented) | Varies; could be 30-60% of advance |
| Materials ready/shipped | Deposit + full cost of non-cancellable items + resaleable items at recovery value | May be very little; possibly 0-20% of advance |
| Materials delivered | No refund (this is a return, not cancellation) | See restocking fee policy |

### Refund Timeline

| Action | Timeline |
|---|---|
| Customer submits cancellation request | Day 0 |
| HyperQuote acknowledges and freezes order | Within 24 hours |
| HyperQuote contacts all suppliers to cancel/reduce POs | Within 48 hours |
| HyperQuote calculates actual costs incurred | Within 7 business days |
| HyperQuote presents cancellation statement to customer | Within 10 business days |
| Customer reviews and accepts/disputes | 7 days to respond |
| Refund issued (wire transfer) | Within 15 business days of agreement |
| **Total timeline** | **30-45 days from cancellation request** |

### Post-Dated Cheques That Have Not Been Deposited

This is extremely common in Egyptian B2B. If Ahmed gave HyperQuote a series of post-dated cheques:

| Cheque Status | Action |
|---|---|
| **Not yet deposited, not yet due** | Return the cheques to Ahmed as part of the cancellation settlement. Get a signed receipt for returned cheques. |
| **Deposited but not yet cleared** | HyperQuote should NOT stop payment (criminal offense). Wait for clearance, then refund the net amount via wire. |
| **Cleared** | Refund the net amount (advance minus costs) via wire transfer. |
| **Already passed to a third party** (e.g., endorsed to a supplier) | HyperQuote must recover the cheque from the third party before returning to Ahmed. If the supplier has already deposited, HyperQuote refunds via wire. |

**Critical Legal Point**: HyperQuote must NEVER instruct Ahmed to stop payment on the cheques. This is a criminal offense in Egypt. The correct process is for HyperQuote to return the physical cheques.

### Refund Documentation Requirements

Every refund must include:
1. **Cancellation statement** itemizing all costs deducted, with supporting documentation (supplier PO cancellation confirmations, actual cost invoices)
2. **Signed cancellation agreement** between HyperQuote and customer
3. **Cheque return receipt** (if applicable) listing all cheque numbers, amounts, dates
4. **Wire transfer confirmation** for the refund amount
5. **Updated account statement** showing the cancelled order and refund

---

## 8. HyperQuote Recommended Policy Framework

### Summary: The Complete Cancellation Policy

```
HYPERQUOTE ORDER CANCELLATION POLICY

1. CANCELLATION STAGES AND FEES

   Stage 1: Quote accepted, no supplier POs
   -> FREE cancellation. Full refund of any advance payment minus non-refundable deposit.

   Stage 2: Supplier POs submitted, awaiting confirmation
   -> 3% administrative fee on total order value.
   -> Non-refundable deposit retained.

   Stage 3: Supplier POs confirmed, pre-production
   -> 10% cancellation fee OR actual supplier cancellation charges, whichever is higher.
   -> Non-refundable deposit retained.

   Stage 4: Materials in production/fabrication
   -> Actual costs incurred (documented) + 5% HyperQuote margin.
   -> Non-cancellable custom items: 100% of item value.
   -> Non-refundable deposit retained.

   Stage 5: Materials ready/shipped from supplier
   -> Full cost of non-cancellable items.
   -> Standard items: full cost minus estimated resale recovery.
   -> Non-refundable deposit retained.

2. NON-CANCELLABLE ITEMS (clearly marked on quote and order confirmation)
   - Custom fabricated rebar (cut/bent to spec)
   - Ready-mix concrete
   - Custom windows, doors, trusses
   - Pre-cast concrete elements
   - Custom-mixed paint
   - Cut-to-size glass
   - Any item explicitly marked "NON-CANCELLABLE" on the quote

3. CHANGE ORDERS
   - Quantity increases: new pricing at current market rates
   - Quantity decreases: cancellation fees apply to reduced portion
   - Item substitutions: cancellation of old + new order for replacement
   - All changes require written approval via portal or signed amendment
   - Changes after Stage 3 require manager approval

4. REFUND PROCESS
   - Non-refundable deposit: 10-15% (labeled as deposit/عربون)
   - Remaining advance: refundable minus documented costs
   - Refund timeline: 30-45 days from cancellation request
   - Refund method: bank wire transfer
   - Post-dated cheques: physical return against signed receipt

5. SUPPLIER CANCELLATION (Supplier fails to deliver)
   - HyperQuote notifies customer within 24 hours
   - HyperQuote sources alternative supplier
   - If price increases, HyperQuote absorbs up to 5% increase; beyond that, customer chooses to accept new price or cancel without penalty
   - If delivery timeline extends, customer may cancel affected items without penalty

6. DISPUTE RESOLUTION
   - Step 1: Negotiation with account manager (7 days)
   - Step 2: Mediation by senior management (14 days)
   - Step 3: Arbitration per Egyptian Arbitration Law (Law 27 of 1994)
```

### System States for Cancellation

This integrates with the Order State Machine (see RESEARCH-Order-Quote-State-Machine.md):

```
Order States Related to Cancellation:

CONFIRMED -> CANCELLATION_REQUESTED -> CANCELLATION_REVIEW -> CANCELLED
                                    -> CANCELLATION_DENIED -> CONFIRMED

CANCELLATION_REVIEW substates:
  - CONTACTING_SUPPLIERS (reaching out to cancel/modify POs)
  - CALCULATING_COSTS (tallying actual costs incurred)
  - AWAITING_CUSTOMER_APPROVAL (customer must accept the cancellation statement)
  - PROCESSING_REFUND (refund being executed)

Change Order States:
CONFIRMED -> CHANGE_ORDER_REQUESTED -> CHANGE_ORDER_REVIEW -> CHANGE_ORDER_APPROVED -> CONFIRMED (updated)
                                                            -> CHANGE_ORDER_DENIED -> CONFIRMED (unchanged)
```

### Key Database Fields for Cancellation

```
order_cancellations:
  - id
  - order_id
  - requested_by (customer user id)
  - requested_at
  - reason (enum: customer_request, project_cancelled, financing_issue, scope_change, other)
  - reason_detail (text)
  - stage_at_cancellation (enum: stage_1 through stage_5)
  - non_refundable_deposit_amount
  - supplier_cancellation_fees (JSONB: [{supplier_id, po_id, fee_amount, fee_type}])
  - non_cancellable_items_cost
  - admin_fee
  - total_deductions
  - refund_amount
  - refund_method (enum: wire_transfer, cheque_return, offset_against_future_order)
  - refund_status (enum: pending_calculation, awaiting_approval, approved, processing, completed, disputed)
  - cheques_returned (JSONB: [{cheque_number, amount, date, return_receipt_id}])
  - approved_by
  - approved_at
  - completed_at
  - dispute_notes

order_change_orders:
  - id
  - order_id
  - type (enum: quantity_increase, quantity_decrease, item_substitution, item_addition)
  - requested_by
  - requested_at
  - line_items_added (JSONB)
  - line_items_removed (JSONB)
  - line_items_modified (JSONB)
  - original_order_value
  - new_order_value
  - price_basis (enum: original_quote_price, current_market_price, negotiated)
  - cancellation_fees_on_removed (decimal)
  - requires_approval (boolean)
  - approved_by
  - approved_at
  - supplier_pos_affected (JSONB: [{po_id, action: 'new'|'amended'|'cancelled'}])
  - status (enum: requested, under_review, approved, rejected, implemented)
```

---

## Sources

- [LBM Journal: Restocking Fees](https://lbmjournal.com/real-issues-real-answers-restocking-fees/)
- [Simonson Lumber: Return Policy](https://simonson-lumber.com/materials/return-policy/)
- [Restocking Fee Meaning (Priceva)](https://priceva.com/blog/restocking-fee)
- [B2B Restocking Fees: Three Steps](https://www.driveyoursuccess.com/2012/07/b2b-restocking-fees-three-simple-steps-to-covering-carrying-costs.html)
- [Restocking Fee Sample Clauses (Law Insider)](https://www.lawinsider.com/clause/restocking-fee)
- [Restocking Fee Schedule by Manufacturer (ROK Hardware)](https://www.rokhardware.com/restocking-fee-by-manufacturer)
- [Mondaq: Mitigating Costs When Cancelling a PO](https://www.mondaq.com/contracts-and-commercial-law/1207338/how-to-mitigate-costs-when-modifying-or-cancelling-a-purchase-order)
- [Can You Legally Cancel a PO? (InvoiceOwl)](https://www.invoiceowl.com/po-guide/can-you-legally-cancel-a-purchase-order/)
- [Can You Cancel a PO? (Planergy)](https://planergy.com/blog/cancel-po-supplier/)
- [Breach of Contract Litigation in Egypt (Consortion Law)](https://consortiolawfirm.com/breach-of-contract-litigation-in-egypt/)
- [Contract Disputes in Egypt (Alzayat Law)](https://alzayatfirm.com/contract-disputes-in-egypt/)
- [Contractual Liability Under Egyptian Law (Lexology)](https://www.lexology.com/library/detail.aspx?g=1ddbc079-8a9b-456f-8915-6238ff29a90b)
- [Commercial Contracts 2025 Egypt (Chambers)](https://practiceguides.chambers.com/practice-guides/commercial-contracts-2025/egypt/trends-and-developments)
- [Limiting Contractual Liability in Egypt (Lexology)](https://www.lexology.com/library/detail.aspx?g=935709e2-d7c5-48b1-86fe-f472b0a5cec9)
- [Contract Formation in Egypt (Andersen)](https://eg.andersen.com/contract-formation-in-egypt/)
- [Refund of Advance Payment Clauses (Law Insider)](https://www.lawinsider.com/clause/refund-of-advance-payment)
- [Deposits: When Entitled to Money Back (Hughes Paddison)](https://www.hughes-paddison.co.uk/site/blog/corporate_and-_commercial/deposits-when-are-you-entitled-to-ask-for-your-money-back)
- [Deposits and Part Payment in Commercial Transactions (Edwin Lee)](https://lpplaw.my/insights/e-articles/understanding-refundability-and-forfeiture-of-deposits-and-part-payment-in-commercial-transactions/)
- [Star Building Material Return Policy](https://www.starbuildingwinnipeg.ca/docs/star-return-policy.pdf)
- [Construction Change Orders (Smartsheet)](https://www.smartsheet.com/content/construction-change-order-form-101)
- [Change Order Pricing Factors (AIA)](https://learn.aiacontracts.com/articles/6535564-3-key-factors-that-impact-change-order-pricing/)
- [Egyptian Commercial Code Law 17 of 1999 (WIPO)](https://www.wipo.int/wipolex/en/legislation/details/13558)
- [Egyptian Civil Code (Trans-Lex)](https://www.trans-lex.org/602800)
