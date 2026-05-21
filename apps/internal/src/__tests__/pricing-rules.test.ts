import { describe, expect, it } from 'vitest'
import {
	computeMarginFromSellPrice,
	computeSellPriceFromMargin,
} from '../lib/pricing-math'
import { type MarginThresholds, resolveMarginThreshold } from '../types/sales'

const rules: MarginThresholds[] = [
	{
		absoluteMin: 20,
		bonus: 20,
		categorySlug: null,
		floor: 20,
		productCategory: 'all',
		productSlug: null,
		target: 20,
	},
	{
		absoluteMin: 10,
		bonus: 20,
		categorySlug: 'tree',
		floor: 10,
		productCategory: 'tree',
		productSlug: null,
		target: 15,
	},
	{
		absoluteMin: 18,
		bonus: 20,
		categorySlug: 'tree',
		floor: 18,
		productCategory: 'tree:wood',
		productSlug: 'wood',
		target: 19,
	},
]

describe('resolveMarginThreshold', () => {
	it('uses the global default when no exception matches', () => {
		expect(
			resolveMarginThreshold(rules, {
				categorySlug: 'metal',
				productSlug: 'steel',
			}),
		).toMatchObject({ bonus: 20, floor: 20, target: 20 })
	})

	it('uses category exceptions for every product inside that category', () => {
		expect(
			resolveMarginThreshold(rules, {
				categorySlug: 'tree',
				productSlug: 'timber',
			}),
		).toMatchObject({ bonus: 20, floor: 10, target: 15 })
	})

	it('uses product exceptions before category exceptions', () => {
		expect(
			resolveMarginThreshold(rules, {
				categorySlug: 'tree',
				productSlug: 'wood',
			}),
		).toMatchObject({ bonus: 20, floor: 18, target: 19 })
	})
})

describe('pricing math', () => {
	it('treats sales margin as cost plus markup before VAT', () => {
		expect(computeSellPriceFromMargin(500, 20)).toBe(600)
		expect(computeSellPriceFromMargin(500, 0)).toBe(500)
		expect(
			Math.round(computeSellPriceFromMargin(500, 20) * 0.14 * 100) / 100,
		).toBe(84)
	})

	it('derives saved margins from markup against cost', () => {
		expect(computeMarginFromSellPrice(500, 600)).toBe(20)
		expect(computeMarginFromSellPrice(500, 570)).toBe(14)
	})
})
