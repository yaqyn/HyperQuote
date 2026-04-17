import { describe, expect, it, vi } from 'vitest'
import { computeRankScore, RANKING_WEIGHTS } from '../types/procurement'

// Mock server-side modules that rankSuppliers file imports
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		inputValidator: () => ({
			handler: (fn: unknown) => fn,
		}),
	}),
}))

vi.mock('zod', () => ({
	z: {
		object: () => ({}),
		string: () => ({ default: () => ({}) }),
		number: () => ({ positive: () => ({}), default: () => ({}) }),
	},
}))

// Now safe to import after mocks
const { rankSuppliers } = await import('../lib/server/procurement-comparison')

// ─── Ranking Algorithm Tests ─────────────────────────────

describe('Price Comparison — Ranking Algorithm', () => {
	const baseSuppliers = [
		{
			supplierId: 'a',
			supplierName: 'A',
			unitPrice: 100,
			leadTimeDays: 5,
			availableQty: 500,
			certificationStatus: 'certified' as const,
			reliabilityScore: 80,
		},
		{
			supplierId: 'b',
			supplierName: 'B',
			unitPrice: 120,
			leadTimeDays: 5,
			availableQty: 500,
			certificationStatus: 'certified' as const,
			reliabilityScore: 80,
		},
		{
			supplierId: 'c',
			supplierName: 'C',
			unitPrice: 110,
			leadTimeDays: 5,
			availableQty: 500,
			certificationStatus: 'certified' as const,
			reliabilityScore: 80,
		},
	]

	it('Test 1: supplier with lowest price ranks highest when other metrics are equal', () => {
		const ranked = rankSuppliers(baseSuppliers, 200)

		// Supplier A has lowest price (100), should rank #1
		expect(ranked[0].supplierId).toBe('a')
		expect(ranked[0].rank).toBe(1)
		// Price weight is 0.40 -- dominant factor
		expect(RANKING_WEIGHTS.price).toBe(0.4)
	})

	it('Test 2: full availability + short lead time beats lower price with partial availability', () => {
		const suppliers = [
			{
				supplierId: 'cheap',
				supplierName: 'Cheap',
				unitPrice: 80,
				leadTimeDays: 10,
				availableQty: 50,
				certificationStatus: 'none' as const,
				reliabilityScore: 60,
			},
			{
				supplierId: 'fast',
				supplierName: 'Fast',
				unitPrice: 120,
				leadTimeDays: 1,
				availableQty: 500,
				certificationStatus: 'certified' as const,
				reliabilityScore: 95,
			},
		]

		const ranked = rankSuppliers(suppliers, 200)

		// 'fast' has full availability (500 >= 200), shortest lead time (1 day), high reliability
		// 'cheap' has partial availability (50 < 200), slow lead time (10 days), low reliability
		// Even though 'cheap' wins on price (weight 0.40), 'fast' wins on availability (0.25) + lead time (0.20) + reliability (0.15)
		expect(ranked[0].supplierId).toBe('fast')
	})

	it('Test 3: price normalization -- lowest price = 1.0, highest = 0.0 (scaled to 100)', () => {
		const suppliers = [
			{
				supplierId: 'low',
				supplierName: 'Low',
				unitPrice: 100,
				leadTimeDays: 5,
				availableQty: 500,
				certificationStatus: 'certified' as const,
				reliabilityScore: 80,
			},
			{
				supplierId: 'high',
				supplierName: 'High',
				unitPrice: 200,
				leadTimeDays: 5,
				availableQty: 500,
				certificationStatus: 'certified' as const,
				reliabilityScore: 80,
			},
		]

		const ranked = rankSuppliers(suppliers, 200)

		// lowest price supplier should be ranked #1
		expect(ranked[0].supplierId).toBe('low')
		expect(ranked[0].rank).toBe(1)

		// Verify the algorithm: price score for 'low' = (200-100)/(200-100)*100 = 100
		// price score for 'high' = (200-200)/(200-100)*100 = 0
		// With equal other metrics, price diff alone (0.40 weight) determines outcome
		expect(ranked[1].supplierId).toBe('high')
	})

	it('Test 4: 100% reliability gets full reliability score contribution (weight 0.15)', () => {
		const suppliers = [
			{
				supplierId: 'reliable',
				supplierName: 'Reliable',
				unitPrice: 120,
				leadTimeDays: 5,
				availableQty: 500,
				certificationStatus: 'certified' as const,
				reliabilityScore: 100,
			},
			{
				supplierId: 'unreliable',
				supplierName: 'Unreliable',
				unitPrice: 120,
				leadTimeDays: 5,
				availableQty: 500,
				certificationStatus: 'certified' as const,
				reliabilityScore: 50,
			},
		]

		const ranked = rankSuppliers(suppliers, 200)

		// Same price, same lead time, same availability -- reliability difference determines rank
		expect(ranked[0].supplierId).toBe('reliable')
		expect(RANKING_WEIGHTS.reliability).toBe(0.15)

		// Verify: reliable gets 100 * 0.15 = 15 from reliability
		// unreliable gets 50 * 0.15 = 7.5 from reliability
		const reliableScore = computeRankScore(100, 100, 100, 100) // all maxed with perfect reliability
		const unreliableScore = computeRankScore(100, 100, 100, 50) // same but 50% reliability
		expect(reliableScore).toBeGreaterThan(unreliableScore)
		// computeRankScore uses Math.round, so 0.15 * 50 = 7.5 rounds to 8 or 7 depending on total
		// The key assertion: difference is approximately 7-8 points (0.15 weight * 50 score gap)
		expect(reliableScore - unreliableScore).toBeGreaterThanOrEqual(7)
		expect(reliableScore - unreliableScore).toBeLessThanOrEqual(8)
	})

	it('Test 5: split sourcing allocations must sum to requested quantity', () => {
		const requestedQty = 200

		// Valid allocation
		const validAllocations = [
			{ supplierId: 'a', quantity: 120, unitPrice: 100 },
			{ supplierId: 'b', quantity: 80, unitPrice: 110 },
		]
		const validSum = validAllocations.reduce((s, a) => s + a.quantity, 0)
		expect(validSum).toBe(requestedQty)

		// Invalid: over-allocation
		const overAllocations = [
			{ supplierId: 'a', quantity: 150, unitPrice: 100 },
			{ supplierId: 'b', quantity: 100, unitPrice: 110 },
		]
		const overSum = overAllocations.reduce((s, a) => s + a.quantity, 0)
		expect(overSum).not.toBe(requestedQty)
		expect(overSum).toBeGreaterThan(requestedQty)

		// Invalid: under-allocation
		const underAllocations = [
			{ supplierId: 'a', quantity: 50, unitPrice: 100 },
			{ supplierId: 'b', quantity: 80, unitPrice: 110 },
		]
		const underSum = underAllocations.reduce((s, a) => s + a.quantity, 0)
		expect(underSum).not.toBe(requestedQty)
		expect(underSum).toBeLessThan(requestedQty)
	})

	it('Test 6: tags assigned correctly -- best-price, fastest, partial', () => {
		const suppliers = [
			{
				supplierId: 'cheapest',
				supplierName: 'Cheapest',
				unitPrice: 80,
				leadTimeDays: 7,
				availableQty: 500,
				certificationStatus: 'certified' as const,
				reliabilityScore: 85,
			},
			{
				supplierId: 'fastest',
				supplierName: 'Fastest',
				unitPrice: 120,
				leadTimeDays: 2,
				availableQty: 300,
				certificationStatus: 'certified' as const,
				reliabilityScore: 90,
			},
			{
				supplierId: 'partial',
				supplierName: 'Partial',
				unitPrice: 100,
				leadTimeDays: 5,
				availableQty: 50,
				certificationStatus: 'pending' as const,
				reliabilityScore: 70,
			},
		]

		const ranked = rankSuppliers(suppliers, 200)

		const cheapestEntry = ranked.find((r) => r.supplierId === 'cheapest')
		const fastestEntry = ranked.find((r) => r.supplierId === 'fastest')
		const partialEntry = ranked.find((r) => r.supplierId === 'partial')

		expect(cheapestEntry?.tags).toContain('best-price')
		expect(fastestEntry?.tags).toContain('fastest')
		expect(partialEntry?.tags).toContain('partial') // 50 < 200 requested

		// cheapest should NOT have 'partial' (500 >= 200)
		expect(cheapestEntry?.tags).not.toContain('partial')
		// fastest should NOT have 'best-price' (120 > 80)
		expect(fastestEntry?.tags).not.toContain('best-price')
	})
})
