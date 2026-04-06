const CAIRO_BOUNDS = {
  north: 30.22,
  south: 29.85,
  east: 31.52,
  west: 31.05,
}

/**
 * Determine if a delivery falls within the Cairo heavy truck ban window.
 *
 * Cairo Ring Road bans trucks 5+ tons from 6:00 AM to midnight.
 * Night delivery window: midnight-6AM.
 */
export function isCairoTruckBanActive(
  lat: number,
  lng: number,
  vehicleWeightKg: number,
  currentTime: Date = new Date()
): { banned: boolean; nightWindow: boolean; message: string } {
  const inCairo =
    lat >= CAIRO_BOUNDS.south &&
    lat <= CAIRO_BOUNDS.north &&
    lng >= CAIRO_BOUNDS.west &&
    lng <= CAIRO_BOUNDS.east

  const isHeavy = vehicleWeightKg >= 5000

  if (!inCairo || !isHeavy) {
    return { banned: false, nightWindow: false, message: '' }
  }

  const hour = currentTime.getHours()
  const inBanWindow = hour >= 6 && hour < 24 // 6AM-midnight
  const inNightWindow = hour >= 0 && hour < 6 // midnight-6AM

  return {
    banned: inBanWindow,
    nightWindow: inNightWindow,
    message: inBanWindow
      ? 'Cairo truck ban active (6AM-midnight for 5+ ton vehicles)'
      : inNightWindow
        ? 'Night delivery window (midnight-6AM)'
        : '',
  }
}
