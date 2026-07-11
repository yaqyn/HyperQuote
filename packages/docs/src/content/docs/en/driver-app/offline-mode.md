The driver app is installed as a mobile application and keeps its static interface available after installation. Live assignments, route calculations, chat, location updates, and delivery transitions still require a network connection.

## When connectivity drops

The current screen may remain visible, but the app does not claim that server data is current while offline. Actions that require HyperQuote data stay blocked until the connection returns instead of being queued as if they had been accepted.

Device GPS can continue identifying your location locally, but HyperQuote cannot receive that location until the app reconnects. Do not treat an offline map or previously rendered delivery as a live dispatch instruction.

## Before leaving coverage

- Open the assigned delivery while connected and confirm the destination and contact details.
- Keep the phone charged and location permission enabled.
- Contact dispatch before entering a known low-coverage area when the route or assignment is unclear.
- Use the documented operational fallback from dispatch if the app cannot reconnect.

## After reconnection

Refresh the dashboard before continuing. The app reloads the authoritative assignment and delivery state from HyperQuote, so any reassignment or dispatch update made while you were offline is visible before you submit another transition.
