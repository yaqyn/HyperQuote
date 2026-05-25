import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('portal delivery route map', () => {
	it('renders incoming delivery paths from road-route geometry as a solid blue route', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/routes/_portal/orders.tsx'),
			'utf8',
		)
		const interactiveSource = readFileSync(
			join(
				process.cwd(),
				'src/components/orders/IncomingOrdersInteractiveMap.tsx',
			),
			'utf8',
		)

		expect(source).toContain('resolveRoadRoute')
		expect(source).toContain("const DELIVERY_ROUTE_BLUE = '#2563eb'")
		expect(source).toContain('stroke={line.color}')
		expect(source).toContain('strokeWidth="0.9"')
		expect(source).not.toContain('strokeDasharray')
		expect(source).not.toContain('[driverPoint.lng, driverPoint.lat]')
		expect(interactiveSource).toContain("'line-width': 4.5")
		expect(interactiveSource).toContain("'line-opacity': 0.9")
		expect(interactiveSource).not.toContain("'line-dasharray'")
	})
})
