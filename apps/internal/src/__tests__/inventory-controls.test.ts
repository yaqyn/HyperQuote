import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

function readMigrationSource(): string {
	const migrationsDir = join(repoRoot, 'supabase/migrations')
	return readdirSync(migrationsDir)
		.filter((file) => file.endsWith('.sql'))
		.sort()
		.map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
		.join('\n')
}

describe('inventory controls', () => {
	it('keeps the stock tab focused on refill actions', () => {
		const stockView = readWorkspaceFile(
			'apps/internal/src/components/procurement/stock/StockView.tsx',
		)
		const stockServer = readWorkspaceFile(
			'apps/internal/src/lib/server/stock.ts',
		)

		expect(stockView).toContain('onRefill={setRefillSlug}')
		expect(stockView).not.toContain('setStockProductAvailability')
		expect(stockView).not.toContain('onToggleAvailability')
		expect(stockView).not.toContain('aria-label={`Switch')
		expect(stockServer).not.toContain('setStockProductAvailability')
		expect(stockServer).not.toContain('inventory_set_product_availability')
	})

	it('lets employees mark prices outdated without bypassing proof for updates', () => {
		const inventoryView = readWorkspaceFile(
			'apps/internal/src/components/procurement/inventory/InventoryView.tsx',
		)
		const detailModal = readWorkspaceFile(
			'apps/internal/src/components/procurement/inventory/ProductDetailModal.tsx',
		)
		const inventoryServer = readWorkspaceFile(
			'apps/internal/src/lib/server/inventory.ts',
		)
		const authServer = readWorkspaceFile('packages/auth/src/server.ts')
		const migrations = readMigrationSource()

		expect(inventoryView).toContain('markProductPriceOutdated')
		expect(inventoryView).toContain("product.priceStatus === 'updated'")
		expect(inventoryView).toContain('Outdate')
		expect(detailModal).toContain('priceReconfirmed')
		expect(detailModal).toContain("data.priceStatus === 'outdated'")
		expect(detailModal).toContain('priceChanged || priceReconfirmed')
		expect(inventoryServer).toContain('inventory_mark_price_outdated')
		expect(authServer).toContain('inventory_mark_price_outdated')
		expect(migrations).toContain(
			'create or replace function public.inventory_mark_price_outdated',
		)
		expect(migrations).toContain("now() - interval '48 hours'")
		expect(migrations).toContain(
			'create or replace function public.service_inventory_mark_price_outdated',
		)
	})
})
