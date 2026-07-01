import { describe, expect, it } from 'vitest'
import { determineApprovalChain } from '../components/sales/quote-builder/ApprovalWorkflow'
import type { MarginThresholds } from '../types/sales'

const thresholds: MarginThresholds[] = [
	{
		absoluteMin: 10,
		bonus: 20,
		categorySlug: null,
		floor: 20,
		productCategory: 'all',
		productSlug: null,
		target: 25,
	},
]

describe('determineApprovalChain', () => {
	it('keeps high-value approval chains on sales manager, director, and CEO', () => {
		const result = determineApprovalChain(30, 55_000_000, thresholds)

		expect(result.highestRole).toBe('ceo')
		expect(result.chain.map((entry) => entry.role)).toEqual([
			'sales_manager',
			'director',
			'ceo',
		])
		expect(result.chain.map((entry) => entry.role)).not.toContain('vp_sales')
	})

	it('keeps VP Sales approval tied to below-floor margin pressure', () => {
		const result = determineApprovalChain(15, 500_000, thresholds)

		expect(result.highestRole).toBe('vp_sales')
		expect(result.chain.map((entry) => entry.role)).toEqual(['vp_sales'])
		expect(result.summaryLabel).toBe('VP Sales approval required')
	})
})
