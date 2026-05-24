import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('dispatch route map', () => {
	it('renders live truck paths from road-route geometry', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/components/dispatch/DispatchMap.tsx'),
			'utf8',
		)

		expect(source).toContain('resolveRoadRoute')
		expect(source).not.toContain('[position.lng, position.lat]')
	})

	it('renders dispatch road highlights as solid blue lines', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/components/dispatch/DispatchMap.tsx'),
			'utf8',
		)

		expect(source).toContain("const DISPATCH_ROUTE_BLUE = '#1D4ED8'")
		expect(source).toContain('const DISPATCH_ROUTE_LINE_WIDTH = 5')
		expect(source).toContain("'line-color': DISPATCH_ROUTE_BLUE")
		expect(source).toContain("'line-width': DISPATCH_ROUTE_LINE_WIDTH")
		expect(source).toContain('stroke={DISPATCH_ROUTE_BLUE}')
		expect(source).toContain('strokeWidth={DISPATCH_ROUTE_LINE_WIDTH}')
		expect(source).not.toContain("'line-dasharray'")
		expect(source).not.toContain('strokeDasharray=')
	})

	it('uses high-contrast colors for delivery and truck markers', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/components/dispatch/DispatchMap.tsx'),
			'utf8',
		)

		expect(source).toContain("const DISPATCH_DELIVERY_ORANGE = '#EA580C'")
		expect(source).toContain("const DISPATCH_OVERDUE_RED = '#7F1D1D'")
	})
})
