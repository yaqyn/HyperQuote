/**
 * Shared input hardening helpers. Every numeric text field that touches
 * money, stock, or margin flows through these so we get consistent
 * parsing, clamping, and fat-finger guards.
 *
 * Nothing in here should be inlined at call sites — if a new guard turns
 * up, it gets added here once and the whole app benefits.
 */

/** The smallest relative change we'll still ask the user to confirm. */
const MIN_CONFIRM_DELTA_RATIO = 0.01 // 1%

/** Above this relative change in either direction, proof is required. */
const LARGE_CHANGE_THRESHOLD = 0.25 // 25%

/** Upper safety cap for raw costs — above this we assume fat-finger. */
const MAX_RAW_COST = 100_000_000

/** Upper safety cap for margin percent. */
export const MAX_MARGIN_PCT = 80

/**
 * Parse a free-form money string (accepts commas, spaces, dots) into a
 * non-negative float rounded to 2 decimals. Returns `null` on invalid
 * input so the caller can reject the edit outright.
 */
export function sanitizeCost(raw: string): number | null {
	if (raw == null) return null
	const cleaned = String(raw).replace(/[,\s]/g, '').trim()
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
	const cleaned = String(raw).replace(/[,\s]/g, '').trim()
	if (!cleaned) return null
	const n = parseInt(cleaned, 10)
	if (!Number.isFinite(n)) return null
	if (n <= 0) return null
	if (n > 10_000_000) return null
	return n
}

/** Same, but lets decimal quantities through (tons, m³, etc.) */
function sanitizeQty(raw: string): number | null {
	const cost = sanitizeCost(raw)
	if (cost == null || cost <= 0) return null
	return cost
}

/** Clamp a margin percentage into the system-safe band. */
export function clampMargin(raw: number, min: number): number {
	if (!Number.isFinite(raw)) return min
	return Math.max(min, Math.min(MAX_MARGIN_PCT, Math.round(raw * 10) / 10))
}

export type ProofReason = 'decrease' | 'large-change' | null

/**
 * Decide whether a cost change needs a written justification before it
 * can be committed. Decreases always do — that's procurement's favorite
 * disaster vector (typo, wrong product, forgotten VAT). Large jumps in
 * either direction also do, because they tend to be either a big real
 * negotiation (worth recording) or a fat-finger (worth catching).
 */
export function proofNeededFor(oldCost: number, newCost: number): ProofReason {
	if (oldCost <= 0) return null // first-time price, nothing to compare against
	if (!Number.isFinite(newCost) || newCost <= 0) return null
	if (newCost < oldCost) return 'decrease'
	const deltaPct = Math.abs((newCost - oldCost) / oldCost)
	if (deltaPct > LARGE_CHANGE_THRESHOLD) return 'large-change'
	return null
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
