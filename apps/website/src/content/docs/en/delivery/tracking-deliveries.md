Real-time delivery tracking replaces the "call the driver" approach that dominates Egyptian building material logistics. From the moment a truck departs, you and your site team have continuous visibility into its location and estimated arrival.

## GPS tracking

Every delivery vehicle is tracked via GPS with adaptive update intervals. During active delivery, positions update every 5 seconds. While en route between stops, updates come every 15 seconds. When idle, the interval extends to 30 seconds. This adaptive approach balances precision with device battery life.

The tracking map in your customer portal shows the truck's real-time position along its route, with your delivery stop highlighted. For multi-stop routes, you can see where your delivery falls in the sequence and how the preceding stops are progressing.

GPS data is stored in a PostGIS-enabled database partitioned by month, with a separate real-time table for current vehicle positions. This means the dispatch team sees live fleet status while historical routes are preserved for analysis and dispute resolution.

## SMS and WhatsApp notifications

Delivery notifications follow a cascade designed to keep the right people informed at the right time:

- **Order confirmed** — WhatsApp and email to the buyer with order details and expected delivery timeline
- **Out for delivery** — WhatsApp notification with ETA window, driver contact (masked phone number — the driver's personal number is never exposed), and a tracking link
- **Approaching site** — SMS to the site foreman when the truck enters the delivery zone (150-300m geofence radius, sized for the imprecise boundaries of active construction sites)
- **Delivered** — WhatsApp confirmation with proof-of-delivery summary

The notification cascade adapts to channel reliability. WhatsApp is the primary channel (99.5% delivery rate in Egypt). If WhatsApp delivery fails, the system falls back to SMS after 30 seconds, then a voice call after 60 seconds.

## Delivery status updates

Beyond the five main customer-facing stages, the tracking system captures granular events:

- **Loaded and departed** — Truck has left the warehouse or supplier facility
- **In transit** — Detected by GPS movement; live position visible
- **Geofence entry** — Truck has entered the delivery zone around your site
- **Driver check-in** — Manual confirmation of arrival, especially when geofence is imprecise
- **Unloading in progress** — Timer starts for equipment-specific unloading (Moffett, crane, or manual)
- **POD captured** — Photos taken, delivery note signed, quantities confirmed

Each event is timestamped and logged. The dispatch team monitors all active deliveries on a fleet dashboard with color-coded vehicle markers.

## Delivery exceptions

When something goes wrong — customer not available, site access blocked, weather conditions, vehicle breakdown — the driver reports the exception through the app with photo evidence and a categorized reason. The dispatch team is notified immediately and can take action: reroute, reschedule, or contact you to arrange an alternative.

Failed deliveries cost EGP 2,000-6,000+ each, so the platform targets a 93-97% first-attempt success rate. Clear communication through tracking and notifications is the primary tool for achieving this.
