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
		const windowHeader = readWorkspaceFile(
			'apps/internal/src/components/shell/WindowHeader.tsx',
		)
		const salesStore = readWorkspaceFile('apps/internal/src/stores/sales.ts')
		const refreshHandler = source.slice(
			source.indexOf('const handleRefreshQuotePrices'),
			source.indexOf('const handleMappedDeliveryAddressChange'),
		)

		expect(source).toContain('function refreshQuoteLineFromCatalog')
		expect(source).toContain('supplierCost: product.supplierCost')
		expect(source).toContain('priceStatus: product.priceStatus')
		expect(source).toContain('function AddQuoteLineCard')
		expect(source).toContain(
			'<AddQuoteLineCard onAdd={() => setSearchOpen(true)} />',
		)
		expect(source).toContain('PRICE_REFRESH_INTERVAL_MS = 10_000')
		expect(source).toContain('window.setInterval')
		expect(source).toContain('void handleRefreshQuotePrices({ silent: true })')
		expect(source).toContain('setQuotePriceRefreshHandler')
		expect(source).toContain('setQuotePriceRefreshStatus')
		expect(windowHeader).toContain('aria-label="Refresh quote prices"')
		expect(windowHeader).toContain('onPress={quotePriceRefreshHandler}')
		expect(windowHeader).toContain('<RefreshCw')
		expect(salesStore).toContain('quotePriceRefreshHandler')
		expect(refreshHandler).toContain(
			'const catalog = await getProductCatalog({ data: {} })',
		)
		expect(refreshHandler).toContain('replaceItems(refreshedItems)')
		expect(refreshHandler).toContain("queryKey: ['sales-outdated-prices']")
		expect(refreshHandler).toContain("queryKey: ['quote-builder-data']")
		expect(refreshHandler).not.toContain('methods.reset')
		expect(refreshHandler).not.toContain('setDeliveryAddress(')
		expect(source).not.toContain(
			"isRefreshingPrices ? 'Refreshing' : 'Refresh prices'",
		)
		expect(source).not.toContain('ariaLabel="Add item"')
	})
})
