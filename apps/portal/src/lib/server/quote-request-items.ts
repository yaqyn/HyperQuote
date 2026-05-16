import { z } from 'zod'
import type { getAuthenticatedSupabase } from './_supabase'

export const quoteRequestItemInputSchema = z.object({
	productId: z.string().uuid().optional(),
	customerDescription: z.string().min(1),
	quantity: z.number().positive(),
	unitOfMeasure: z.string(),
	notes: z.string().optional(),
	sortOrder: z.number(),
	matchConfidence: z.number().optional(),
	isUnmatched: z.boolean().optional(),
})

type QuoteRequestItemInput = z.infer<typeof quoteRequestItemInputSchema>

type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedSupabase>
>['supabase']

function toQuoteRequestItemRow(
	quoteRequestId: string,
	item: QuoteRequestItemInput,
) {
	return {
		quote_request_id: quoteRequestId,
		product_id: item.productId ?? null,
		customer_description: item.customerDescription,
		quantity: item.quantity,
		unit_of_measure: item.unitOfMeasure,
		notes: item.notes ?? null,
		match_confidence: item.matchConfidence ?? null,
		sort_order: item.sortOrder,
		is_unmatched: item.isUnmatched ?? false,
	}
}

export async function insertQuoteRequestItems(
	supabase: AuthedSupabase,
	quoteRequestId: string,
	items: QuoteRequestItemInput[],
) {
	if (items.length === 0) return

	const { error } = await supabase
		.from('quote_request_items')
		.insert(items.map((item) => toQuoteRequestItemRow(quoteRequestId, item)))

	if (error) {
		throw new Error(error.message)
	}
}
