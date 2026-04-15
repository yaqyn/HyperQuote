# Suppliers

Canonical supplier registry. Tier, payment terms, and badges live here —
edit a supplier once and it updates everywhere in the app.

Schema: `{ name, tier, paymentTerms, phone, rating (0-5), customBadges[] }`

```json
[
  { "name": "Suez Cement", "tier": "preferred", "paymentTerms": "Net 30", "phone": "+20 2 2735 4001", "rating": 4.6, "customBadges": ["fast-delivery", "quality-certified"] },
  { "name": "Arabian Cement", "tier": "approved", "paymentTerms": "Net 45", "phone": "+20 3 4857 2200", "rating": 4.1, "customBadges": ["bulk-discounts"] },
  { "name": "Sinai Cement", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2510 8877", "rating": 4.0, "customBadges": [] },
  { "name": "Ezz Steel", "tier": "preferred", "paymentTerms": "Net 60", "phone": "+20 2 2461 7000", "rating": 4.7, "customBadges": ["owner-account", "import-agent"] },
  { "name": "Egyptian Steel", "tier": "approved", "paymentTerms": "Net 45", "phone": "+20 55 3344 221", "rating": 4.0, "customBadges": [] },
  { "name": "Nile Sand Works", "tier": "approved", "paymentTerms": "COD", "phone": "+20 2 3840 1177", "rating": 3.9, "customBadges": ["fast-delivery"] },
  { "name": "Attaka Quarries", "tier": "conditional", "paymentTerms": "COD", "phone": "+20 62 3312 005", "rating": 3.4, "customBadges": [] },
  { "name": "Helwan Bricks", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2555 6090", "rating": 3.8, "customBadges": [] },
  { "name": "National Blocks", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2620 4411", "rating": 3.9, "customBadges": [] },
  { "name": "Cleopatra Ceramics", "tier": "preferred", "paymentTerms": "Net 30", "phone": "+20 2 2414 1122", "rating": 4.5, "customBadges": ["bulk-discounts", "quality-certified"] },
  { "name": "Lecico Egypt", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 3 5442 8881", "rating": 4.0, "customBadges": [] },
  { "name": "Jotun Egypt", "tier": "preferred", "paymentTerms": "Net 45", "phone": "+20 2 2565 1020", "rating": 4.5, "customBadges": ["quality-certified"] },
  { "name": "Kalde Egypt", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2772 3311", "rating": 4.0, "customBadges": [] },
  { "name": "El Sewedy Cables", "tier": "preferred", "paymentTerms": "Net 60", "phone": "+20 2 2539 7700", "rating": 4.6, "customBadges": ["owner-account"] },
  { "name": "Bitumode Egypt", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2458 0099", "rating": 4.0, "customBadges": [] },
  { "name": "Cairo Foam", "tier": "conditional", "paymentTerms": "Prepaid", "phone": "+20 2 2501 6633", "rating": 3.2, "customBadges": [] },
  { "name": "Gypsemsr Egypt", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2677 8844", "rating": 4.0, "customBadges": [] },
  { "name": "CEMEX Egypt", "tier": "preferred", "paymentTerms": "Net 45", "phone": "+20 2 2795 0100", "rating": 4.5, "customBadges": ["fast-delivery"] },
  { "name": "Alumisr Industries", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2590 1155", "rating": 3.9, "customBadges": [] },
  { "name": "Sinai Marble", "tier": "approved", "paymentTerms": "Net 45", "phone": "+20 69 3601 884", "rating": 4.1, "customBadges": ["quality-certified"] },
  { "name": "Misr Wood", "tier": "conditional", "paymentTerms": "Net 15", "phone": "+20 2 2413 0099", "rating": 3.3, "customBadges": [] },
  { "name": "Saveto Egypt", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 2 2622 4400", "rating": 4.0, "customBadges": [] },
  { "name": "Saint-Gobain Egypt", "tier": "preferred", "paymentTerms": "Net 45", "phone": "+20 2 2795 7700", "rating": 4.6, "customBadges": ["quality-certified"] },
  { "name": "Import — China", "tier": "new", "paymentTerms": "Prepaid", "phone": null, "rating": 3.5, "customBadges": ["import-agent"] },
  { "name": "Delta Materials", "tier": "new", "paymentTerms": "Prepaid", "phone": "+20 50 2233 880", "rating": 3.6, "customBadges": [] },
  { "name": "Alexandria Trading", "tier": "approved", "paymentTerms": "Net 30", "phone": "+20 3 4875 2299", "rating": 3.9, "customBadges": [] },
  { "name": "Cairo Wholesale Co.", "tier": "conditional", "paymentTerms": "Net 15", "phone": "+20 2 2590 7788", "rating": 3.4, "customBadges": [] }
]
```
