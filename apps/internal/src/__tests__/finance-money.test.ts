import { describe, expect, it } from 'vitest'
import { formatDecimalEgp } from '../components/shared/formatters'

describe('finance money display', () => {
	it('preserves piaster precision for small customer payments', () => {
		const totalDue = 1.37
		const partial = Math.round(totalDue * 0.5 * 100) / 100
		const remaining = Math.round((totalDue - partial) * 100) / 100

		expect(formatDecimalEgp(totalDue)).toBe('1.37')
		expect(formatDecimalEgp(partial)).toBe('0.69')
		expect(formatDecimalEgp(remaining)).toBe('0.68')
	})

	it('does not render negative zero for empty outward movements', () => {
		expect(formatDecimalEgp(-0)).toBe('0.00')
	})
})
