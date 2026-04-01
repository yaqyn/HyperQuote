> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# Customer Tier Progression and Credit Management Rules
## B2B Building Materials Distribution -- Egypt Market (2025-2026)

---

## 1. TIER PROGRESSION: When Does Ahmed Move from Tier 1 to Tier 2?

### The Composite Trigger Model

No single metric triggers a tier change. Industry practice across B2B distribution (confirmed by NetSuite, Prophet 21, and SAP B2B credit modules) uses a **composite scoring model** that evaluates multiple dimensions simultaneously:

| Metric | Weight | Rationale |
|--------|--------|-----------|
| **Number of completed orders** | 20% | Volume proves operational seriousness |
| **Cumulative order value (EGP)** | 20% | Higher spend = more at stake for customer |
| **Payment timeliness** | 30% | Most heavily weighted -- proves trustworthiness |
| **Time as customer** | 15% | Minimum relationship duration prevents gaming |
| **Order consistency** | 15% | Regular ordering vs. one-time bulk buys |

### Proposed Tier Structure for New Vision

**Tier 1 -- New Customer (CBD / Cash Before Delivery)**
- Default for all new customers
- No credit extended
- Payment: Cash, bank transfer, or certified cheque before dispatch

**Tier 2 -- Developing (Net 30, limited credit)**
- Upgrade triggers (ALL must be met):
  - Minimum 5 completed orders paid on time
  - Minimum cumulative spend of EGP 500,000
  - Minimum 3 months as active customer
  - No payment disputes or returns fraud
  - Credit application submitted and approved (trade references checked)
- Credit limit: 10-15% of trailing 6-month purchases (or EGP 200,000-500,000 starting limit)

**Tier 3 -- Established (Net 30-45, standard credit)**
- Upgrade triggers from Tier 2:
  - Minimum 15 completed orders
  - Minimum cumulative spend of EGP 2,000,000
  - Minimum 9 months as active customer
  - Payment score >= 80 (on-time or early on 90%+ of invoices)
  - No late payments exceeding 15 days in trailing 6 months
- Credit limit: 20-25% of trailing 12-month purchases

**Tier 4 -- Premium / Strategic (Net 45-60, high credit)**
- Upgrade triggers from Tier 3:
  - Minimum 12 months at Tier 3
  - Annual purchases exceeding EGP 10,000,000
  - Payment score >= 90
  - Financial statements reviewed and approved
  - Project pipeline visibility shared (for construction contractors)
- Credit limit: Negotiated based on project pipeline and financial capacity

**Tier 5 -- Flagged (CBD only, restricted)**
- Downgrade trigger: Bounced cheque, fraud, or chronic default
  - See Section 6 for rehabilitation path

### How ERPs Handle This

**NetSuite:** Uses customer credit scoring with configurable rules. Credit limits are set per customer record. Orders exceeding credit limit are automatically held for credit manager approval. Supports automated credit review workflows with escalation chains.

**Prophet 21 (Epicor):** Built specifically for distribution. Has credit hold automation, aging-based alerts, and configurable credit limit rules per customer class. Supports "credit classes" that map directly to tier systems.

**SAP B2B Commerce:** Implements automatic order holds when credit limit exceeded, configurable auto-release rules, and credit status monitoring that triggers notifications.

**For New Vision's Platform:** The system should store tier as a computed field on the customer record, recalculated nightly based on the composite scoring model. Tier changes should require human confirmation (credit manager approval) for upgrades, but downgrades on payment violations should be automatic with notification.

---

## 2. CREDIT LIMIT SETTING FOR EGYPTIAN CONSTRUCTION COMPANIES

### The Egyptian Credit Landscape

**I-Score (The Egyptian Credit Bureau):**
- Established 2005, operational since 2008
- Holds nearly 100% of credit data on individuals and SMEs from commercial banks
- 913+ subscribing banks, companies, and microfinance institutions
- Provides credit reports on both individuals and SMEs
- **Limitation for B2B distributors:** I-Score primarily covers banking credit data, not trade credit (supplier payment history). There is no Egyptian equivalent of D&B's PAYDEX for trade credit scoring.

**What This Means for New Vision:** You cannot rely on I-Score alone. You need to build your own trade credit assessment process.

### How Egyptian Distributors Actually Set Credit Limits

Based on Egyptian market practice and regional building materials distribution norms:

**For a New Customer (First Credit Limit):**

1. **Credit Application Form** -- Collects:
   - Company commercial registration (السجل التجاري)
   - Tax registration number (البطاقة الضريبية)
   - Company size and annual revenue (self-reported)
   - Bank references (minimum 1 active bank account)
   - Trade references (minimum 3 existing suppliers)
   - Owner/director personal guarantee (standard in Egypt for SMEs)
   - Current project list (for contractors)

2. **Verification Steps:**
   - Call trade references directly (WhatsApp is acceptable in Egyptian market)
   - Verify commercial registration is active and not suspended
   - Check company age (companies < 2 years = higher risk)
   - For large limits: Request audited financials or bank statements

3. **Typical First Credit Limits (Egyptian Market):**
   - Small contractor (< 50 employees): EGP 100,000 - 300,000
   - Medium contractor (50-200 employees): EGP 300,000 - 1,000,000
   - Large contractor (200+ employees): EGP 1,000,000 - 5,000,000
   - Government-affiliated entity: Case by case, typically higher but with longer payment cycles

4. **Rule of Thumb:** First credit limit = the lesser of:
   - 10% of verified annual revenue
   - Average single order value x 2
   - EGP 500,000 (absolute cap for unproven customers)

### Egyptian-Specific Considerations

- **Personal guarantees are standard.** In Egypt, especially for SMEs and family-owned construction companies, the owner's personal guarantee (and often a post-dated cheque as security) is expected.
- **Post-dated cheques as security:** Extremely common in Egyptian business practice. The supplier holds post-dated cheques covering the credit limit. If the customer defaults, the cheque provides both leverage (criminal liability) and a direct path to collection.
- **Relationship-based assessment:** The Egyptian market is heavily relationship-driven. A customer introduced by a trusted existing client or a known industry figure may receive faster credit approval and a higher initial limit.
- **No formal D&B equivalent for trade credit:** Unlike the US, there is no widely-used commercial credit score for trade credit in Egypt. Assessment relies on references, financials, and relationship trust.

---

## 3. CREDIT LIMIT INCREASE PROCESS

### When a Customer Requests Higher Credit

**Trigger Points:**
- Customer's orders are consistently hitting or exceeding current limit
- Customer has a new large project requiring higher material volumes
- Seasonal demand increase (e.g., construction boom season)
- Customer requests increase directly

### Review Process

**Step 1: Automated Pre-Screening (System)**
- Current tier status: Must be Tier 2 or above
- Payment score: Must be >= 75 (no chronic late payment)
- Current utilization: Should be > 70% of existing limit for at least 3 months
- No open disputes or unresolved claims

**Step 2: Documentation Required**
- Updated trade references (if > 6 months since last check)
- Recent financial statements (for increases > 50% of current limit)
- Bank statements (last 3 months)
- Current project pipeline / contracts (for contractors)
- Personal guarantee update (if limit exceeds original guarantee amount)
- Updated post-dated cheque(s) covering new limit amount

**Step 3: Approval Authority Matrix**

| Increase Amount | Approver |
|----------------|----------|
| Up to 25% of current limit | Credit Manager (solo) |
| 25-50% of current limit | Credit Manager + Finance Director |
| 50-100% of current limit | Finance Director + CEO |
| > 100% of current limit | CEO + Board/Owner review |

**Step 4: Decision Timeline**
- Standard increases (< 25%): Same day to 2 business days
- Moderate increases (25-50%): 3-5 business days
- Large increases (> 50%): 5-10 business days (pending financial review)

### Automatic Limit Increases

Consider implementing automatic increases for excellent customers:
- Annual automatic review for Tier 3+ customers
- If payment score >= 90 and utilization > 80% for 6+ months, auto-increase by 15-20%
- Notify customer and credit manager; no action required unless flagged

---

## 4. LATE PAYMENT IMPACT ON CREDIT

### The Tolerance Framework

Not all late payments are equal. The system needs graduated responses:

**Grace Period: 1-7 Days Late**
- No action. This is noise (bank transfer delays, weekend processing).
- System records the lateness but does not change score or tier.
- Invoice marked as "paid" with no flag.

**Warning Zone: 8-15 Days Late (Net 30 invoice = Day 38-45)**
- Automated reminder sent (email + WhatsApp)
- Late payment flag recorded on customer profile
- No tier impact for first occurrence
- Second occurrence within 6 months: Payment score reduced by 5 points
- Late fee of 1.5% may be applied (configurable, often waived in Egyptian market to maintain relationship)

**Escalation Zone: 16-30 Days Late (Net 30 invoice = Day 46-60)**
- Credit Manager notified automatically
- New orders placed on HOLD until payment received
- Payment score reduced by 10 points per occurrence
- If 2+ invoices in this zone within 6 months: Tier downgrade review triggered
- Personal follow-up call required (not just automated)

**Critical Zone: 31-60 Days Late**
- All new orders BLOCKED (not just held)
- Finance Director notified
- Formal demand letter sent
- Tier downgrade automatic (one tier down)
- Credit limit reduced by 50%
- Legal/collections team engaged if no communication from customer

**Default Zone: 60+ Days Late**
- Account frozen
- Tier 5 (Flagged) automatic
- Post-dated security cheques presented to bank
- Legal action initiated
- Credit limit revoked

### The "Always 10 Days Late But Always Pays" Customer

This is extremely common in Egypt and the broader MENA region. The practical approach:

**Do NOT auto-penalize this customer.** Instead:

1. **Track the pattern:** System should calculate "average days to pay" (DTP) as a metric separate from "days past due."
2. **Adjust expected payment date:** If a customer consistently pays on day 40 for Net 30 invoices, their *behavioral* payment date is Net 40. This is "slow but reliable."
3. **PAYDEX equivalent:** D&B scores this as a 70 (Slow 1-15 days), which is "Medium Risk" -- not a crisis.
4. **Recommended approach:**
   - After 3 consecutive late-but-paid cycles, have a credit manager conversation: "We notice your payments typically arrive around day 40. Would it be easier for your cash flow if we adjusted to Net 45 terms?"
   - This converts a perpetually "late" customer into an "on-time" customer on different terms.
   - Their tier is preserved, relationship is maintained, and your records are accurate.
5. **Red line:** If the "always 10 days late" stretches to "always 25 days late" or the delay keeps growing, that is a different pattern (deteriorating) and should trigger warnings.

### Impact Summary Table

| Scenario | Score Impact | Tier Impact | Order Impact |
|----------|-------------|-------------|--------------|
| 1-7 days late (once) | None | None | None |
| 8-15 days late (first time) | -2 points | None | None |
| 8-15 days late (2nd time in 6mo) | -5 points | Review | None |
| 16-30 days late | -10 points | Review | Orders held |
| 31-60 days late | -20 points | Auto downgrade | Orders blocked |
| 60+ days late | Score = 0 | Tier 5 (Flagged) | Account frozen |
| Bounced cheque | Score = 0 | Tier 5 immediate | Account frozen |

---

## 5. PAYMENT BEHAVIOR SCORING

### Adapting PAYDEX for New Vision

Since there is no Egyptian PAYDEX, New Vision needs its own internal payment behavior score. Model it on PAYDEX principles but adapted for the Egyptian market:

**Score Range: 0-100**

| Score Range | Classification | Meaning |
|-------------|---------------|---------|
| 90-100 | Excellent | Pays early or on time consistently |
| 80-89 | Good | Pays on time, occasional 1-7 day delays |
| 70-79 | Acceptable | Pays within 15 days of terms |
| 50-69 | Concerning | Regularly 16-30 days late |
| 30-49 | Poor | Regularly 31-60 days late |
| 0-29 | Critical | 60+ days late or default history |

### Scoring Formula

The score should be a **dollar-weighted, recency-biased average** (matching PAYDEX methodology):

```
Payment Score = Σ (Invoice_Weight × Recency_Weight × Timeliness_Score) / Σ (Invoice_Weight × Recency_Weight)
```

**Where:**

**Invoice Weight (by amount):**
- Invoice > EGP 500,000: Weight = 3.0
- Invoice EGP 100,000 - 500,000: Weight = 2.0
- Invoice < EGP 100,000: Weight = 1.0

Rationale: Paying a large invoice on time is a stronger signal than paying a small one.

**Recency Weight (by age):**
- Last 3 months: Weight = 3.0
- 3-6 months ago: Weight = 2.0
- 6-12 months ago: Weight = 1.0
- 12+ months ago: Weight = 0.5

Rationale: Recent behavior predicts future behavior better than old behavior.

**Timeliness Score (per invoice):**
- Paid 15+ days early: 100
- Paid 1-14 days early: 95
- Paid on time (within grace period, 0-7 days): 90
- Paid 8-15 days late: 70
- Paid 16-30 days late: 50
- Paid 31-60 days late: 30
- Paid 61-90 days late: 15
- Paid 90+ days late: 5
- Unpaid / sent to collections: 0

### Metrics That Feed the Score

| Metric | Source | Update Frequency |
|--------|--------|-----------------|
| Invoice payment date vs. due date | Accounting system | Real-time on payment receipt |
| Invoice amount | Order system | At invoicing |
| Dispute history | Support/CRM | As disputes are logged |
| Cheque bounce events | Banking integration | Immediate |
| Partial payment patterns | Accounting system | Real-time |
| Credit utilization % | Credit module | Daily recalculation |

### How Score Affects Terms

| Score Change | System Action |
|-------------|--------------|
| Score rises above 80 (from below) | Eligible for tier upgrade review |
| Score drops below 70 (from above) | Alert credit manager; hold new orders for review |
| Score drops below 50 | Automatic tier downgrade; credit limit reduction |
| Score drops below 30 | Account freeze; Tier 5 assignment |
| Score sustained above 90 for 12 months | Eligible for automatic credit limit increase |

---

## 6. REHABILITATION FROM TIER 5 (FLAGGED)

### Context: Bounced Cheques in Egypt

**Legal background:** Under Egypt's Commercial Code (Law No. 17 of 1999, which superseded Penal Code Article 337 effective October 2000), issuing a cheque without sufficient funds remains a **criminal offense** in Egypt. Unlike the UAE (which partially decriminalized bounced cheques in 2022), Egypt has NOT decriminalized this.

**What this means for the distributor:**
- Holding post-dated cheques gives you **massive leverage** in Egypt
- The threat of criminal prosecution usually triggers immediate payment
- Filing a police report is a common debt collection tactic
- However, pursuing criminal action damages the relationship permanently

### Rehabilitation Path: Tier 5 Back to Normal

**Phase 1: Resolution (Months 0-1)**
- Customer must settle ALL outstanding balances in full
- Any bounced cheques must be replaced with cleared payments
- Written acknowledgment of the breach
- If criminal complaint was filed: can be withdrawn upon full settlement (common practice in Egypt)

**Phase 2: Probation -- CBD Only (Months 1-6)**
- Customer returns to CBD terms
- Must complete minimum 5 orders successfully on CBD
- Minimum cumulative spend of EGP 300,000 on CBD
- No disputes, no returns fraud
- New personal guarantee and post-dated cheque security required

**Phase 3: Limited Credit Restoration (Months 6-12)**
- If Phase 2 completed successfully, customer may be restored to Tier 2
- Credit limit = 50% of their pre-incident limit (not the same level)
- Net 15 terms initially (shorter than standard Net 30)
- Monthly review by credit manager

**Phase 4: Full Restoration (Month 12+)**
- After 6 months of clean Tier 2 performance
- Credit limit may be restored to pre-incident level
- Terms may be restored to pre-incident level
- Total rehabilitation timeline: **12-18 months minimum**

### Is Rehabilitation Common in Egypt?

**Yes, very common.** Egyptian business culture is pragmatic and relationship-oriented:
- Bounced cheques happen frequently due to cash flow timing issues in construction
- Most are not fraudulent -- they are cash flow miscalculations
- The criminal threat is primarily used as leverage, not for prosecution
- Once the financial issue is resolved, business relationships often resume
- Losing a good customer over a one-time cash flow problem is seen as wasteful
- However, **repeat offenders** (2+ bounced cheques) are typically blacklisted permanently

### Rehabilitation Rules Summary

| Phase | Duration | Terms | Credit Limit |
|-------|----------|-------|-------------|
| Resolution | 0-1 months | Settle all debts | None |
| Probation | 1-6 months | CBD only | None |
| Limited Credit | 6-12 months | Net 15 | 50% of prior |
| Full Restoration | 12-18 months | Net 30 | Up to 100% of prior |
| Permanent Blacklist | N/A | CBD only forever | None |

**Permanent blacklist criteria (no rehabilitation):**
- 2+ bounced cheques on separate occasions
- Proven fraud or intentional misrepresentation
- Criminal conviction for commercial fraud
- Company dissolved or ownership changed to evade debts

---

## 7. CREDIT INSURANCE IN THE EGYPTIAN MARKET

### Availability

**Yes, trade credit insurance IS available in Egypt.** Both major global providers have presence:

**Coface Egypt:**
- Office at 55 Mossadek Street, Cairo
- Provides: Credit insurance, business information reports, debt collection
- Has been operating in Egypt for years with local staff
- Issues credit information reports on Egyptian companies
- Part of Coface's Middle East regional network

**Atradius:**
- Covers Egypt through their Middle East regional operation (Dubai hub)
- Supported businesses in the Middle East since 2000
- In the region, operates through fronting partner arrangements (e.g., in UAE through Orient Insurance PJSC)
- Functions as reinsurer with local fronting partner

**Allianz Trade (formerly Euler Hermes):**
- The third major global player
- Present in the Middle East region
- Together with Coface and Atradius, holds approximately 70% of global credit insurance capacity

### What Trade Credit Insurance Covers

- Protection against customer non-payment (insolvency or protracted default)
- Typically covers 75-90% of the invoice value (not 100%)
- Covers both domestic (Egyptian) and export receivables
- Does NOT cover:
  - Disputed invoices
  - Late payment interest
  - Pre-existing bad debts
  - Currency exchange losses (significant in Egypt given EGP volatility)

### Cost

- Global average premium: 0.1% to 0.5% of insured turnover
- Egyptian market likely on the higher end due to:
  - Country risk rating: Coface rates Egypt as "C" for country risk (moderate-to-high)
  - Construction sector risk: Higher than average
  - Currency volatility: EGP devaluations increase risk premiums
- **Estimated cost for a mid-size Egyptian distributor:** 0.3% to 0.8% of insured turnover
- Example: On EGP 100M annual credit sales, expect EGP 300,000 to 800,000 annual premium

### Is It Practical for a Mid-Size Distributor?

**Partially practical. Here is the honest assessment:**

**Arguments FOR:**
- Protects against catastrophic loss from a major customer default
- Enables you to extend more credit (grow faster) with insurance as backstop
- Coface/Atradius provide credit intelligence on potential customers (value-add beyond insurance)
- Useful for the handful of very large accounts (EGP 5M+ credit limits)

**Arguments AGAINST:**
- Premiums eat into margins on a business already operating on tight margins (building materials distribution margins are typically 5-15%)
- Deductibles and coverage gaps mean small defaults are still your problem
- The insurer may decline to cover your riskiest customers (the ones you most need coverage on)
- Claims process can be slow and bureaucratic
- In Egyptian market, the post-dated cheque + criminal liability system already provides significant protection
- Most mid-size Egyptian distributors do NOT use credit insurance -- they rely on cheque security, personal guarantees, and relationship management

**Recommended Approach for New Vision:**
1. **Do not use credit insurance initially.** Focus on building strong internal credit management (this document's tier system + cheque security).
2. **Consider credit insurance selectively** once individual customer credit limits exceed EGP 5,000,000. Insure only the top 10-15 accounts, not the entire portfolio.
3. **Use Coface for business information** even without buying insurance. Their credit reports on Egyptian companies are valuable for credit decisions.
4. **Revisit when annual credit sales exceed EGP 200M+.** At that scale, portfolio-level credit insurance becomes more cost-effective.

---

## APPENDIX: Ahmed's Journey -- Concrete Example

**Month 0:** Ahmed registers his construction company (Ahmed Construction LLC) on the platform.
- Tier: 1 (New)
- Credit: None
- Terms: CBD

**Month 1-2:** Ahmed places 3 orders totaling EGP 200,000. All paid by bank transfer before delivery.
- Tier: 1 (still)
- Progress: 3/5 orders completed, EGP 200K/500K cumulative spend

**Month 3:** Ahmed places 2 more orders totaling EGP 350,000. All paid on time.
- Progress: 5/5 orders completed, EGP 550K/500K cumulative spend, 3/3 months as customer
- Ahmed submits credit application with 3 trade references
- References checked: 2 excellent, 1 good
- **TIER UPGRADE: 1 -> 2 (Developing)**
- Credit limit set: EGP 300,000
- Terms: Net 30
- Post-dated cheque for EGP 300,000 collected as security

**Months 4-8:** Ahmed places 12 orders totaling EGP 1,800,000. All paid within terms (one invoice paid on day 35, others on time).
- Payment score: 87 (Good)
- Progress toward Tier 3: 17/15 orders, EGP 2,550K/2,000K cumulative, but only 8/9 months

**Month 9:** Ahmed reaches 9-month milestone.
- Payment score: 85 (one slightly late payment brought it down)
- All criteria met.
- **TIER UPGRADE: 2 -> 3 (Established)**
- Credit limit increased: EGP 600,000
- Terms: Net 30 maintained (Net 45 available if score reaches 90)

**Month 14:** Ahmed has a large project. Requests credit increase to EGP 1,500,000.
- Current utilization: 95% of EGP 600,000 limit for 4 months
- Payment score: 91
- Submits: Updated financials, current project contract, bank statements
- Approval: Credit Manager + Finance Director approve
- Credit limit: EGP 1,200,000 (80% of requested -- conservative start)
- New post-dated cheques collected for increased amount

**Month 18:** One of Ahmed's invoices (EGP 400,000) goes 45 days past due. Ahmed communicates proactively -- his client delayed payment to him.
- Order hold triggered at day 16
- Payment received on day 45
- Score impact: -10 points (dropped to 79)
- Tier impact: Remains Tier 3 (single incident, proactive communication)
- Note added to file: "Cash flow delay, communicated, resolved"

**Month 20:** Ahmed's score recovers to 86 after 2 months of on-time payments. Business continues normally.

---

## Sources

- [NetSuite Building Materials ERP](https://www.netsuite.com/portal/industries/building-materials.shtml)
- [Net 30/60/90 Terms Guide for B2B E-Commerce](https://resolvepay.com/blog/net-terms-guide-for-b2b-e-commerce-stores-manufacturing-distribution)
- [ERP-Native Net Terms](https://resolvepay.com/blog/erp-native-net-terms)
- [Egypt Distribution and Sales Channels -- US Trade.gov](https://www.trade.gov/country-commercial-guides/egypt-distribution-sales-channels)
- [Egypt Trade Financing -- US Trade.gov](https://www.trade.gov/country-commercial-guides/egypt-trade-financing)
- [Commercial Contracts 2025 Egypt -- Chambers and Partners](https://practiceguides.chambers.com/practice-guides/commercial-contracts-2025/egypt)
- [Doing Business in Egypt 2025 -- PwC](https://www.pwc.com/m1/en/tax/documents/doing-business-guides/dbie.pdf)
- [The Egyptian Credit Bureau I-Score](https://www.i-score.com.eg/en/about-i-score/about-the-egyptian-credit-bureau-i-score/)
- [I-Score Credit Bureau Overview -- Decisimo](https://decisimo.com/credit-data/egypt-credit-bureau-i-score.html)
- [Understanding D&B PAYDEX Score](https://www.treditiq.com/resources/blog/understanding-the-d-and-b-paydex-score)
- [PAYDEX Score Explained -- Ramp](https://ramp.com/blog/what-is-a-paydex-score)
- [PAYDEX Score -- LendingTree](https://www.lendingtree.com/business/paydex-score/)
- [B2B Payment Timeliness and Expected Returns -- ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0304405X25001163)
- [B2B Payment Terms 2026 -- Resolve](https://resolvepay.com/blog/post/b2b-payment-terms-everything-you-need-to-know-in-2022/)
- [Late Payments Threaten B2B Supply Chain -- PYMNTS](https://www.pymnts.com/news/b2b-payments/2025/net-never-terms-delayed-payments-threaten-b2b-supply-chain-stability/)
- [Trade Credit in Construction -- Procore](https://www.procore.com/library/trade-credit-construction)
- [Negotiate Higher Credit Limit with Supplier -- Procore](https://www.procore.com/library/negotiate-higher-credit-limit-with-supplier)
- [Credit Management in Building Materials Industry -- BMG](https://bmgdxb.com/building-materials-industry/mastering-credit-management-in-the-building-materials-industry/)
- [Building Strong Credit Department for Construction Suppliers -- Handle](https://www.handle.com/how-to-build-strong-credit-department-construction-material-suppliers/)
- [NetNow for Building Materials Credit Management](https://www.prnewswire.com/news-releases/netnow-revitalizes-credit-management-systems-for-the-building-materials-industry-announces-pre-seed-round-302241473.html)
- [Debt Collection in Egypt -- Debitura](https://www.debitura.com/countries/debt-collection-agency-egypt)
- [Debt Recovery in Egypt -- Andersen](https://eg.andersen.com/debt-recovery-in-egypt/)
- [Coface Egypt Country Risk](https://www.coface.us/news-economy-and-business-insights/economic-risk-dashboard/country-risk-files/egypt)
- [Coface Egypt Office -- Kompass](https://gb.kompass.com/c/coface-egypt/eg000555/)
- [Atradius UAE and Middle East](https://group.atradius.com/contact-us/atradius-uae.html)
- [Trade Credit Insurance Market 2025](https://www.businessresearchinsights.com/market-reports/trade-credit-insurance-market-118819)
- [Credit Limit Setup -- Credit Management Tools](https://www.creditmanagement-tools.com/set-up-the-credit-limit-c2-r21.php)
- [Credit Management Process -- Cflow](https://www.cflowapps.com/credit-management-process/)
- [B2B Credit Risk Management Best Practices](https://findyouraudience.online/b2b-credit-risk-management-best-practices-revealed/)
- [Art of Credit Approvals -- NACM](https://bcm.nacm.org/the-art-of-credit-approvals/)
- [Trade References Guide -- Allianz Trade](https://www.allianz-trade.com/en_US/insights/trade-references.html)
- [Construction Material Supplier Credit Agreements -- Jimerson Birr](https://www.jimersonfirm.com/blog/2023/01/five-key-provisions-construction-material-suppliers-include-customer-credit-agreements/)
- [RFM Segmentation Guide](https://mcpanalytics.ai/articles/rfm-segmentation-practical-guide-for-data-driven-decisions)
- [B2B Credit Management -- TreviPay](https://www.trevipay.com/resource-center/blog/b2b-credit-management/)
- [Nuvo B2B Customer Onboarding and Credit Software](https://nuvo.com/)
