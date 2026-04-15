# Order reports

Living documents that grow as an order walks the pipeline. Each report is
attached to an RFQ (early stage) or an order (later stages). A section is
appended every time the order is evaluated into the next stage.

Stages (in order):
  1. submitted      — customer info + requested items + delivery address
  2. evaluated      — locked quote (prices snapshotted at quote time)
  3. finance_partial— partial payment recorded
  4. inventory_orders — supplier sources + warehouse source numbers
  5. finance_full   — full payment recorded
  6. warehouse      — driver assignment + pick + load window
  7. dispatch       — delivery confirmation
  8. delivered      — closed

`canceled` is a terminal alt-path.

Each seed row is `{ id, rfqId, currentStage, canceledReason?, sections:{ stage: { ...data } } }`.
Only the sections listed here have been filled; the viewer greys out the rest.

```json
[
  {
    "id": "rep-001",
    "rfqId": "rfq-007",
    "currentStage": "canceled",
    "canceledReason": "cannot_source",
    "canceledAtHoursAgo": 18,
    "sections": {
      "submitted": {
        "customerName": "Maadi Engineering",
        "customerTier": "new",
        "contactName": "Reem Abdelaziz",
        "phone": "+20 2 2358 9900",
        "deliveryAddress": "22 Road 9, Maadi, Cairo",
        "deliveryCity": "Cairo, Maadi",
        "deliveryUrgencyDays": 30,
        "items": [
          { "productSlug": "ceramic-wall-tile-30x60-white", "quantity": 200 },
          { "productSlug": "gypsum-board-12-5mm-standard", "quantity": 60 }
        ]
      }
    }
  },
  {
    "id": "rep-002",
    "rfqId": "rfq-008",
    "currentStage": "canceled",
    "canceledReason": "expired",
    "canceledAtHoursAgo": 25,
    "sections": {
      "submitted": {
        "customerName": "Al-Nour Construction",
        "customerTier": "A",
        "contactName": "Hossam El-Din",
        "phone": "+20 2 3760 1188",
        "deliveryAddress": "15 Tahrir Street, Dokki, Giza",
        "deliveryCity": "Giza, Dokki",
        "deliveryUrgencyDays": 20,
        "items": [
          { "productSlug": "galvanized-bolts-m16x100", "quantity": 40 },
          { "productSlug": "clear-float-glass-6mm", "quantity": 80 }
        ]
      }
    }
  },
  {
    "id": "rep-003",
    "rfqId": "rfq-003",
    "currentStage": "evaluated",
    "canceledReason": null,
    "canceledAtHoursAgo": null,
    "sections": {
      "submitted": {
        "customerName": "Pyramid Builders",
        "customerTier": "A",
        "contactName": "Mostafa El-Sayed",
        "phone": "+20 2 3382 4410",
        "deliveryAddress": "8 Tahrir Street, Dokki, Giza",
        "deliveryCity": "Giza, 6th October",
        "deliveryUrgencyDays": 10,
        "items": [
          { "productSlug": "portland-cement-cemi-42-5n", "quantity": 300 },
          { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 4 },
          { "productSlug": "concrete-hollow-blocks-20cm", "quantity": 3000 }
        ]
      },
      "evaluated": {
        "quoteId": "qt-001",
        "quoteNumber": "QT-2026-00523",
        "marginPercent": 18.2,
        "subtotal": 863422,
        "vatAmount": 120879,
        "total": 984301,
        "sentAtHoursAgo": 24,
        "sentVia": "portal",
        "validUntilDaysFromNow": 14
      }
    }
  }
]
```
