import { AppLauncher } from '@capacitor/app-launcher'

type NavApp = 'sygic' | 'here' | null

/**
 * Check which truck-safe navigation app is installed.
 * Prefers Sygic, falls back to HERE. Returns null if neither installed.
 * NOT Google Maps -- spec forbids it (no truck profiles).
 */
export async function getAvailableNavApp(): Promise<NavApp> {
  try {
    const sygic = await AppLauncher.canOpenUrl({ url: 'com.sygic.aura://' })
    if (sygic.value) return 'sygic'
  } catch {
    /* not installed */
  }

  try {
    const here = await AppLauncher.canOpenUrl({ url: 'here-route://' })
    if (here.value) return 'here'
  } catch {
    /* not installed */
  }

  return null
}

/**
 * Launch Sygic or HERE with destination coordinates.
 * Returns true if launched, false if neither app is installed.
 */
export async function launchNavigation(
  lat: number,
  lng: number,
  label?: string
): Promise<boolean> {
  const app = await getAvailableNavApp()

  if (app === 'sygic') {
    await AppLauncher.openUrl({
      url: `com.sygic.aura://coordinate|${lng}|${lat}|drive`,
    })
    return true
  }

  if (app === 'here') {
    const name = encodeURIComponent(label ?? 'Delivery')
    await AppLauncher.openUrl({
      url: `https://share.here.com/r/${lat},${lng},${name}`,
    })
    return true
  }

  return false
}
