# RFQs

Customer requests for quotes. The sales inbox and the quote builder both
join this table against supplier_prices, so updating a supplier price in
inventory updates every RFQ that references that product automatically.

`createdAtHoursAgo` and `slaHoursFromNow` are rendered to real ISO timestamps
at load time.

Schema: `{ id, customerName, customerTier, contactName, deliveryAddress,
deliveryCity, estimatedValue, lineItemCount, status, assignedRep,
createdAtHoursAgo, slaHoursFromNow, deliveryUrgencyDays, items[] }`

```json
[
  {
    "id": "rfq-001",
    "customerName": "Al-Nour Construction",
    "customerTier": "A",
    "contactName": "Hossam El-Din",
    "deliveryAddress": "15 Tahrir Street, Dokki, Giza",
    "deliveryCity": "Giza, Dokki",
    "estimatedValue": 7500000,
    "lineItemCount": 5,
    "status": "submitted",
    "assignedRep": null,
    "createdAtHoursAgo": 0.5,
    "slaHoursFromNow": 1.5,
    "deliveryUrgencyDays": 5,
    "items": [
      { "productSlug": "portland-cement-cemi-42-5n", "quantity": 500 },
      { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 6 },
      { "productSlug": "concrete-hollow-blocks-20cm", "quantity": 5000 },
      { "productSlug": "marine-plywood-18mm", "quantity": 100 },
      { "productSlug": "washed-sand-fine", "quantity": 60 }
    ]
  },
  {
    "id": "rfq-002",
    "customerName": "Pyramid Builders",
    "customerTier": "A",
    "contactName": "Mostafa El-Sayed",
    "deliveryAddress": "8 Tahrir Street, Dokki, Giza",
    "deliveryCity": "Giza, 6th October",
    "estimatedValue": 4200000,
    "lineItemCount": 5,
    "status": "assigned",
    "assignedRep": "Ahmed Hassan",
    "createdAtHoursAgo": 1,
    "slaHoursFromNow": 1,
    "deliveryUrgencyDays": 7,
    "items": [
      { "productSlug": "sulfate-resistant-cement-cem-v", "quantity": 1200 },
      { "productSlug": "steel-rebar-10mm-grade-60", "quantity": 8 },
      { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 5 },
      { "productSlug": "crushed-gravel-size-1", "quantity": 220 },
      { "productSlug": "bituminous-membrane-4mm-sbs", "quantity": 80 }
    ]
  },
  {
    "id": "rfq-003",
    "customerName": "Pyramid Builders",
    "customerTier": "A",
    "contactName": "Mostafa El-Sayed",
    "deliveryAddress": "8 Tahrir Street, Dokki, Giza",
    "deliveryCity": "Giza, 6th October",
    "estimatedValue": 3200000,
    "lineItemCount": 3,
    "status": "quoted",
    "assignedRep": "Ahmed Hassan",
    "createdAtHoursAgo": 3,
    "slaHoursFromNow": 1,
    "deliveryUrgencyDays": 10,
    "items": [
      { "productSlug": "portland-cement-cemi-42-5n", "quantity": 300 },
      { "productSlug": "steel-rebar-16mm-grade-60", "quantity": 4 },
      { "productSlug": "concrete-hollow-blocks-20cm", "quantity": 3000 }
    ]
  },
  {
    "id": "rfq-004",
    "customerName": "Al-Nour Construction",
    "customerTier": "A",
    "contactName": "Hossam El-Din",
    "deliveryAddress": "15 Tahrir Street, Dokki, Giza",
    "deliveryCity": "Giza, Dokki",
    "estimatedValue": 3500000,
    "lineItemCount": 3,
    "status": "reviewing",
    "assignedRep": "Ahmed Hassan",
    "createdAtHoursAgo": 5,
    "slaHoursFromNow": 3,
    "deliveryUrgencyDays": 12,
    "items": [
      { "productSlug": "sulfate-resistant-cement-cem-v", "quantity": 400 },
      { "productSlug": "welded-wire-mesh-6mm-200x200", "quantity": 50 },
      { "productSlug": "crushed-gravel-size-1", "quantity": 80 }
    ]
  },
  {
    "id": "rfq-005",
    "customerName": "Pyramid Builders",
    "customerTier": "A",
    "contactName": "Mostafa El-Sayed",
    "deliveryAddress": "8 Tahrir Street, Dokki, Giza",
    "deliveryCity": "Giza, 6th October",
    "estimatedValue": 1150000,
    "lineItemCount": 3,
    "status": "awaiting_clarification",
    "assignedRep": "Ahmed Hassan",
    "createdAtHoursAgo": 12,
    "slaHoursFromNow": -4,
    "deliveryUrgencyDays": 21,
    "items": [
      { "productSlug": "porcelain-floor-tile-60x60-beige", "quantity": 450 },
      { "productSlug": "interior-acrylic-paint-white-18l", "quantity": 40 },
      { "productSlug": "tile-adhesive-c2-white-25kg", "quantity": 120 }
    ]
  },
  {
    "id": "rfq-006",
    "customerName": "Maadi Engineering",
    "customerTier": "new",
    "contactName": "Reem Abdelaziz",
    "deliveryAddress": "22 Road 9, Maadi, Cairo",
    "deliveryCity": "Cairo, Maadi",
    "estimatedValue": 180000,
    "lineItemCount": 2,
    "status": "awaiting_clarification",
    "assignedRep": "Omar Khalil",
    "createdAtHoursAgo": 8,
    "slaHoursFromNow": 0,
    "deliveryUrgencyDays": 35,
    "items": [
      { "productSlug": "pvc-pressure-pipe-110mm-6bar", "quantity": 60 },
      { "productSlug": "welded-wire-mesh-6mm-200x200", "quantity": 75 }
    ]
  },
  {
    "id": "rfq-007",
    "customerName": "Maadi Engineering",
    "customerTier": "new",
    "contactName": "Reem Abdelaziz",
    "deliveryAddress": "22 Road 9, Maadi, Cairo",
    "deliveryCity": "Cairo, Maadi",
    "estimatedValue": 420000,
    "lineItemCount": 2,
    "status": "declined",
    "assignedRep": null,
    "createdAtHoursAgo": 18,
    "slaHoursFromNow": -10,
    "deliveryUrgencyDays": 30,
    "items": [
      { "productSlug": "ceramic-wall-tile-30x60-white", "quantity": 200 },
      { "productSlug": "gypsum-board-12-5mm-standard", "quantity": 60 }
    ]
  },
  {
    "id": "rfq-008",
    "customerName": "Al-Nour Construction",
    "customerTier": "A",
    "contactName": "Hossam El-Din",
    "deliveryAddress": "15 Tahrir Street, Dokki, Giza",
    "deliveryCity": "Giza, Dokki",
    "estimatedValue": 650000,
    "lineItemCount": 2,
    "status": "expired",
    "assignedRep": null,
    "createdAtHoursAgo": 25,
    "slaHoursFromNow": -17,
    "deliveryUrgencyDays": 20,
    "items": [
      { "productSlug": "galvanized-bolts-m16x100", "quantity": 40 },
      { "productSlug": "clear-float-glass-6mm", "quantity": 80 }
    ]
  }
]
```
