import { describe, expect, it } from 'vitest'
import { isDriverComplianceValid } from '../lib/constraints'
import type { Driver } from '../types/dispatch'

function makeDriver(overrides: Partial<Driver> = {}): Driver {
	return {
		id: 'dr1',
		name: 'Ahmed',
		type: 'INTERNAL',
		phone: '+201234567890',
		vehicleId: 'v1',
		licenseExpiry: '2027-06-01',
		medicalExpiry: '2027-06-01',
		certifications: ['cdl'],
		complianceStatus: 'valid',
		activeRouteId: null,
		available: true,
		...overrides,
	}
}

describe('isDriverComplianceValid', () => {
	it('blocks driver with expired license', () => {
		const driver = makeDriver({ licenseExpiry: '2025-01-01' })
		expect(isDriverComplianceValid(driver)).toBe(false)
	})

	it('allows driver with valid license and medical', () => {
		const driver = makeDriver()
		expect(isDriverComplianceValid(driver)).toBe(true)
	})

	it('allows driver with license expiring within 30 days (still valid)', () => {
		// Set license expiry 15 days from now
		const futureDate = new Date()
		futureDate.setDate(futureDate.getDate() + 15)
		const driver = makeDriver({
			licenseExpiry: futureDate.toISOString().split('T')[0],
		})
		expect(isDriverComplianceValid(driver)).toBe(true)
	})

	it('blocks driver with expired medical', () => {
		const driver = makeDriver({ medicalExpiry: '2025-01-01' })
		expect(isDriverComplianceValid(driver)).toBe(false)
	})
})
