import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	SearchExecutiveBrief,
	SearchModuleSummary,
	SearchResponse,
	SearchTableView,
} from '../search-registry'

export const searchInternalDb = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ query: z.string() }))
	.handler(async ({ data }): Promise<SearchResponse> => {
		const { searchInternalDbRows } = await import('../search-registry')
		return searchInternalDbRows(data.query)
	})

export const listSearchTable = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ tableId: z.string() }))
	.handler(async ({ data }): Promise<SearchTableView> => {
		const { listSearchTableRows } = await import('../search-registry')
		const table = listSearchTableRows(data.tableId)
		if (!table) throw new Error(`Unknown search table: ${data.tableId}`)
		return table
	})

export const getSearchExecutiveBrief = createServerFn({
	method: 'GET',
}).handler(async (): Promise<SearchExecutiveBrief> => {
	const { buildSearchExecutiveBrief } = await import('../search-registry')
	return buildSearchExecutiveBrief()
})

export const getSearchModuleSummary = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ moduleId: z.string() }))
	.handler(async ({ data }): Promise<SearchModuleSummary> => {
		const { getSearchModuleSummary: readSearchModuleSummary } = await import(
			'../search-registry'
		)
		const summary = readSearchModuleSummary(data.moduleId)
		if (!summary) throw new Error(`Unknown search summary: ${data.moduleId}`)
		return summary
	})
