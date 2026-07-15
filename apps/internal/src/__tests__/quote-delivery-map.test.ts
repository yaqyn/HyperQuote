import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('quote delivery location', () => {
	it('keeps address entry map-only and hydrates the stored coordinates', () => {
		const terms = readWorkspaceFile(
			'apps/internal/src/components/sales/quote-builder/DeliveryTerms.tsx',
		)
		const map = readWorkspaceFile(
			'apps/internal/src/components/sales/quote-builder/DeliveryMap.tsx',
		)
		const builder = readWorkspaceFile(
			'apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx',
		)

		expect(terms).not.toContain('delivery-address-manual')
		expect(terms).not.toContain('Manual address')
		expect(map).toContain(
			'coordinates: { latitude: number; longitude: number } | null',
		)
		expect(map).toContain('setMarkerPos(')
		expect(map).not.toContain('address text → map position')
		expect(map).toContain(
			'The interactive map is required to change the delivery point.',
		)
		expect(builder).toContain('coordinates={deliveryCoordinates}')
		expect(builder).toContain('Select the exact delivery point on the map')
	})
})
