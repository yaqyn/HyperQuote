import { describe, expect, it } from 'vitest'
import { isCairoTruckBanActive } from './truck-ban'

describe('isCairoTruckBanActive', () => {
	it('returns banned=true for heavy truck in Cairo during ban window', () => {
		const result = isCairoTruckBanActive(
			30.05,
			31.25,
			6000,
			new Date('2026-04-06T10:00:00'),
		)
		expect(result.banned).toBe(true)
		expect(result.nightWindow).toBe(false)
	})

	it('returns banned=false, nightWindow=true for heavy truck in Cairo during night window', () => {
		const result = isCairoTruckBanActive(
			30.05,
			31.25,
			6000,
			new Date('2026-04-06T03:00:00'),
		)
		expect(result.banned).toBe(false)
		expect(result.nightWindow).toBe(true)
	})

	it('returns banned=false for heavy truck outside Cairo during ban window', () => {
		const result = isCairoTruckBanActive(
			31.0,
			32.0,
			6000,
			new Date('2026-04-06T10:00:00'),
		)
		expect(result.banned).toBe(false)
	})

	it('returns banned=false for light truck in Cairo during ban window', () => {
		const result = isCairoTruckBanActive(
			30.05,
			31.25,
			3000,
			new Date('2026-04-06T10:00:00'),
		)
		expect(result.banned).toBe(false)
	})
})
