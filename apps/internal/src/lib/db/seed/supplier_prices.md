# Supplier Prices

The live quotes that every surface of the app joins against. Each row is one
supplier-to-product price record. `isPrimary = true` means this is the supplier
the sales quote builder uses by default for that product.

`lastQuotedAtDaysAgo` is rendered into a real ISO timestamp at load time so
seeds stay readable without re-dating by hand.

Schema: `{ productSlug, supplierName, rawCost, leadTimeDays, minOrderQty,
lastQuotedAtDaysAgo, isPrimary, notes }`

```json
[
  { "productSlug": "portland-cement-cemi-42-5n", "supplierName": "Suez Cement", "rawCost": 45.85, "leadTimeDays": 3, "minOrderQty": 50, "lastQuotedAtDaysAgo": 0.25, "isPrimary": true, "notes": null },
  { "productSlug": "portland-cement-cemi-42-5n", "supplierName": "Arabian Cement", "rawCost": 46.20, "leadTimeDays": 4, "minOrderQty": 100, "lastQuotedAtDaysAgo": 6, "isPrimary": false, "notes": "Bulk discounts on qty > 500" },
  { "productSlug": "portland-cement-cemi-42-5n", "supplierName": "Sinai Cement", "rawCost": 47.10, "leadTimeDays": 4, "minOrderQty": 100, "lastQuotedAtDaysAgo": 14, "isPrimary": false, "notes": null },
  { "productSlug": "portland-cement-cemi-42-5n", "supplierName": "CEMEX Egypt", "rawCost": 44.90, "leadTimeDays": 2, "minOrderQty": 200, "lastQuotedAtDaysAgo": 28, "isPrimary": false, "notes": "Truck delivery minimum" },

  { "productSlug": "sulfate-resistant-cement-cem-v", "supplierName": "Suez Cement", "rawCost": 111.22, "leadTimeDays": 5, "minOrderQty": 50, "lastQuotedAtDaysAgo": 0.5, "isPrimary": true, "notes": null },
  { "productSlug": "sulfate-resistant-cement-cem-v", "supplierName": "Arabian Cement", "rawCost": 108.50, "leadTimeDays": 6, "minOrderQty": 100, "lastQuotedAtDaysAgo": 7, "isPrimary": false, "notes": null },
  { "productSlug": "sulfate-resistant-cement-cem-v", "supplierName": "Sinai Cement", "rawCost": 115.00, "leadTimeDays": 5, "minOrderQty": 80, "lastQuotedAtDaysAgo": 30, "isPrimary": false, "notes": null },

  { "productSlug": "steel-rebar-16mm-grade-60", "supplierName": "Ezz Steel", "rawCost": 34150, "leadTimeDays": 7, "minOrderQty": 1, "lastQuotedAtDaysAgo": 1, "isPrimary": true, "notes": null },
  { "productSlug": "steel-rebar-16mm-grade-60", "supplierName": "Egyptian Steel", "rawCost": 33500, "leadTimeDays": 8, "minOrderQty": 2, "lastQuotedAtDaysAgo": 6, "isPrimary": false, "notes": "Secondary account — lower price, longer lead" },
  { "productSlug": "steel-rebar-16mm-grade-60", "supplierName": "Alexandria Trading", "rawCost": 34900, "leadTimeDays": 9, "minOrderQty": 3, "lastQuotedAtDaysAgo": 22, "isPrimary": false, "notes": null },

  { "productSlug": "steel-rebar-10mm-grade-60", "supplierName": "Ezz Steel", "rawCost": 35122, "leadTimeDays": 7, "minOrderQty": 1, "lastQuotedAtDaysAgo": 2, "isPrimary": true, "notes": null },
  { "productSlug": "steel-rebar-10mm-grade-60", "supplierName": "Egyptian Steel", "rawCost": 34800, "leadTimeDays": 8, "minOrderQty": 2, "lastQuotedAtDaysAgo": 12, "isPrimary": false, "notes": null },

  { "productSlug": "welded-wire-mesh-6mm-200x200", "supplierName": "Egyptian Steel", "rawCost": 940, "leadTimeDays": 8, "minOrderQty": 10, "lastQuotedAtDaysAgo": 9, "isPrimary": true, "notes": null },
  { "productSlug": "welded-wire-mesh-6mm-200x200", "supplierName": "Ezz Steel", "rawCost": 965, "leadTimeDays": 7, "minOrderQty": 20, "lastQuotedAtDaysAgo": 14, "isPrimary": false, "notes": null },

  { "productSlug": "crushed-gravel-size-1", "supplierName": "Attaka Quarries", "rawCost": 210, "leadTimeDays": 2, "minOrderQty": 15, "lastQuotedAtDaysAgo": 0.5, "isPrimary": true, "notes": null },
  { "productSlug": "crushed-gravel-size-1", "supplierName": "Nile Sand Works", "rawCost": 220, "leadTimeDays": 3, "minOrderQty": 20, "lastQuotedAtDaysAgo": 8, "isPrimary": false, "notes": null },

  { "productSlug": "washed-sand-fine", "supplierName": "Nile Sand Works", "rawCost": 150, "leadTimeDays": 2, "minOrderQty": 10, "lastQuotedAtDaysAgo": 4, "isPrimary": true, "notes": null },
  { "productSlug": "washed-sand-fine", "supplierName": "Attaka Quarries", "rawCost": 145, "leadTimeDays": 3, "minOrderQty": 20, "lastQuotedAtDaysAgo": 18, "isPrimary": false, "notes": null },

  { "productSlug": "red-clay-bricks-standard", "supplierName": "Helwan Bricks", "rawCost": 1.5, "leadTimeDays": 4, "minOrderQty": 1000, "lastQuotedAtDaysAgo": 0.75, "isPrimary": true, "notes": null },
  { "productSlug": "red-clay-bricks-standard", "supplierName": "National Blocks", "rawCost": 1.55, "leadTimeDays": 5, "minOrderQty": 1500, "lastQuotedAtDaysAgo": 10, "isPrimary": false, "notes": null },

  { "productSlug": "concrete-hollow-blocks-20cm", "supplierName": "National Blocks", "rawCost": 10, "leadTimeDays": 3, "minOrderQty": 500, "lastQuotedAtDaysAgo": 5, "isPrimary": true, "notes": null },
  { "productSlug": "concrete-hollow-blocks-20cm", "supplierName": "Helwan Bricks", "rawCost": 10.8, "leadTimeDays": 4, "minOrderQty": 800, "lastQuotedAtDaysAgo": 11, "isPrimary": false, "notes": null },

  { "productSlug": "porcelain-floor-tile-60x60-beige", "supplierName": "Cleopatra Ceramics", "rawCost": 230, "leadTimeDays": 5, "minOrderQty": 50, "lastQuotedAtDaysAgo": 0.4, "isPrimary": true, "notes": null },
  { "productSlug": "porcelain-floor-tile-60x60-beige", "supplierName": "Lecico Egypt", "rawCost": 218, "leadTimeDays": 7, "minOrderQty": 100, "lastQuotedAtDaysAgo": 8, "isPrimary": false, "notes": null },

  { "productSlug": "ceramic-wall-tile-30x60-white", "supplierName": "Lecico Egypt", "rawCost": 115, "leadTimeDays": 5, "minOrderQty": 40, "lastQuotedAtDaysAgo": 1, "isPrimary": true, "notes": null },
  { "productSlug": "ceramic-wall-tile-30x60-white", "supplierName": "Cleopatra Ceramics", "rawCost": 118, "leadTimeDays": 5, "minOrderQty": 60, "lastQuotedAtDaysAgo": 10, "isPrimary": false, "notes": null },

  { "productSlug": "interior-acrylic-paint-white-18l", "supplierName": "Jotun Egypt", "rawCost": 1400, "leadTimeDays": 4, "minOrderQty": 10, "lastQuotedAtDaysAgo": 1.2, "isPrimary": true, "notes": null },
  { "productSlug": "interior-acrylic-paint-white-18l", "supplierName": "Saveto Egypt", "rawCost": 1350, "leadTimeDays": 5, "minOrderQty": 15, "lastQuotedAtDaysAgo": 9, "isPrimary": false, "notes": null },

  { "productSlug": "pvc-pressure-pipe-110mm-6bar", "supplierName": "Kalde Egypt", "rawCost": 215, "leadTimeDays": 4, "minOrderQty": 20, "lastQuotedAtDaysAgo": 0.5, "isPrimary": true, "notes": null },
  { "productSlug": "pvc-pressure-pipe-110mm-6bar", "supplierName": "Import — China", "rawCost": 190, "leadTimeDays": 30, "minOrderQty": 100, "lastQuotedAtDaysAgo": 25, "isPrimary": false, "notes": "Container-only, long lead" },

  { "productSlug": "copper-cable-3x2-5mm-pvc", "supplierName": "El Sewedy Cables", "rawCost": 3150, "leadTimeDays": 3, "minOrderQty": 5, "lastQuotedAtDaysAgo": 1, "isPrimary": true, "notes": null },

  { "productSlug": "bituminous-membrane-4mm-sbs", "supplierName": "Bitumode Egypt", "rawCost": 425, "leadTimeDays": 4, "minOrderQty": 20, "lastQuotedAtDaysAgo": 1, "isPrimary": true, "notes": null },

  { "productSlug": "expanded-polystyrene-50mm", "supplierName": "Cairo Foam", "rawCost": 45, "leadTimeDays": 3, "minOrderQty": 50, "lastQuotedAtDaysAgo": 0.4, "isPrimary": true, "notes": null },

  { "productSlug": "gypsum-board-12-5mm-standard", "supplierName": "Gypsemsr Egypt", "rawCost": 102, "leadTimeDays": 4, "minOrderQty": 30, "lastQuotedAtDaysAgo": 1, "isPrimary": true, "notes": null },

  { "productSlug": "ready-mix-concrete-c30", "supplierName": "CEMEX Egypt", "rawCost": 2100, "leadTimeDays": 1, "minOrderQty": 6, "lastQuotedAtDaysAgo": 0.2, "isPrimary": true, "notes": "Cairo metro area only" },

  { "productSlug": "aluminum-window-profile-white", "supplierName": "Alumisr Industries", "rawCost": 150, "leadTimeDays": 10, "minOrderQty": 50, "lastQuotedAtDaysAgo": 8, "isPrimary": true, "notes": null },

  { "productSlug": "sinai-pearl-marble-slab", "supplierName": "Sinai Marble", "rawCost": 575, "leadTimeDays": 14, "minOrderQty": 20, "lastQuotedAtDaysAgo": 0.7, "isPrimary": true, "notes": null },

  { "productSlug": "marine-plywood-18mm", "supplierName": "Misr Wood", "rawCost": 550, "leadTimeDays": 6, "minOrderQty": 20, "lastQuotedAtDaysAgo": 8, "isPrimary": true, "notes": null },
  { "productSlug": "marine-plywood-18mm", "supplierName": "Import — China", "rawCost": 495, "leadTimeDays": 40, "minOrderQty": 200, "lastQuotedAtDaysAgo": 22, "isPrimary": false, "notes": null },

  { "productSlug": "tile-adhesive-c2-white-25kg", "supplierName": "Saveto Egypt", "rawCost": 150, "leadTimeDays": 3, "minOrderQty": 40, "lastQuotedAtDaysAgo": 1.2, "isPrimary": true, "notes": null },

  { "productSlug": "clear-float-glass-6mm", "supplierName": "Saint-Gobain Egypt", "rawCost": 150, "leadTimeDays": 5, "minOrderQty": 20, "lastQuotedAtDaysAgo": 1, "isPrimary": true, "notes": null },

  { "productSlug": "galvanized-bolts-m16x100", "supplierName": "Import — China", "rawCost": 340, "leadTimeDays": 30, "minOrderQty": 50, "lastQuotedAtDaysAgo": 9, "isPrimary": true, "notes": "Container minimums apply" }
]
```
