import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toQuoteItemsPayload } from '../lib/quote-request-payload'
import { validateQuoteRequestItems } from '../lib/server/quote-requests'
import type { QuoteItem } from '../stores/quote-builder'

export function useQuoteBuilderOrderability(items: QuoteItem[]) {
	const quoteRequestItems = useMemo(() => toQuoteItemsPayload(items), [items])
	const quoteRequestItemsFingerprint = useMemo(
		() => JSON.stringify(quoteRequestItems),
		[quoteRequestItems],
	)
	const orderabilityQuery = useQuery({
		queryKey: ['quote-builder-orderability', quoteRequestItemsFingerprint],
		queryFn: () =>
			validateQuoteRequestItems({
				data: { items: quoteRequestItems },
			}),
		enabled: quoteRequestItems.length > 0,
		staleTime: 10_000,
	})
	const unavailableItems = orderabilityQuery.data?.unavailableItems ?? []
	const hasLocalInvalidItems = items.some(
		(item) => item.isUnmatched || !item.productId,
	)
	const isValidationPending =
		quoteRequestItems.length > 0 && orderabilityQuery.isFetching
	const isValidationFailed =
		quoteRequestItems.length > 0 && orderabilityQuery.isError

	return {
		hasLocalInvalidItems,
		isBlocked:
			hasLocalInvalidItems ||
			unavailableItems.length > 0 ||
			isValidationPending ||
			isValidationFailed,
		isValidationFailed,
		isValidationPending,
		unavailableItems,
	}
}
