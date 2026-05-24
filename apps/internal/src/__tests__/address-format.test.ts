import { describe, expect, it } from 'vitest'
import {
	formatSupabaseAddress,
	isSalesQuoteAddress,
	normalizeAddressText,
} from '../lib/server/address-format'

describe('internal address formatting', () => {
	it('deduplicates repeated location parts from map/provider addresses', () => {
		expect(normalizeAddressText('Street, Cairo, Cairo, Cairo')).toBe(
			'Street, Cairo',
		)
		expect(
			formatSupabaseAddress({
				area: 'Cairo',
				city: 'Cairo',
				governorate: 'Cairo',
				landmark: null,
				street: 'Street',
			}),
		).toBe('Street, Cairo')
	})

	it('identifies sales-owned quote addresses only', () => {
		expect(isSalesQuoteAddress({ label: 'Sales quote site' })).toBe(true)
		expect(isSalesQuoteAddress({ label: 'Default' })).toBe(false)
		expect(isSalesQuoteAddress(null)).toBe(false)
	})
})
