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
  ,
  {
    "id": "rep-004",
    "rfqId": "rfq-002",
    "currentStage": "warehouse",
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
        "deliveryUrgencyDays": 7,
        "items": [
          { "productSlug": "sulfate-resistant-cement-cem-v", "quantity": 1200 },
          { "productSlug": "steel-rebar-10mm-grade-60", "quantity": 8 },
          { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 5 },
          { "productSlug": "crushed-gravel-size-1", "quantity": 220 },
          { "productSlug": "bituminous-membrane-4mm-sbs", "quantity": 80 }
        ]
      },
      "evaluated": {
        "quoteId": "qt-003",
        "quoteNumber": "QT-2026-00812",
        "marginPercent": 21.0,
        "subtotal": 762800,
        "total": 762800,
        "sentAtHoursAgo": 32,
        "sentVia": "portal",
        "validUntilDaysFromNow": 10
      },
      "finance_partial": {
        "paidAmount": 381400,
        "proofUrl": "bank-transfer-receipt-pyr-2218.pdf",
        "paidAtHoursAgo": 20
      },
      "inventory_orders": {
        "approvedAtHoursAgo": 16,
        "readyItems": 5,
        "totalItems": 5
      },
      "warehouse": {
        "truckAssignments": [
          {
            "truckId": "trk-003",
            "plateNumber": "GIZ-0915",
            "driverName": "Youssef Khaled",
            "capacityTons": 18,
            "itemsLoaded": ["sulfate-resistant-cement-cem-v", "steel-rebar-10mm-grade-60", "steel-rebar-16mm-grade-60", "crushed-gravel-size-1"],
            "assignedAt": "2026-04-15T20:00:00.000Z"
          },
          {
            "truckId": "trk-007",
            "plateNumber": "GIZ-2004",
            "driverName": "Khaled Zaki",
            "capacityTons": 15,
            "itemsLoaded": ["bituminous-membrane-4mm-sbs"],
            "assignedAt": "2026-04-15T20:00:00.000Z"
          }
        ],
        "advisorMarkedReady": true,
        "failedInspections": [],
        "signoff": {
          "advisorName": "Fatma El-Zahraa",
          "qualityPass": true,
          "proofUrl": "signoff-photo-bay02.jpg",
          "securityMethod": "password",
          "securityToken": "1234",
          "signedAt": "2026-04-15T21:00:00.000Z"
        },
        "passedAt": "2026-04-15T21:30:00.000Z"
      }
    }
  }
]
```
