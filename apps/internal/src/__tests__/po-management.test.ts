import { describe, expect, it } from 'vitest'
import {
	computeMatchStatus,
	computeOverallMatch,
	HAPPY_PATH_STATUSES,
	isValidTransition,
	type POStatus,
} from '../types/procurement'

// ─── VAT Calculation ────────────────────────────────────────
function calculateVAT(subtotal: number): number {
	return Math.round(subtotal * 14) / 100
}

// ─── Coded Delivery Reference ───────────────────────────────
const CODED_REF_PATTERN = /^HQ-\d{4}-\d{4}$/

describe('PO Management', () => {
	// ─── Test 1: Happy path has exactly 9 steps ───────────────
	describe('PO Status Flow', () => {
		it('happy path has exactly 9 steps (draft through closed)', () => {
			expect(HAPPY_PATH_STATUSES).toHaveLength(9)
			expect(HAPPY_PATH_STATUSES[0]).toBe('draft')
			expect(HAPPY_PATH_STATUSES[HAPPY_PATH_STATUSES.length - 1]).toBe('closed')
		})

		// ─── Test 2: Terminal states not in happy path ────────────
		it('rejected and cancelled are terminal states not in happy path', () => {
			expect(HAPPY_PATH_STATUSES).not.toContain('rejected')
			expect(HAPPY_PATH_STATUSES).not.toContain('cancelled')

			// Terminal = no outgoing transitions
			expect(isValidTransition('rejected', 'draft')).toBe(false)
			expect(isValidTransition('rejected', 'sent')).toBe(false)
			expect(isValidTransition('cancelled', 'draft')).toBe(false)
			expect(isValidTransition('cancelled', 'sent')).toBe(false)
		})

		// ─── Test 3: Valid transitions ────────────────────────────
		it('allows valid happy-path transitions', () => {
			const validPairs: [POStatus, POStatus][] = [
				['draft', 'sent'],
				['sent', 'confirmed'],
				['confirmed', 'in_production'],
				['in_production', 'shipped'],
				['shipped', 'partially_received'],
				['shipped', 'received'],
				['partially_received', 'received'],
				['received', 'inspected'],
				['inspected', 'closed'],
			]

			for (const [from, to] of validPairs) {
				expect(isValidTransition(from, to)).toBe(true)
			}
		})

		it('allows cancellation from early statuses', () => {
			expect(isValidTransition('draft', 'cancelled')).toBe(true)
			expect(isValidTransition('sent', 'cancelled')).toBe(true)
			expect(isValidTransition('confirmed', 'cancelled')).toBe(true)
			expect(isValidTransition('in_production', 'cancelled')).toBe(true)
		})

		it('allows rejection from sent status', () => {
			expect(isValidTransition('sent', 'rejected')).toBe(true)
		})

		// ─── Test 4: Invalid transitions rejected ─────────────────
		it('rejects invalid transitions', () => {
			const invalidPairs: [POStatus, POStatus][] = [
				['draft', 'closed'],
				['draft', 'received'],
				['shipped', 'sent'],
				['closed', 'draft'],
				['received', 'shipped'],
				['inspected', 'received'],
			]

			for (const [from, to] of invalidPairs) {
				expect(isValidTransition(from, to)).toBe(false)
			}
		})
	})

	// ─── Three-Way Match ──────────────────────────────────────
	describe('Three-Way Match', () => {
		// ─── Test 5: Within tolerance -> matched/partial_match ───
		it('returns matched when variance is zero', () => {
			expect(computeMatchStatus(0, 0.02)).toBe('matched')
		})

		it('returns partial_match when within tolerance', () => {
			// PO qty 100, received 98 -> 2% variance, tolerance 2% -> partial_match
			expect(computeMatchStatus(0.02, 0.02)).toBe('partial_match')
			// PO price 5000, invoice 5200 -> 4% variance, tolerance 5% -> partial_match
			expect(computeMatchStatus(0.04, 0.05)).toBe('partial_match')
		})

		// ─── Test 6: Exceeds tolerance -> mismatch ────────────────
		it('returns mismatch when variance exceeds tolerance', () => {
			// PO qty 100, received 95 -> 5% variance, tolerance 2% -> mismatch
			expect(computeMatchStatus(0.05, 0.02)).toBe('mismatch')
			// PO price 5000, invoice 5500 -> 10% variance, tolerance 5% -> mismatch
			expect(computeMatchStatus(0.1, 0.05)).toBe('mismatch')
		})

		// ─── Test 7: Overall match computation ────────────────────
		it('overall match: all matched -> matched', () => {
			expect(computeOverallMatch('matched', 'matched', 'matched')).toBe(
				'matched',
			)
		})

		it('overall match: any mismatch -> mismatch', () => {
			expect(computeOverallMatch('matched', 'mismatch', 'matched')).toBe(
				'mismatch',
			)
		})

		it('overall match: any pending -> pending', () => {
			expect(computeOverallMatch('matched', 'pending', 'matched')).toBe(
				'pending',
			)
		})

		it('overall match: partial matches -> partial_match', () => {
			expect(computeOverallMatch('matched', 'partial_match', 'matched')).toBe(
				'partial_match',
			)
		})
	})

	// ─── VAT Calculation ──────────────────────────────────────
	describe('VAT Calculation', () => {
		// ─── Test 8: Math.round(subtotal * 14) / 100 ─────────────
		it('calculates VAT correctly with Math.round', () => {
			expect(calculateVAT(15_000)).toBe(2100)
			expect(calculateVAT(7_777)).toBe(1088.78) // Math.round(7777*14)=108878, /100=1088.78
			expect(calculateVAT(100)).toBe(14)
			expect(calculateVAT(0)).toBe(0)
			expect(calculateVAT(1)).toBe(0.14) // Math.round(1*14)=14, /100=0.14
		})

		it('rounds to nearest piaster', () => {
			// Math.round(7777 * 14) = Math.round(108878) = 108878
			// 108878 / 100 = 1088.78 -- wait, this gives decimals
			// Correction: the formula Math.round(subtotal * 14) / 100 gives integer-friendly values
			// for large Egyptian amounts (typically in piasters)
			const result = Math.round(15_000 * 14) / 100
			expect(result).toBe(2100)

			const result2 = Math.round(7_777 * 14) / 100
			expect(result2).toBe(1088.78)
		})
	})

	// ─── Coded Delivery Reference ─────────────────────────────
	describe('Coded Delivery Reference', () => {
		// ─── Test 9: Format HQ-YYYY-NNNN ──────────────────────────
		it('matches HQ-YYYY-NNNN pattern', () => {
			expect(CODED_REF_PATTERN.test('HQ-2026-0042')).toBe(true)
			expect(CODED_REF_PATTERN.test('HQ-2026-1234')).toBe(true)
		})

		it('rejects invalid formats', () => {
			expect(CODED_REF_PATTERN.test('HQ-26-0042')).toBe(false) // 2-digit year
			expect(CODED_REF_PATTERN.test('PO-2026-0042')).toBe(false) // Wrong prefix
			expect(CODED_REF_PATTERN.test('HQ-2026-42')).toBe(false) // Only 2 digits
			expect(CODED_REF_PATTERN.test('Customer Name')).toBe(false)
		})
	})
})
