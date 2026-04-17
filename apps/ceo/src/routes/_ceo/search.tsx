import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { SearchResults } from '../../components/search/SearchResults'
import { searchEntities } from '../../lib/server/search'
import type { SearchResultGroup } from '../../types/entity'

const validateSearch = z.object({
	q: z.string().optional(),
})

export const Route = createFileRoute('/_ceo/search')({
	validateSearch,
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: async ({ deps }) => {
		if (!deps.q || deps.q.trim().length === 0) {
			return { groups: [] as SearchResultGroup[], query: '' }
		}
		const groups = await searchEntities({
			data: { query: deps.q.trim() },
		})
		return { groups, query: deps.q.trim() }
	},
	component: SearchPage,
})

function SearchPage() {
	const { groups, query } = Route.useLoaderData()
	const { q } = Route.useSearch()
	const navigate = useNavigate()
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState(q ?? '')
	const deferredValue = useDeferredValue(inputValue)

	// Sync deferred value to URL search params
	useEffect(() => {
		const trimmed = deferredValue.trim()
		if (trimmed !== (q ?? '')) {
			navigate({
				to: '/search',
				search: trimmed ? { q: trimmed } : {},
				replace: true,
			})
		}
	}, [deferredValue, q, navigate])

	// Auto-navigate on exact match (single result with score > 0.95)
	useEffect(() => {
		if (groups.length === 1 && groups[0].results.length === 1) {
			const result = groups[0].results[0]
			if (result.score > 0.95) {
				navigate({
					to: '/entity/$type/$id',
					params: { type: result.type, id: result.id },
				})
			}
		}
	}, [groups, navigate])

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	// Escape -> back to home
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				navigate({ to: '/' })
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [navigate])

	return (
		<div className="flex h-full flex-col">
			{/* Search bar pinned to top */}
			<div className="flex-shrink-0 border-b border-[var(--color-border)] px-4 py-3">
				<div className="mx-auto max-w-[600px]">
					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						placeholder="Search employees, customers, orders..."
						className="w-full rounded-lg bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none"
					/>
				</div>
			</div>

			{/* Results */}
			<div className="flex-1 overflow-y-auto px-4 py-4">
				<div className="mx-auto max-w-[600px]">
					{query ? (
						<SearchResults groups={groups} query={query} />
					) : (
						<div className="flex items-center justify-center py-12">
							<p className="text-sm text-[var(--color-text-subtle)]">
								Type to search across all entities
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
