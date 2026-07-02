import { describe, expect, it } from 'vitest'
import { formatPortalReportItemLine } from '../lib/server/deliveries'

describe('portal order report formatting', () => {
	it('uses singular and plural piece labels for report details', () => {
		expect(
			formatPortalReportItemLine({
				productName: 'Wood',
				quantity: 1,
				unitOfMeasure: 'piece',
			}),
		).toBe('Wood: 1 Piece')

		expect(
			formatPortalReportItemLine({
				productName: 'Wood',
				quantity: 100,
				unitOfMeasure: 'piece',
			}),
		).toBe('Wood: 100 Pieces')
	})

	it('leaves other units unchanged', () => {
		expect(
			formatPortalReportItemLine({
				productName: 'Cement',
				quantity: 25,
				unitOfMeasure: 'bag',
			}),
		).toBe('Cement: 25 bag')
	})
})
