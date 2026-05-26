import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchModule } from '../components/search/SearchModule'
import type {
	SearchActivityFeed,
	SearchExecutiveBrief,
	SearchResponse,
} from '../lib/search-registry'
import type { ActivityProofDocument } from '../lib/server/proofs'
import { useInternalStore } from '../stores/internal'

const serverSearchMocks = vi.hoisted(() => ({
	getSearchActivityFeed: vi.fn(
		async (): Promise<SearchActivityFeed> => ({
			domains: [
				{ count: 0, id: 'all', label: 'All', latestAt: null, rows: [] },
			],
			generatedAt: '2026-05-24T09:00:00Z',
			loadedRowCount: 0,
			rowLimit: 50,
			totalCount: 0,
		}),
	),
	getSearchExecutiveBrief: vi.fn(
		async (): Promise<SearchExecutiveBrief> => ({
			generatedAt: '2026-05-24T09:00:00Z',
			modules: [],
		}),
	),
	getSearchModuleSummary: vi.fn(async () => undefined),
	listSearchTable: vi.fn(async () => undefined),
	searchInternalDb: vi.fn(
		async (): Promise<SearchResponse> => ({
			query: '',
			results: [],
			tableMatches: [],
			tables: [],
		}),
	),
}))

const proofMocks = vi.hoisted(() => ({
	getActivityProofDocuments: vi.fn(
		async (): Promise<ActivityProofDocument[]> => [],
	),
}))

vi.mock('../lib/server/search', () => serverSearchMocks)

vi.mock('../lib/server/proofs', () => ({
	getActivityProofDocuments: proofMocks.getActivityProofDocuments,
}))

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

async function waitForSearchModuleUpdate(
	matches: () => boolean,
): Promise<void> {
	for (let attempt = 0; attempt < 25; attempt += 1) {
		if (matches()) return
		await act(async () => {
			await new Promise((resolve) => window.setTimeout(resolve, 10))
		})
	}
}

async function setSearchQuery(value: string): Promise<void> {
	const input = activeContainer?.querySelector<HTMLInputElement>(
		'input[aria-label="Search internal database"]',
	)
	expect(input).toBeInTheDocument()

	let expectedValue = ''
	for (const key of value) {
		expectedValue = `${expectedValue}${key}`
		await act(async () => {
			window.dispatchEvent(new KeyboardEvent('keydown', { key }))
		})
		await waitForSearchModuleUpdate(() => input?.value === expectedValue)
	}

	await waitForSearchModuleUpdate(() => input?.value === value)
}

afterEach(() => {
	if (activeRoot) {
		act(() => activeRoot?.unmount())
		activeRoot = null
	}
	activeContainer?.remove()
	activeContainer = null
	document.body
		.querySelectorAll('[role="dialog"][aria-label="Activity proof documents"]')
		.forEach((node) => {
			node.remove()
		})
	serverSearchMocks.searchInternalDb.mockResolvedValue({
		query: '',
		results: [],
		tableMatches: [],
		tables: [],
	})
	proofMocks.getActivityProofDocuments.mockResolvedValue([])
	useInternalStore.setState({ activeModule: null, windowStates: {} })
	vi.clearAllMocks()
})

describe('SearchModule first render', () => {
	it('renders the search input immediately without an access-key gate', () => {
		const queryClient = new QueryClient()
		const html = renderToStaticMarkup(
			<QueryClientProvider client={queryClient}>
				<SearchModule />
			</QueryClientProvider>,
		)

		expect(html).toContain('aria-label="Search internal database"')
		expect(html).toContain('placeholder="Query"')
		expect(html).toContain('aria-label="Open activity feed"')
		expect(html).toContain('aria-label="Open summaries"')
		expect(html).not.toContain('>Activity</button>')
		expect(html).not.toContain('Executive access key')
		expect(html).not.toContain('Welcome back, executive.')
	})

	it('opens activity as an overlay over the centered empty search', async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		activeContainer = document.createElement('div')
		document.body.appendChild(activeContainer)
		activeRoot = createRoot(activeContainer)

		await act(async () => {
			activeRoot?.render(
				<QueryClientProvider client={queryClient}>
					<SearchModule />
				</QueryClientProvider>,
			)
		})

		expect(
			activeContainer.querySelector(
				'input[aria-label="Search internal database"]',
			),
		).toBeInTheDocument()

		const activityButton = activeContainer.querySelector<HTMLButtonElement>(
			'button[aria-label="Open activity feed"]',
		)
		expect(activityButton).toBeInTheDocument()

		await act(async () => {
			activityButton?.click()
			await Promise.resolve()
		})

		expect(
			activeContainer.querySelector('[data-activity-overlay="true"]'),
		).toBeInTheDocument()
		expect(
			activeContainer.querySelector(
				'input[aria-label="Search internal database"]',
			),
		).toBeInTheDocument()

		await waitForSearchModuleUpdate(() =>
			Boolean(
				activeContainer?.textContent?.includes('No activity in this domain.'),
			),
		)

		expect(activeContainer.textContent).toContain('All')
		expect(activeContainer.textContent).toContain('No activity in this domain.')

		const backButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes('Back'))
		expect(backButton).toBeInTheDocument()

		await act(async () => {
			backButton?.click()
		})

		await waitForSearchModuleUpdate(
			() => !activeContainer?.querySelector('[data-activity-overlay="true"]'),
		)

		expect(
			activeContainer.querySelector('[data-activity-overlay="true"]'),
		).not.toBeInTheDocument()
		expect(
			activeContainer.querySelector(
				'input[aria-label="Search internal database"]',
			),
		).toBeInTheDocument()
		expect(
			activeContainer.querySelector('[data-search-console="true"]')?.className,
		).toContain('items-center justify-center')
	})

	it('restores the current search after activity closes', async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		activeContainer = document.createElement('div')
		document.body.appendChild(activeContainer)
		activeRoot = createRoot(activeContainer)

		await act(async () => {
			activeRoot?.render(
				<QueryClientProvider client={queryClient}>
					<SearchModule />
				</QueryClientProvider>,
			)
		})

		await setSearchQuery('ahmed')
		await waitForSearchModuleUpdate(
			() =>
				!activeContainer
					?.querySelector('[data-search-console="true"]')
					?.className.includes('items-center justify-center'),
		)

		const activityButton = activeContainer.querySelector<HTMLButtonElement>(
			'button[aria-label="Open activity feed"]',
		)
		expect(activityButton).toBeInTheDocument()

		await act(async () => {
			activityButton?.click()
			await Promise.resolve()
		})

		expect(
			activeContainer.querySelector('[data-activity-overlay="true"]'),
		).toBeInTheDocument()
		expect(
			activeContainer.querySelector<HTMLInputElement>(
				'input[aria-label="Search internal database"]',
			)?.value,
		).toBe('ahmed')

		await waitForSearchModuleUpdate(() =>
			Boolean(
				activeContainer?.textContent?.includes('No activity in this domain.'),
			),
		)

		const backButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes('Back'))
		expect(backButton).toBeInTheDocument()

		await act(async () => {
			backButton?.click()
		})

		await waitForSearchModuleUpdate(
			() => !activeContainer?.querySelector('[data-activity-overlay="true"]'),
		)

		const restoredInput = activeContainer.querySelector<HTMLInputElement>(
			'input[aria-label="Search internal database"]',
		)

		expect(restoredInput).toBeInTheDocument()
		expect(restoredInput?.value).toBe('ahmed')
	})

	it('keeps summaries and activity in the same action row', async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		activeContainer = document.createElement('div')
		document.body.appendChild(activeContainer)
		activeRoot = createRoot(activeContainer)

		await act(async () => {
			activeRoot?.render(
				<QueryClientProvider client={queryClient}>
					<SearchModule />
				</QueryClientProvider>,
			)
		})

		const actionRow = activeContainer.querySelector(
			'[data-search-actions="true"]',
		)
		const actionButtons = actionRow?.querySelectorAll('button')

		expect(actionRow).toBeInTheDocument()
		expect(actionButtons).toHaveLength(2)
		expect(actionButtons?.[0]).toHaveAttribute('aria-label', 'Open summaries')
		expect(actionButtons?.[1]).toHaveAttribute(
			'aria-label',
			'Open activity feed',
		)

		await act(async () => {
			actionButtons?.[0]?.click()
		})

		expect(actionButtons?.[0]).toHaveAttribute('aria-expanded', 'true')

		const summaryMenu = document.body.querySelector(
			'[data-summary-menu="true"]',
		)

		expect(summaryMenu).toBeInTheDocument()
		expect(summaryMenu?.className).toContain('fixed')
		expect(summaryMenu?.className).toContain('top-1/2')
		expect(summaryMenu?.className).toContain('left-1/2')
	})

	it('opens inventory-domain search results in the inventory app module', async () => {
		const pricingRow = {
			accent: '#10b981',
			details: [
				{ label: 'Item', value: 'Wood' },
				{ label: 'Supplier', value: 'Alex Supplies' },
			],
			preview: [
				{ label: 'Item', value: 'Wood' },
				{ label: 'Supplier', value: 'Alex Supplies' },
			],
			rowId: '33333333-3333-4333-8333-333333333333',
			tableId: 'pricing' as const,
			tableLabel: 'Pricing',
			title: 'Wood price from Alex Supplies',
		}
		serverSearchMocks.searchInternalDb.mockResolvedValue({
			query: 'wood',
			results: [
				{
					accent: '#10b981',
					label: 'Pricing',
					rowCount: 1,
					rows: [{ ...pricingRow, matchedFields: ['Item'] }],
					tableId: 'pricing',
				},
			],
			tableMatches: [],
			tables: [
				{
					accent: '#10b981',
					label: 'Pricing',
					rowCount: 1,
					tableId: 'pricing',
				},
			],
		})

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		activeContainer = document.createElement('div')
		document.body.appendChild(activeContainer)
		activeRoot = createRoot(activeContainer)

		await act(async () => {
			activeRoot?.render(
				<QueryClientProvider client={queryClient}>
					<SearchModule />
				</QueryClientProvider>,
			)
		})

		await setSearchQuery('wood')
		await waitForSearchModuleUpdate(() =>
			Boolean(activeContainer?.textContent?.includes(pricingRow.title)),
		)

		const resultButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes(pricingRow.title))
		expect(resultButton).toBeInTheDocument()

		await act(async () => {
			resultButton?.click()
		})

		const openInventoryButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes('Open Inventory'))
		expect(openInventoryButton).toBeInTheDocument()

		await act(async () => {
			openInventoryButton?.click()
		})

		expect(useInternalStore.getState().activeModule).toBe('procurement')
	})

	it('opens finance accounting search results in the finance app module', async () => {
		const accountingRow = {
			accent: '#BAE6FD',
			details: [
				{ label: 'Record type', value: 'Journal entry' },
				{ label: 'Entry', value: 'JE-2026-000001' },
			],
			preview: [
				{ label: 'Record', value: 'Journal entry' },
				{ label: 'Status', value: 'Draft' },
			],
			rowId: 'journal_entry:11111111-2222-4333-8444-555555555555',
			tableId: 'finance-accounting' as const,
			tableLabel: 'Finance accounting',
			title: 'Journal entry JE-2026-000001',
		}
		serverSearchMocks.searchInternalDb.mockResolvedValue({
			query: 'journal',
			results: [
				{
					accent: '#BAE6FD',
					label: 'Finance accounting',
					rowCount: 1,
					rows: [{ ...accountingRow, matchedFields: ['Record'] }],
					tableId: 'finance-accounting',
				},
			],
			tableMatches: [],
			tables: [
				{
					accent: '#BAE6FD',
					label: 'Finance accounting',
					rowCount: 1,
					tableId: 'finance-accounting',
				},
			],
		})

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		activeContainer = document.createElement('div')
		document.body.appendChild(activeContainer)
		activeRoot = createRoot(activeContainer)

		await act(async () => {
			activeRoot?.render(
				<QueryClientProvider client={queryClient}>
					<SearchModule />
				</QueryClientProvider>,
			)
		})

		await setSearchQuery('journal')
		await waitForSearchModuleUpdate(() =>
			Boolean(activeContainer?.textContent?.includes(accountingRow.title)),
		)

		const resultButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes(accountingRow.title))
		expect(resultButton).toBeInTheDocument()

		await act(async () => {
			resultButton?.click()
		})

		const openFinanceButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes('Open Finance'))
		expect(openFinanceButton).toBeInTheDocument()

		await act(async () => {
			openFinanceButton?.click()
		})

		expect(useInternalStore.getState().activeModule).toBe('finance')
	})

	it('previews activity proof documents inside the app window', async () => {
		const activityRow = {
			accent: '#8b5cf6',
			details: [
				{
					label: 'Story',
					value:
						'Ahmed from Finance recorded a customer payment with Mona as manager and 2 proof documents',
				},
				{ label: 'Who', value: 'Ahmed' },
				{ label: 'Panel', value: 'Finance' },
				{ label: 'Manager', value: 'Mona' },
				{ label: 'Proofs', value: 'Payment slip, legacy-proof.txt' },
			],
			preview: [
				{ label: 'Who', value: 'Ahmed' },
				{ label: 'Panel', value: 'Finance' },
				{ label: 'Proofs', value: 'Payment slip, legacy-proof.txt' },
			],
			rowId: '11111111-1111-4111-8111-111111111111',
			tableId: 'activity' as const,
			tableLabel: 'Activity',
			title:
				'Ahmed from Finance recorded a customer payment with Mona as manager and 2 proof documents',
		}
		serverSearchMocks.searchInternalDb.mockResolvedValue({
			query: 'proof',
			results: [
				{
					accent: '#8b5cf6',
					label: 'Activity',
					rowCount: 1,
					rows: [{ ...activityRow, matchedFields: ['Proofs'] }],
					tableId: 'activity',
				},
			],
			tableMatches: [],
			tables: [
				{
					accent: '#8b5cf6',
					label: 'Activity',
					rowCount: 1,
					tableId: 'activity',
				},
			],
		})
		proofMocks.getActivityProofDocuments.mockResolvedValue([
			{
				fileName: 'payment-slip.pdf',
				id: '22222222-2222-4222-8222-222222222222',
				mimeType: 'application/pdf',
				panel: 'finance',
				proofType: 'finance_in',
				reference: null,
				sizeBytes: 512_000,
				title: 'Payment slip',
				uploadedAt: '2026-05-24T09:05:00Z',
				uploadedBy: 'Mona Finance',
				url: 'https://example.test/payment-slip.pdf',
				downloadUrl: 'https://example.test/payment-slip.pdf?download=1',
			},
			{
				fileName: 'site-note.txt',
				id: '33333333-3333-4333-8333-333333333333',
				mimeType: 'text/plain',
				panel: 'finance',
				proofType: 'finance_in',
				reference: null,
				sizeBytes: 2_048,
				title: 'Site note',
				uploadedAt: '2026-05-24T09:04:30Z',
				uploadedBy: 'Mona Finance',
				url: 'https://example.test/site-note.txt',
				downloadUrl: 'https://example.test/site-note.txt?download=1',
			},
			{
				fileName: 'receipt.jpg',
				id: '44444444-4444-4444-8444-444444444444',
				mimeType: 'image/jpeg',
				panel: 'finance',
				proofType: 'finance_in',
				reference: null,
				sizeBytes: 64_000,
				title: 'Receipt image',
				uploadedAt: '2026-05-24T09:04:15Z',
				uploadedBy: 'Mona Finance',
				url: 'https://example.test/receipt.jpg',
				downloadUrl: 'https://example.test/receipt.jpg?download=1',
			},
			{
				fileName: 'legacy-proof.txt',
				id: 'legacy-refill-proofs-legacy-proof.txt',
				mimeType: 'application/octet-stream',
				panel: 'search',
				proofType: 'other',
				reference: 'refill-proofs/legacy-proof.txt',
				sizeBytes: 0,
				title: 'Legacy proof reference - legacy-proof.txt',
				uploadedAt: '2026-05-24T09:04:00Z',
				uploadedBy: null,
				url: null,
				downloadUrl: null,
			},
		])

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		activeContainer = document.createElement('div')
		document.body.appendChild(activeContainer)
		activeRoot = createRoot(activeContainer)

		await act(async () => {
			activeRoot?.render(
				<QueryClientProvider client={queryClient}>
					<SearchModule />
				</QueryClientProvider>,
			)
		})

		await setSearchQuery('proof')
		await waitForSearchModuleUpdate(() =>
			Boolean(activeContainer?.textContent?.includes(activityRow.title)),
		)

		const resultButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes(activityRow.title))
		expect(resultButton).toBeInTheDocument()

		await act(async () => {
			resultButton?.click()
		})

		const showDocsButton = Array.from(
			activeContainer.querySelectorAll('button'),
		).find((button) => button.textContent?.includes('Show Docs'))
		expect(showDocsButton).toBeInTheDocument()

		await act(async () => {
			showDocsButton?.click()
		})

		await waitForSearchModuleUpdate(() =>
			Boolean(
				document.body.querySelector(
					'[role="dialog"][aria-label="Activity proof documents"]',
				),
			),
		)
		await waitForSearchModuleUpdate(() =>
			Boolean(document.body.textContent?.includes('Mona Finance')),
		)

		const dialog = document.body.querySelector<HTMLElement>(
			'[role="dialog"][aria-label="Activity proof documents"]',
		)
		expect(dialog).toBeInTheDocument()
		const paymentButton = Array.from(
			dialog?.querySelectorAll('button') ?? [],
		).find((button) => button.textContent?.includes('Payment slip'))
		expect(paymentButton).toBeInTheDocument()

		await act(async () => {
			paymentButton?.click()
		})

		await waitForSearchModuleUpdate(() =>
			Boolean(dialog?.querySelector('iframe[title="Payment slip"]')),
		)
		expect(
			dialog?.querySelector('iframe[title="Payment slip"]'),
		).toBeInTheDocument()
		expect(
			dialog?.querySelector(
				'a[target="_blank"][aria-label="Open Payment slip"]',
			),
		).toHaveAttribute('href', 'https://example.test/payment-slip.pdf')
		expect(
			dialog?.querySelector('a[download="payment-slip.pdf"]'),
		).toHaveAttribute(
			'href',
			'https://example.test/payment-slip.pdf?download=1',
		)

		const textButton = Array.from(
			dialog?.querySelectorAll('button') ?? [],
		).find((button) => button.textContent?.includes('Site note'))
		expect(textButton).toBeInTheDocument()

		await act(async () => {
			textButton?.click()
		})

		await waitForSearchModuleUpdate(() =>
			Boolean(dialog?.querySelector('iframe[title="Site note"]')),
		)
		expect(dialog?.querySelector('iframe[title="Site note"]')).toHaveAttribute(
			'src',
			'https://example.test/site-note.txt',
		)

		const imageButton = Array.from(
			dialog?.querySelectorAll('button') ?? [],
		).find((button) => button.textContent?.includes('Receipt image'))
		expect(imageButton).toBeInTheDocument()

		await act(async () => {
			imageButton?.click()
		})

		await waitForSearchModuleUpdate(() =>
			Boolean(dialog?.querySelector('img[alt="Receipt image"]')),
		)
		await act(async () => {
			dialog
				?.querySelector('img[alt="Receipt image"]')
				?.dispatchEvent(new Event('error', { bubbles: true }))
		})

		await waitForSearchModuleUpdate(() =>
			Boolean(
				dialog?.textContent?.includes('Preview failed for this document.'),
			),
		)
		expect(dialog?.querySelector('a[download="receipt.jpg"]')).toHaveAttribute(
			'href',
			'https://example.test/receipt.jpg?download=1',
		)

		const legacyButton = Array.from(
			dialog?.querySelectorAll('button') ?? [],
		).find((button) => button.textContent?.includes('legacy-proof.txt'))
		expect(legacyButton).toBeInTheDocument()

		await act(async () => {
			legacyButton?.click()
		})

		await waitForSearchModuleUpdate(() =>
			Boolean(
				dialog?.textContent?.includes('Preview unavailable for this document.'),
			),
		)

		expect(dialog?.textContent).toContain('refill-proofs/legacy-proof.txt')
	})
})
