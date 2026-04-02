Building material deliveries take drivers to construction sites in industrial zones, new developments on the city periphery, and areas with unreliable cellular coverage. The driver app is built offline-first — every critical function works without an internet connection, and data syncs automatically when connectivity returns.

## How offline mode works

The app uses a local SQLite database on your device, synchronized with the server through PowerSync technology. Before your shift starts, all delivery data for the day is cached locally: stop addresses, customer contacts, order details, line items, site access notes, and route information.

When you lose connectivity, the app continues functioning normally. You navigate to stops using cached map tiles, view delivery details from local storage, capture proof-of-delivery photos, collect digital signatures, and report exceptions — all without any network connection.

The transition between online and offline is seamless. There is no "offline mode" toggle. The app always reads from local data and writes to a local queue. Whether that queue syncs immediately or waits for connectivity is invisible to you.

## What works offline

Every core delivery function operates offline:

- **Viewing assignments** — All stop details, customer contacts, and order line items are cached at shift start
- **Navigation** — Map tiles for your route area are pre-cached using PMTiles (stored on the device). Turn-by-turn directions work offline once the route is loaded
- **Arrival and check-in** — Geofence detection uses device GPS, not a network call. Manual check-in works regardless of connectivity
- **POD capture** — Photos, signature, line-item confirmation, and damage reporting all save to local storage
- **Exception reporting** — Categorized exceptions with photos queue locally for upload
- **GPS breadcrumbs** — Location data continues recording at the normal adaptive intervals (5-15 second updates) and queues for batch upload

## Sync behavior

When connectivity returns, the app syncs in the background using Capacitor's background task capability. The sync process prioritizes:

1. **Delivery confirmations** — POD data uploads first, since it triggers invoicing on the server side
2. **GPS breadcrumbs** — Queued location data uploads as a batch
3. **Photos** — Compressed images (1920px max, JPEG quality 0.7) upload sequentially to manage bandwidth
4. **Exception reports** — Status updates and exception data sync next
5. **Incoming updates** — New assignments, schedule changes, or dispatch messages download last

Conflict resolution follows a clear rule: the driver is the authority for delivery status (you were at the site, you know what happened), while the dispatcher is the authority for route changes and reassignments.

## Cached data limits

The app caches your current day's deliveries plus essential reference data. It does not attempt to store the entire order database. If you need to look up a historical delivery while offline, that data may not be available until you regain connectivity.

Photos are stored on-device until successfully uploaded. The app manages storage to prevent filling your device — oldest synced photos are cleared automatically while unsynced photos are always preserved.

## What to do if the app fails

If the device itself fails (battery dies, hardware crash), paper backup delivery notes in the truck serve as the fallback. Every HyperQuote delivery truck carries printed manifests. You can also send proof-of-delivery photos via WhatsApp to the dispatch channel as an emergency backup.

The dispatch team monitors driver connectivity. If your device goes "dark" (no GPS signal) for more than 5 minutes, dispatch receives an alert. At 15 minutes, the alert escalates. At 30 minutes, dispatch attempts direct phone contact to verify your status and safety.
