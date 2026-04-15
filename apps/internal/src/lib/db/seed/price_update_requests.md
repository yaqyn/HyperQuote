# Price update requests

Sales reps ping inventory when an RFQ references a product whose price is
outdated. The inventory employee sees the queue in the product cards and
in the supplier profile view. Updating the primary quote for the product
auto-resolves any pending requests.

`requestedAtHoursAgo` is rendered to a real ISO timestamp at load time.

Schema: `{ id, productSlug, customerContext, requestedAtHoursAgo, status }`

```json
[
  { "id": "pur-seed-1", "productSlug": "concrete-hollow-blocks-20cm", "customerContext": "Al-Nour Construction", "requestedAtHoursAgo": 2, "status": "pending" },
  { "id": "pur-seed-2", "productSlug": "washed-sand-fine", "customerContext": "Al-Nour Construction", "requestedAtHoursAgo": 2, "status": "pending" },
  { "id": "pur-seed-3", "productSlug": "porcelain-floor-tile-60x60-beige", "customerContext": "Delta Cement Co.", "requestedAtHoursAgo": 5, "status": "pending" },
  { "id": "pur-seed-4", "productSlug": "pvc-pressure-pipe-110mm-6bar", "customerContext": "Maadi Engineering", "requestedAtHoursAgo": 8, "status": "pending" }
]
```
