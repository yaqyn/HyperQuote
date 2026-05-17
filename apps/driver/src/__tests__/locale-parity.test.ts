import { describe, expect, it } from 'vitest'
import arDriver from '../locales/ar/driver.json'
import enDriver from '../locales/en/driver.json'

describe('driver locale parity', () => {
	it('keeps Arabic and English driver locale keys aligned', () => {
		expect(flattenKeys(arDriver).sort()).toEqual(flattenKeys(enDriver).sort())
	})
})

function flattenKeys(value: unknown, prefix = ''): string[] {
	if (!isRecord(value)) return [prefix]

	return Object.entries(value).flatMap(([key, child]) =>
		flattenKeys(child, prefix ? `${prefix}.${key}` : key),
	)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
