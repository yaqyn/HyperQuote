/**
 * Shared input hardening helpers. Every numeric text field that touches
 * money, stock, or margin flows through these so we get consistent
 * parsing, clamping, and fat-finger guards.
 *
 * Nothing in here should be inlined at call sites — if a new guard turns
 * up, it gets added here once and the whole app benefits.
 */

/** Upper safety cap for raw costs — above this we assume fat-finger. */
const MAX_RAW_COST = 100_000_000

/** Minimum written proof length for supplier price changes. */
export const PRICE_PROOF_ESSAY_MIN = 80

function normalizeDigitGlyphs(raw: string): string {
	return String(raw)
		.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
		.replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
}

/** Keep only base-10 digits. Use for quantities, counts, and unit fields. */
export function normalizeIntegerInput(raw: string): string {
	return normalizeDigitGlyphs(raw).replace(/\D/g, '')
}

/**
 * Keep only digits plus one decimal point. Use for money, margin, weight,
 * and other decimal number fields. Browsers allow `e`, `+`, and `-` in
 * type="number"; text+inputMode+this helper gives stricter operational input.
 */
export function normalizeDecimalInput(raw: string): string {
	const cleaned = normalizeDigitGlyphs(raw).replace(/[^\d.]/g, '')
	const firstDot = cleaned.indexOf('.')
	if (firstDot === -1) return cleaned
	return `${cleaned.slice(0, firstDot + 1)}${cleaned
		.slice(firstDot + 1)
		.replace(/\./g, '')}`
}

/** Keep only numbers and arithmetic operators for calculator fields. */
export function normalizeArithmeticInput(raw: string): string {
	return normalizeDigitGlyphs(raw).replace(/[^0-9+\-*/().\s]/g, '')
}

/**
 * Parse a free-form money string (accepts commas, spaces, dots) into a
 * non-negative float rounded to 2 decimals. Returns `null` on invalid
 * input so the caller can reject the edit outright.
 */
export function sanitizeCost(raw: string): number | null {
	if (raw == null) return null
	const cleaned = normalizeDecimalInput(raw)
	if (!cleaned) return null
	const n = parseFloat(cleaned)
	if (!Number.isFinite(n)) return null
	if (n < 0) return null
	if (n > MAX_RAW_COST) return null
	return Math.round(n * 100) / 100
}

/** Same as sanitizeCost but for integer quantities (units, boxes, bags). */
export function sanitizeIntQty(raw: string): number | null {
	if (raw == null) return null
	const cleaned = normalizeIntegerInput(raw)
	if (!cleaned) return null
	const n = parseInt(cleaned, 10)
	if (!Number.isFinite(n)) return null
	if (n <= 0) return null
	if (n > 10_000_000) return null
	return n
}

/** Minimum proof length — short enough to be fast, long enough to be real. */
export const MIN_PROOF_LENGTH = 10

export function isValidProof(text: string): boolean {
	return text.trim().length >= MIN_PROOF_LENGTH
}

// ─── Text field guards ───────────────────────────────────

/**
 * Real-world email regex. Not RFC-complete (that's impossible) — rejects
 * the 99% of garbage that actually shows up: missing @, missing TLD,
 * spaces, commas, double @, trailing dots.
 */
const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]{2,}$/

export function isValidEmail(raw: string): boolean {
	const trimmed = raw.trim()
	if (!trimmed) return false
	if (trimmed.length > 254) return false
	return EMAIL_RE.test(trimmed)
}

/**
 * Trim and reject empties + obvious junk. Use for any required human-
 * authored text field (company name, product name, contact name) where
 * "  " or "asdf" or "." should not pass.
 */
export function isValidText(
	raw: string,
	minLength = 2,
	maxLength = 200,
): boolean {
	const trimmed = raw.trim()
	if (trimmed.length < minLength) return false
	if (trimmed.length > maxLength) return false
	// Reject strings that are just punctuation or single repeating chars.
	if (/^[.\-_=*#\s]+$/.test(trimmed)) return false
	if (/^(.)\1+$/.test(trimmed)) return false
	return true
}
