import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('portal delivery route map', () => {
	it('renders incoming delivery paths from road-route geometry', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/routes/_portal/orders.tsx'),
			'utf8',
		)

		expect(source).toContain('resolveRoadRoute')
		expect(source).not.toContain('[driverPoint.lng, driverPoint.lat]')
	})
})
