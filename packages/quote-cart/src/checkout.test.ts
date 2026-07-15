import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	buildDetailedQuoteLocationName,
	cairoDateString,
	formatQuoteRequestAddress,
	isEgyptMobileInput,
	isValidQuoteDeliveryDate,
	toEgyptMobileInput,
} from './checkout'

describe('quote checkout contract', () => {
	it('normalizes Egyptian mobile numbers without accepting other prefixes', () => {
		assert.equal(toEgyptMobileInput('+20 10 1234 5678'), '1012345678')
		assert.equal(toEgyptMobileInput('01012345678'), '1012345678')
		assert.equal(isEgyptMobileInput('1012345678'), true)
		assert.equal(isEgyptMobileInput('1312345678'), false)
	})

	it('formats delivery addresses without duplicate place names', () => {
		assert.equal(
			formatQuoteRequestAddress({
				area: 'New Cairo',
				city: 'Cairo',
				governorate: 'Cairo',
				street: '90 Street',
			}),
			'90 Street, New Cairo, Cairo',
		)
	})

	it('builds a readable map name without postcode or country-only noise', () => {
		assert.equal(
			buildDetailedQuoteLocationName(
				{
					city: 'New Cairo',
					neighbourhood: 'Mirage City',
					postcode: '11655',
					state: 'Cairo',
				},
				'Mirage City, New Cairo, 11655, Cairo, Egypt',
			),
			'Mirage City, New Cairo, Cairo',
		)
		assert.equal(
			buildDetailedQuoteLocationName(
				{ country: 'Egypt', postcode: '11655' },
				'11655, Egypt',
			),
			'',
		)
	})

	it('uses the Cairo calendar date at the UTC day boundary', () => {
		assert.equal(
			cairoDateString(new Date('2026-07-15T22:30:00.000Z')),
			'2026-07-16',
		)
	})

	it('accepts only future Sunday through Thursday delivery dates', () => {
		const now = new Date('2026-07-15T10:00:00.000Z')
		assert.equal(isValidQuoteDeliveryDate('2026-07-16', now), true)
		assert.equal(isValidQuoteDeliveryDate('2026-07-17', now), false)
		assert.equal(isValidQuoteDeliveryDate('2026-07-18', now), false)
		assert.equal(isValidQuoteDeliveryDate('2026-07-19', now), true)
		assert.equal(isValidQuoteDeliveryDate('2026-07-15', now), false)
		assert.equal(isValidQuoteDeliveryDate('2026-02-31', now), false)
	})
})
