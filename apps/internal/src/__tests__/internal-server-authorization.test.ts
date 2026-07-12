import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
const internalSourceRoot = join(repoRoot, 'apps/internal/src')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name)
		if (entry.isDirectory()) return sourceFiles(path)
		return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
	})
}

function internalSourcePath(path: string): string {
	return join('apps/internal/src', relative(internalSourceRoot, path))
}

function productionSourceFiles(): string[] {
	return sourceFiles(internalSourceRoot).filter(
		(path) => !path.includes(`${join('src', '__tests__')}/`),
	)
}

function gatewayArguments(source: string): string[] {
	return [
		...source.matchAll(/getInternalSupabaseClient\s*\(([\s\S]*?)\)/g),
	].map((match) => match[1] ?? '')
}

describe('internal server authorization', () => {
	it('requires every gateway caller to declare its access scope', () => {
		const gateway = readWorkspaceFile(
			'apps/internal/src/lib/server/_supabase.ts',
		)
		expect(gateway).toContain(
			"import type { EmployeePanel } from '@hyperquote/types'",
		)
		expect(gateway).toContain(
			'{ panel: EmployeePanel; writeRequired: boolean }',
		)
		expect(gateway).toContain('access: InternalAccessRequirement')
		expect(gateway).toContain("'panel' in access")

		for (const path of productionSourceFiles()) {
			const source = readFileSync(path, 'utf8')
			expect(source, internalSourcePath(path)).not.toMatch(
				/getInternalSupabaseClient\s*\(\s*\)/,
			)
		}
	})

	it('keeps active-employee-only access limited to reviewed cross-panel paths', () => {
		const activeOnlyFiles = productionSourceFiles()
			.filter((path) =>
				readFileSync(path, 'utf8').includes('activeEmployeeOnly: true'),
			)
			.map(internalSourcePath)
			.sort()

		expect(activeOnlyFiles).toEqual(
			[
				'apps/internal/src/lib/ai-chat.ts',
				'apps/internal/src/lib/server/_supabase.ts',
				'apps/internal/src/lib/server/employee-presence.ts',
				'apps/internal/src/lib/server/internal-auth.ts',
				'apps/internal/src/lib/server/notifications.ts',
				'apps/internal/src/lib/server/order-reports.ts',
				'apps/internal/src/lib/server/proofs.ts',
				'apps/internal/src/lib/server/search.ts',
				'apps/internal/src/lib/server/urgent-items.ts',
			].sort(),
		)
	})

	it('binds domain servers to their owning panel and an explicit access mode', () => {
		const domainPanels = {
			'admin.ts': 'admin',
			'customer-service.ts': 'customer_service',
			'damaged-inventory.ts': 'inventory',
			'dispatch.ts': 'dispatch',
			'finance.ts': 'finance',
			'inventory.ts': 'inventory',
			'orders.ts': 'inventory',
			'sales-customers.ts': 'sales',
			'sales-pipeline.ts': 'sales',
			'sales-quotes.ts': 'sales',
			'sales-rfq.ts': 'sales',
			'stock.ts': 'inventory',
			'warehouse.ts': 'warehouse',
		} as const

		for (const [file, panel] of Object.entries(domainPanels)) {
			const source = readWorkspaceFile(`apps/internal/src/lib/server/${file}`)
			const calls = gatewayArguments(source)
			expect(calls.length, file).toBeGreaterThan(0)
			for (const access of calls) {
				expect(access, file).toContain(`panel: '${panel}'`)
				expect(access, file).toContain('writeRequired')
			}
		}
	})

	it('authorizes client-selected AI and urgent dashboard scopes server-side', () => {
		const aiChat = readWorkspaceFile('apps/internal/src/lib/ai-chat.ts')
		const urgentItems = readWorkspaceFile(
			'apps/internal/src/lib/server/urgent-items.ts',
		)

		expect(aiChat).toContain('panelId: internalPanelIdSchema.optional()')
		expect(aiChat).toContain("finance: 'finance'")
		expect(aiChat).toContain("procurement: 'inventory'")
		expect(aiChat).toContain(
			'panel ? { panel, writeRequired: false } : { activeEmployeeOnly: true }',
		)
		expect(urgentItems).toContain("canReadPanel(client, 'sales')")
		expect(urgentItems).toContain("canReadPanel(client, 'finance')")
		expect(urgentItems).toContain("canReadPanel(client, 'dispatch')")
		expect(urgentItems).toContain("canReadPanel(client, 'customer_service')")
		expect(urgentItems).toContain('countedWhen(canReadSales')
		expect(urgentItems).toContain('countedWhen(canReadFinance')
		expect(urgentItems).toContain('countedWhen(canReadDispatch')
		expect(urgentItems).toContain('countedWhen(canReadSupport')
	})
})
