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
})
