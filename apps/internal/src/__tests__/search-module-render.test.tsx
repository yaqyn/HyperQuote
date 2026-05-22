import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchModule } from '../components/search/SearchModule'

vi.mock('../lib/server/search', () => ({
	getSearchActivityFeed: vi.fn(async () => ({
		domains: [{ count: 0, id: 'all', label: 'All', rows: [] }],
		loadedRowCount: 0,
		totalCount: 0,
	})),
	getSearchExecutiveBrief: vi.fn(async () => ({ modules: [] })),
	getSearchModuleSummary: vi.fn(async () => undefined),
	listSearchTable: vi.fn(async () => undefined),
	searchInternalDb: vi.fn(async () => ({ results: [], tableMatches: [] })),
}))

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

async function waitForSearchModuleUpdate(
	matches: () => boolean,
): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		if (matches()) return
		await act(async () => {
			await new Promise((resolve) => window.setTimeout(resolve, 0))
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
})
