import { describe, expect, it } from 'vitest'
import { toCustomerAddress } from './addresses'

describe('portal customer addresses', () => {
	it('normalizes nullable legacy areas before they reach shared address UI', () => {
		expect(
			toCustomerAddress({
				area: null,
				city: 'Giza',
				governorate: 'Giza',
				id: 'address-1',
				is_default: true,
				label: 'Site',
				landmark: null,
				latitude: 30.01,
				longitude: 31.2,
				phone: null,
				street: 'Tahrir Street',
			}),
		).toEqual({
			area: '',
			city: 'Giza',
			governorate: 'Giza',
			id: 'address-1',
			isDefault: true,
			label: 'Site',
			landmark: null,
			latitude: 30.01,
			longitude: 31.2,
			phone: null,
			street: 'Tahrir Street',
		})
	})
})
