A delivery driver's day is a sequence of loading, driving, unloading, and documenting — repeated across 4-8 stops depending on equipment type and route complexity. The driver app guides you through each step with minimal cognitive load and large, glove-friendly controls.

## Viewing your assignments

After completing the shift start process, the **Home Dashboard** shows today's delivery summary: total stops, first stop preview, total weight, and a "Start Route" button. The **Route Overview** screen displays all stops on a map with numbered pins, color-coded by status (pending, in progress, completed, problem).

You can switch between map and list views. Each stop shows the customer's delivery address, the site foreman's first name and phone number (masked — your personal number is never exposed to the customer), order items with quantities, the unloading method required, and any site access notes or photos from previous deliveries.

Internal drivers see their assignments already confirmed by dispatch. Contracted drivers see delivery offers with a payout amount and a 30-minute acceptance window. On-demand drivers browse and claim available jobs from a pool.

## Loading and departure

Before departing, you verify the load at the warehouse:

1. **Barcode scan** each item against the delivery manifest
2. **Weight check** against the manifest weight (onboard scales or platform scale at warehouse exit)
3. **Photo documentation** of the secured load
4. **Sign-off** — You and the warehouse worker both confirm the load is correct and secured

The app transitions your status to "Preparing" during loading. When you depart, GPS movement detection triggers the transition to "In Transit" automatically.

## Navigation

Tapping "Navigate" on any stop launches truck-safe routing through Sygic or HERE — not Google Maps or Waze, which lack truck profiles for height, weight, and road restrictions. Truck-safe routing is critical for building material deliveries: a 40-ton truck loaded with steel cannot take the same routes as a passenger car.

For Cairo night deliveries (midnight to 6AM, required for heavy vehicles due to the Ring Road ban), the navigation accounts for truck-restricted corridors and the reduced traffic conditions.

## At the delivery site

When you arrive, the app detects your presence via geofencing (150-300m radius around the delivery address) or you check in manually. The **Arrival** screen shows customer contact, unloading method, and any site-specific instructions.

The unloading process depends on equipment:
- **Moffett** — Self-unloading with the truck-mounted forklift, 6-10 stops per day typical
- **Boom truck** — Crane-assisted for rooftop or elevated deliveries, 3-6 stops per day
- **Manual** — Customer provides site labor or equipment

An unloading timer tracks duration for operational analysis.

## Completing a delivery

After unloading, the **POD Capture** screen walks you through:

1. **Photos** — Delivered materials as placed, signed delivery note, packaging condition, overall site view. All photos are GPS-tagged and timestamped automatically.
2. **Digital signature** — The site foreman signs on your device screen.
3. **Line-item confirmation** — Check off each product with the delivered quantity. Note any discrepancies.
4. **Damage checkbox** — Flag any items damaged during transit or unloading with photos and categorized description.

Submitting the POD syncs immediately if connected, or queues for background upload if offline.

## End of day

After completing all stops, the **End of Day** screen shows your shift summary: deliveries completed, total distance, exceptions reported, and any returns. You complete a post-trip vehicle inspection, record the ending odometer, and sign off. Returns from failed or partial deliveries are processed through a separate returns workflow.
