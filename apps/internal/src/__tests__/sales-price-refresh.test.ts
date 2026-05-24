import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('sales quote price refresh', () => {
	it('patches quote line prices from catalog without resetting the builder', () => {
		const source = readWorkspaceFile(
			'apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx',
		)
		const refreshHandler = source.slice(
			source.indexOf('const handleRefreshQuotePrices'),
			source.indexOf('const handleManualDeliveryAddressChange'),
		)

		expect(source).toContain('function refreshQuoteLineFromCatalog')
		expect(source).toContain('supplierCost: product.supplierCost')
		expect(source).toContain('priceStatus: product.priceStatus')
		expect(source).toContain('Refresh prices')
		expect(refreshHandler).toContain(
			'const catalog = await getProductCatalog({ data: {} })',
		)
		expect(refreshHandler).toContain('replaceItems(refreshedItems)')
		expect(refreshHandler).toContain(
			"queryClient.invalidateQueries({ queryKey: ['sales-outdated-prices'] })",
		)
		expect(refreshHandler).toContain(
			"queryClient.invalidateQueries({ queryKey: ['quote-builder-data'] })",
		)
		expect(refreshHandler).not.toContain('methods.reset')
		expect(refreshHandler).not.toContain('setDeliveryAddress(')
	})
})
