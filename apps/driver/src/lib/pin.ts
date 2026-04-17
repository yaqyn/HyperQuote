import { Preferences } from '@capacitor/preferences'

const PIN_KEY = 'hq-pin-hash'

/**
 * Hash a 6-digit PIN using SHA-256. Returns hex string (64 chars).
 */
export async function hashPin(pin: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(pin)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify a PIN against a stored hash.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
	const inputHash = await hashPin(pin)
	return inputHash === hash
}

/**
 * Store hashed PIN in Capacitor Preferences.
 */
export async function storePinHash(hash: string): Promise<void> {
	await Preferences.set({ key: PIN_KEY, value: hash })
}

/**
 * Retrieve stored PIN hash, or null if not set.
 */
export async function getPinHash(): Promise<string | null> {
	const { value } = await Preferences.get({ key: PIN_KEY })
	return value
}

/**
 * Remove stored PIN hash.
 */
export async function clearPinHash(): Promise<void> {
	await Preferences.remove({ key: PIN_KEY })
}
