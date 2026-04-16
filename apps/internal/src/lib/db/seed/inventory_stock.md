# Inventory Stock

On-hand stock levels per catalog product. The *Stock* tab of the
Procurement panel reads from here. Kept internal (not in `packages/types`)
because this is an operational signal that shouldn't bleed into the public
catalog type.

Schema: `{ productSlug, stockLevel, lowStockThreshold }`

- **stockLevel** — current on-hand quantity (expressed in the product's
  catalog unit of measure). A value of `0` means out of stock.
- **lowStockThreshold** — below this value, the item surfaces a low-stock
  indicator and qualifies for the "only low stock" filter. When the user
  refills via the Refill panel, the agreed delivery quantity should bring
  the level back above the threshold.

Distribution here intentionally spans the full spectrum — out of stock,
critically low, low, comfortable, overstocked — so the UI covers every
edge case at a glance.

```json
[
  { "productSlug": "portland-cement-cemi-42-5n", "stockLevel": 180, "lowStockThreshold": 300 },
  { "productSlug": "sulfate-resistant-cement-cem-v", "stockLevel": 0, "lowStockThreshold": 120 },
  { "productSlug": "ready-mix-concrete-c30", "stockLevel": 95, "lowStockThreshold": 150 },
  { "productSlug": "steel-rebar-10mm-grade-60", "stockLevel": 42, "lowStockThreshold": 80 },
  { "productSlug": "steel-rebar-16mm-grade-60", "stockLevel": 12, "lowStockThreshold": 60 },
  { "productSlug": "welded-wire-mesh-6mm-200x200", "stockLevel": 230, "lowStockThreshold": 100 },
  { "productSlug": "washed-sand-fine", "stockLevel": 410, "lowStockThreshold": 200 },
  { "productSlug": "crushed-gravel-size-1", "stockLevel": 75, "lowStockThreshold": 180 },
  { "productSlug": "red-clay-bricks-standard", "stockLevel": 18400, "lowStockThreshold": 8000 },
  { "productSlug": "concrete-hollow-blocks-20cm", "stockLevel": 1250, "lowStockThreshold": 2000 },
  { "productSlug": "marine-plywood-18mm", "stockLevel": 8, "lowStockThreshold": 40 },
  { "productSlug": "gypsum-board-12-5mm-standard", "stockLevel": 260, "lowStockThreshold": 150 },
  { "productSlug": "ceramic-wall-tile-30x60-white", "stockLevel": 920, "lowStockThreshold": 400 },
  { "productSlug": "porcelain-floor-tile-60x60-beige", "stockLevel": 310, "lowStockThreshold": 250 },
  { "productSlug": "sinai-pearl-marble-slab", "stockLevel": 4, "lowStockThreshold": 12 },
  { "productSlug": "pvc-pressure-pipe-110mm-6bar", "stockLevel": 140, "lowStockThreshold": 60 },
  { "productSlug": "copper-cable-3x2-5mm-pvc", "stockLevel": 0, "lowStockThreshold": 50 },
  { "productSlug": "interior-acrylic-paint-white-18l", "stockLevel": 68, "lowStockThreshold": 120 },
  { "productSlug": "tile-adhesive-c2-white-25kg", "stockLevel": 540, "lowStockThreshold": 300 },
  { "productSlug": "bituminous-membrane-4mm-sbs", "stockLevel": 95, "lowStockThreshold": 200 },
  { "productSlug": "expanded-polystyrene-50mm", "stockLevel": 380, "lowStockThreshold": 150 },
  { "productSlug": "galvanized-bolts-m16x100", "stockLevel": 2800, "lowStockThreshold": 1500 },
  { "productSlug": "aluminum-window-profile-white", "stockLevel": 22, "lowStockThreshold": 60 },
  { "productSlug": "clear-float-glass-6mm", "stockLevel": 0, "lowStockThreshold": 40 }
]
```
