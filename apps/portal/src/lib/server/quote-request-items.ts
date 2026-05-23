import { z } from 'zod'
import type { getAuthenticatedSupabase } from './_supabase'

export const quoteRequestItemInputSchema = z.object({
	productId: z.string().uuid().optional(),
	customerDescription: z.string().min(1),
	quantity: z.number().positive(),
	unitOfMeasure: z.string(),
	unitOfMeasureAr: z.string().optional(),
	notes: z.string().optional(),
	sortOrder: z.number(),
	matchConfidence: z.number().optional(),
	isUnmatched: z.boolean().optional(),
})

type QuoteRequestItemInput = z.infer<typeof quoteRequestItemInputSchema>
interface InsertQuoteRequestItemsOptions {
	requireOrderableProductLinks?: boolean
}

export const QUOTE_REQUEST_ITEM_PRODUCT_NOT_ORDERABLE =
	'quote_request_items_product_not_orderable'

const productOrderabilityRowSchema = z.object({
	availability_status: z.string(),
	id: z.string().uuid(),
	is_active: z.boolean(),
})

type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedSupabase>
>['supabase']

export function isOrderableQuoteProduct(row: {
	availability_status: string
	is_active: boolean
}): boolean {
	return (
		row.is_active &&
		row.availability_status !== 'hidden' &&
		row.availability_status !== 'out_of_stock'
	)
}

export function toQuoteRequestItemRows(
	quoteRequestId: string,
	items: QuoteRequestItemInput[],
	orderableProductIds: ReadonlySet<string>,
) {
	return items.map((item) => {
		const hasOrderableProduct =
			item.productId !== undefined && orderableProductIds.has(item.productId)
		const productId = hasOrderableProduct ? item.productId : null
		const isUnmatched = productId === null

		return {
			quote_request_id: quoteRequestId,
			product_id: productId,
			customer_description: item.customerDescription,
			quantity: item.quantity,
			unit_of_measure: item.unitOfMeasure,
			unit_of_measure_ar: item.unitOfMeasureAr?.trim() || item.unitOfMeasure,
			notes: item.notes ?? null,
			match_confidence: isUnmatched ? null : (item.matchConfidence ?? null),
			sort_order: item.sortOrder,
			is_unmatched: isUnmatched,
		}
	})
}

export function assertAllProductLinksOrderable(
	items: QuoteRequestItemInput[],
	orderableProductIds: ReadonlySet<string>,
) {
	const hasMissingOrStaleProduct = items.some(
		(item) =>
			item.productId === undefined || !orderableProductIds.has(item.productId),
	)
	if (hasMissingOrStaleProduct) {
		throw new Error(QUOTE_REQUEST_ITEM_PRODUCT_NOT_ORDERABLE)
	}
}

async function getOrderableProductIds(
	supabase: AuthedSupabase,
	items: QuoteRequestItemInput[],
) {
	const productIds = [
		...new Set(
			items.flatMap((item) =>
				item.productId === undefined ? [] : [item.productId],
			),
		),
	]
	if (productIds.length === 0) return new Set<string>()

	const { data, error } = await supabase
		.from('products')
		.select('id, is_active, availability_status')
		.in('id', productIds)

	if (error) throw new Error(error.message)

	const rows = productOrderabilityRowSchema.array().parse(data ?? [])
	return new Set(rows.filter(isOrderableQuoteProduct).map((row) => row.id))
}

export async function assertQuoteRequestItemsHaveOrderableProductLinks(
	supabase: AuthedSupabase,
	items: QuoteRequestItemInput[],
) {
	const orderableProductIds = await getOrderableProductIds(supabase, items)
	assertAllProductLinksOrderable(items, orderableProductIds)
}

export async function insertQuoteRequestItems(
	supabase: AuthedSupabase,
	quoteRequestId: string,
	items: QuoteRequestItemInput[],
	options: InsertQuoteRequestItemsOptions = {
		requireOrderableProductLinks: true,
	},
) {
	if (items.length === 0) return
	const orderableProductIds = await getOrderableProductIds(supabase, items)
	if (options.requireOrderableProductLinks) {
		assertAllProductLinksOrderable(items, orderableProductIds)
	}

	const { error } = await supabase
		.from('quote_request_items')
		.insert(toQuoteRequestItemRows(quoteRequestId, items, orderableProductIds))

	if (error) {
		throw new Error(error.message)
	}
}
