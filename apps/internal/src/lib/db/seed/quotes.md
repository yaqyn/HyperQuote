# Quotes

Sales quotes generated from RFQs. One row per sent/draft quote. Items are
resolved live from supplier_prices at render time so changing an inventory
price reflects in any quote that has not yet been accepted.

`sentAtHoursAgo` and `validUntilDaysFromNow` are rendered to real ISO
timestamps at load time. `null` sentAtHoursAgo means the quote is still a
draft.

Schema: `{ id, quoteNumber, rfqId, customerId, version, status,
marginPercent, sentAtHoursAgo (nullable), validUntilDaysFromNow, sentVia,
customerPoNumber (nullable), previousVersionId (nullable), items: [{ productSlug,
quantity, marginPercent, sellPrice }] }`

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
  }
]
```
