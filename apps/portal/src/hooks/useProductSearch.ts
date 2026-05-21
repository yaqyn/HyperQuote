/**
 * Product search hook with client-side fuse.js + server fallback.
 * Loads first 500 products into fuse.js index on first search.
 * Client-side fuzzy search with 150ms debounce.
 * Falls back to server-side tsvector search if no client results.
 */

import { useQuery } from '@tanstack/react-query'
import Fuse, { type FuseResult, type IFuseOptions } from 'fuse.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	getProductCatalog,
	type ProductSearchResult,
	searchProducts,
} from '../lib/server/products-search'

// ============================================================================
// Fuse.js configuration
// ============================================================================

const FUSE_OPTIONS: IFuseOptions<ProductSearchResult> = {
	keys: [
		{ name: 'name', weight: 0.4 },
		{ name: 'nameAr', weight: 0.3 },
		{ name: 'sku', weight: 0.2 },
		{ name: 'categoryName', weight: 0.05 },
		{ name: 'categoryNameAr', weight: 0.05 },
	],
	threshold: 0.4,
	includeScore: true,
	minMatchCharLength: 2,
}

const DEBOUNCE_MS = 150

// ============================================================================
// Hook
// ============================================================================

export function useProductSearch(query: string) {
	const [results, setResults] = useState<ProductSearchResult[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const fuseRef = useRef<Fuse<ProductSearchResult> | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Load product catalog for fuse.js index (staleTime 5 min)
	const { data: catalog, isLoading: isCatalogLoading } = useQuery({
		queryKey: ['product-catalog'],
		queryFn: () => getProductCatalog({ data: { limit: 500 } }),
		staleTime: 5 * 60 * 1000,
		enabled: query.length >= 2,
	})

	// Build fuse.js index when catalog loads
	useEffect(() => {
		if (catalog && catalog.length > 0) {
			fuseRef.current = new Fuse(catalog, FUSE_OPTIONS)
		}
	}, [catalog])

	// Server fallback search
	const serverSearch = useCallback(
		async (q: string): Promise<ProductSearchResult[]> => {
			try {
				return await searchProducts({ data: { query: q, limit: 20 } })
			} catch {
				return []
			}
		},
		[],
	)

	// Debounced search
	useEffect(() => {
		if (query.length < 2) {
			setResults([])
			setIsSearching(false)
			return
		}

		setIsSearching(true)

		if (debounceRef.current) {
			clearTimeout(debounceRef.current)
		}

		debounceRef.current = setTimeout(async () => {
			// Try client-side search first
			if (fuseRef.current) {
				const fuseResults = fuseRef.current
					.search(query)
					.map((r: FuseResult<ProductSearchResult>) => r.item)
					.slice(0, 20)

				if (fuseResults.length > 0) {
					setResults(fuseResults)
					setIsSearching(false)
					return
				}
			}

			// Fall back to server search
			const serverResults = await serverSearch(query)
			setResults(serverResults)
			setIsSearching(false)
		}, DEBOUNCE_MS)

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
		}
	}, [query, serverSearch])

	return {
		results,
		isLoading: isSearching || (query.length >= 2 && isCatalogLoading),
	}
}
