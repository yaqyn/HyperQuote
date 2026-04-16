# Quotes

Sales quotes generated from RFQs. One row per sent/draft quote. Items are
resolved live from supplier_prices at render time so changing an inventory
price reflects in any quote that has not yet been accepted.

`sentAtHoursAgo` and `validUntilDaysFromNow` are rendered to real ISO
timestamps at load time. `null` sentAtHoursAgo means the quote is still a
draft.

`paymentStatus` is orthogonal to `status`. Accepted quotes start as
`unpaid` and flow through Finance: `unpaid → partial → paid`. Finance sets
this via `recordOrderPartial` / `recordOrderFullPayment`. `totalDue` is
computed from items at load if absent.

Schema: `{ id, quoteNumber, rfqId, customerId, version, status,
marginPercent, sentAtHoursAgo (nullable), validUntilDaysFromNow, sentVia,
customerPoNumber (nullable), previousVersionId (nullable), items: [{ productSlug,
quantity, marginPercent, sellPrice }], paymentStatus?, amountPaid?, totalDue? }`

```json
[
  {
    "id": "qt-001",
    "quoteNumber": "QT-2026-00523",
    "rfqId": "rfq-003",
    "customerId": "cust-003",
    "version": 1,
    "status": "sent",
    "marginPercent": 18.2,
    "sentAtHoursAgo": 24,
    "validUntilDaysFromNow": 14,
    "sentVia": "portal",
    "customerPoNumber": null,
    "previousVersionId": null,
    "items": [
      { "productSlug": "portland-cement-cemi-42-5n", "quantity": 300, "marginPercent": 20, "sellPrice": 56.40 },
      { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 4, "marginPercent": 15, "sellPrice": 40200 },
      { "productSlug": "concrete-hollow-blocks-20cm", "quantity": 3000, "marginPercent": 22, "sellPrice": 12.80 }
    ]
  },
  {
    "id": "qt-002",
    "quoteNumber": "QT-2026-00711",
    "rfqId": "rfq-006",
    "customerId": "cust-003",
    "version": 1,
    "status": "accepted",
    "marginPercent": 19.5,
    "sentAtHoursAgo": 48,
    "validUntilDaysFromNow": 7,
    "sentVia": "portal",
    "customerPoNumber": "PO-MDE-0142",
    "previousVersionId": null,
    "paymentStatus": "unpaid",
    "items": [
      { "productSlug": "pvc-pressure-pipe-110mm-6bar", "quantity": 60, "marginPercent": 19, "sellPrice": 720 },
      { "productSlug": "welded-wire-mesh-6mm-200x200", "quantity": 75, "marginPercent": 20, "sellPrice": 1450 }
    ]
  },
  {
    "id": "qt-003",
    "quoteNumber": "QT-2026-00812",
    "rfqId": "rfq-002",
    "customerId": "cust-002",
    "version": 1,
    "status": "accepted",
    "marginPercent": 21.0,
    "sentAtHoursAgo": 32,
    "validUntilDaysFromNow": 10,
    "sentVia": "portal",
    "customerPoNumber": "PO-PYR-2218",
    "previousVersionId": null,
    "paymentStatus": "unpaid",
    "items": [
      { "productSlug": "sulfate-resistant-cement-cem-v", "quantity": 1200, "marginPercent": 22, "sellPrice": 74.00 },
      { "productSlug": "steel-rebar-10mm-grade-60", "quantity": 8, "marginPercent": 15, "sellPrice": 39800 },
      { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 5, "marginPercent": 15, "sellPrice": 40200 },
      { "productSlug": "crushed-gravel-size-1", "quantity": 220, "marginPercent": 25, "sellPrice": 550 },
      { "productSlug": "bituminous-membrane-4mm-sbs", "quantity": 80, "marginPercent": 22, "sellPrice": 420 }
    ]
  }
]
```
