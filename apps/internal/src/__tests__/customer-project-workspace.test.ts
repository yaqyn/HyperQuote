import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('customer project workspace', () => {
	it('separates project inspection from assignment and preserves project order', () => {
		const source = readWorkspaceFile(
			'apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx',
		)
		const panel = source.slice(
			source.indexOf('function CustomerProjectsPanel'),
			source.indexOf('// --- Main view ---'),
		)

		expect(panel).toContain('aria-expanded={isOpen}')
		expect(panel).toContain('setOpenProjectId(isOpen ? null : project.id)')
		expect(panel).toContain("'Assign to this project'")
		expect(panel).toContain("'Change to this project'")
		expect(panel).toContain("'Assigned to this project'")
		expect(panel).toContain('record.items.map((item) =>')
		expect(source).toContain('const refreshedById = new Map(')
		expect(source).toContain('const stableProjects = currentProjects.flatMap(')
	})

	it('loads each project order with its complete request item list', () => {
		const server = readWorkspaceFile(
			'apps/internal/src/lib/server/sales-quotes.ts',
		)

		expect(server).toContain(
			'orders (id, order_number, status, total_amount, created_at)',
		)
		expect(server).toContain('quote_request_items (')
		expect(server).toContain('products (name)')
		expect(server).toContain('quantity: Number(item.quantity)')
	})

	it('refreshes project order delivery history after assignment', () => {
		const server = readWorkspaceFile(
			'apps/internal/src/lib/server/sales-quotes.ts',
		)
		const builder = readWorkspaceFile(
			'apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx',
		)

		expect(server).toContain(".from('orders')")
		expect(server).toContain('quote_requests!inner (')
		expect(server).toContain(".eq('quote_requests.project_id', projectId)")
		expect(server).toContain(".neq('quote_requests.id', excludeQuoteRequestId)")
		expect(server).toContain(
			'projectRecentLocations: projectDeliveryHistory.locations',
		)
		expect(server).toContain(
			'projectRecentWindows: projectDeliveryHistory.windows',
		)
		expect(builder).toContain(
			'setProjectRecentLocations(result.projectRecentLocations)',
		)
		expect(builder).toContain(
			'setProjectRecentWindows(result.projectRecentWindows)',
		)
	})
})
