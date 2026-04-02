Quotes on HyperQuote follow a defined state machine that tracks every stage from initial creation to final resolution. Understanding these states helps you know what actions are available at each point and what to expect next.

## Quote states explained

A quote moves through these states during its lifecycle:

**Draft** — The internal team is building the quote. Supplier pricing is being collected, margins applied, and line items assembled. You do not see the quote yet.

**Sent** — The quote has been delivered to you via the portal and WhatsApp. You can now review, accept, decline, or counter-offer. The validity clock starts ticking.

**Negotiating** — You have submitted a counter-offer and the team is reviewing it. This state supports version tracking — each counter-offer creates a new version (v1, v2, v3) while preserving the full negotiation history.

**Revised** — A new version of the quote has been prepared in response to your counter-offer or a change in supplier pricing. The revised quote replaces the previous version for your review.

**Accepted** — You have accepted the quote. The system automatically converts it to a confirmed order and generates purchase orders to the selected suppliers.

**Declined** — You have declined the quote. The system records the reason for internal analysis.

**Expired** — The validity period has passed without acceptance. Stable products typically have 14-day validity; volatile materials like steel and cement use 5-7 day windows because supplier pricing can shift significantly over longer periods.

**Cancelled** — The quote has been withdrawn, either at your request or due to supplier stock changes that made the original quote unfulfillable.

**Requires Re-Quote** — Market conditions or supplier availability have changed substantially enough that the existing quote needs to be rebuilt from scratch rather than revised.

## Negotiation and counter-offers

HyperQuote supports the way Egyptian B2B actually works — line-by-line negotiation, not take-it-or-leave-it pricing. You can:

- **Counter on specific items** — propose a different unit price per line item
- **Request a blanket discount** — "5% off the total"
- **Adjust quantities** — "What if I order 80 tons instead of 50?"
- **Negotiate delivery terms** — "Include delivery" or "I will arrange pickup, reduce the price"
- **Partially accept** — take the items you agree on and decline the rest; accepted items generate an order immediately
- **Add free-text notes** in Arabic or English explaining your position

Every counter-offer is tracked with a version number. You and your team can review the full negotiation history at any time.

## Validity and expiration

Quote validity is tiered based on material volatility. Stable products like hardware and fixtures get 14-day windows. Semi-volatile items like plywood and pipes get 7-10 days. Volatile commodities like steel, cement, and lumber get 5-7 days. These windows reflect how quickly supplier costs change in the Egyptian market.

When a quote is nearing expiration, you receive a reminder notification. If you need more time, contact your account manager to request an extension — though the team may need to re-verify supplier pricing for volatile items.

## What happens after acceptance

Accepting a quote triggers an automated chain: the quote converts to an order, purchase orders are generated for each supplier, and soft stock reservations convert to hard commitments. If the quote was confirmed verbally during a phone call with your sales representative, they create the order directly — no redundant portal clicks needed.
