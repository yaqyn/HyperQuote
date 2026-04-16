# Deals

A **deal** is what happens after procurement picks up the phone with a
supplier and agrees on a refill. It captures:

- The product + supplier + quantity the phone call committed to
- The raw cost the supplier offered on that call (this becomes the live
  price immediately, since the deal IS the quote)
- A status that drives the downstream pipeline:

  ```
  pending_finance → approved_by_finance → approved_for_warehouse → delivered → closed
  ```

The Stock tab spawns these. The upcoming Finance *Deals & Orders* tab will
read them as the incoming partial-payment queue, and the Warehouse panel
will read them once finance signs off.

Schema:
`{ id, productSlug, supplierName, agreedQty, agreedRawCost, status, notes?, createdAtHoursAgo }`

Seed starts empty — deals are only created via the Refill flow at runtime.

```json
[]
```
