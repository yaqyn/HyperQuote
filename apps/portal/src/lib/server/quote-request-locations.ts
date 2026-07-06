import { z } from 'zod'
import {
	insertQuoteRequestItems,
	quoteRequestItemInputSchema,
} from './quote-request-items'

export const deliveryPeriodInput = z.enum(['AM', 'PM'])

export const quoteRequestLocationInputSchema = z.object({
	clientId: z.string().min(1).max(120),
	addressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	deliveryHour: z.number().int().min(1).max(12).optional(),
	deliveryPeriod: deliveryPeriodInput.optional(),
	items: z.array(quoteRequestItemInputSchema).min(1),
})

export const quoteRequestAssociateInputSchema = z.object({
	name: z.string().min(1).max(120),
	countryCode: z.string().regex(/^\+[1-9][0-9]{0,3}$/),
	number: z.string().min(1).max(40),
})

type QuoteRequestItemInput = z.infer<typeof quoteRequestItemInputSchema>
export type QuoteRequestLocationInput = z.infer<
	typeof quoteRequestLocationInputSchema
>
export type QuoteRequestAssociateInput = z.infer<
	typeof quoteRequestAssociateInputSchema
>

type QuoteRequestItemsClient = Parameters<typeof insertQuoteRequestItems>[0]

interface LocationSummaryInput {
	deliveryAddressId?: string
	deliveryDate?: string
	items?: QuoteRequestItemInput[]
	locations?: QuoteRequestLocationInput[]
}

export interface QuoteRequestLocationSummary {
	deliveryAddressId?: string
	deliveryDate?: string
	deliveryHour?: number
	deliveryPeriod?: 'AM' | 'PM'
}

export function normalizeQuoteRequestLocations(
	input: LocationSummaryInput,
): QuoteRequestLocationInput[] {
	if (input.locations && input.locations.length > 0) {
		return input.locations
	}

	return [
		{
			clientId: 'legacy-default',
			addressId: input.deliveryAddressId,
			deliveryDate: input.deliveryDate,
			items: input.items ?? [],
		},
	]
}

export function quoteRequestItemsFromLocations(
	locations: QuoteRequestLocationInput[],
) {
	return locations.flatMap((location) => location.items)
}

export function firstQuoteRequestLocation(
	locations: QuoteRequestLocationInput[],
) {
	return locations[0] ?? null
}

export function quoteRequestLocationSummary(
	locations: QuoteRequestLocationInput[],
): QuoteRequestLocationSummary {
	const first = firstQuoteRequestLocation(locations)
	return {
		deliveryAddressId: first?.addressId,
		deliveryDate: first?.deliveryDate,
		deliveryHour: first?.deliveryHour,
		deliveryPeriod: first?.deliveryPeriod,
	}
}

export async function replaceQuoteRequestLocationsAndItems(
	supabase: QuoteRequestItemsClient,
	quoteRequestId: string,
	locations: QuoteRequestLocationInput[],
	associates: QuoteRequestAssociateInput[] = [],
) {
	const { error: deleteItemsError } = await supabase
		.from('quote_request_items')
		.delete()
		.eq('quote_request_id', quoteRequestId)
	if (deleteItemsError) throw new Error(deleteItemsError.message)

	const { error: deleteAssociatesError } = await supabase
		.from('quote_request_associates')
		.delete()
		.eq('quote_request_id', quoteRequestId)
	if (deleteAssociatesError) throw new Error(deleteAssociatesError.message)

	const { error: deleteLocationsError } = await supabase
		.from('quote_request_locations')
		.delete()
		.eq('quote_request_id', quoteRequestId)
	if (deleteLocationsError) throw new Error(deleteLocationsError.message)

	const locationRows = locations.map((location, index) => ({
		quote_request_id: quoteRequestId,
		client_id: location.clientId,
		sort_order: index,
		address_id: location.addressId ?? null,
		delivery_date: location.deliveryDate ?? null,
		delivery_hour: location.deliveryHour ?? null,
		delivery_period: location.deliveryPeriod ?? null,
	}))

	const { data: insertedLocations, error: insertLocationsError } =
		await supabase
			.from('quote_request_locations')
			.insert(locationRows)
			.select('id, sort_order')
	if (insertLocationsError) throw new Error(insertLocationsError.message)

	const locationIdBySortOrder = new Map(
		(insertedLocations ?? []).map((location) => [
			Number(location.sort_order),
			location.id,
		]),
	)

	for (const [index, location] of locations.entries()) {
		const quoteRequestLocationId = locationIdBySortOrder.get(index)
		if (!quoteRequestLocationId) {
			throw new Error('Failed to create quote request delivery location')
		}
		await insertQuoteRequestItems(supabase, quoteRequestId, location.items, {
			quoteRequestLocationId,
			requireOrderableProductLinks: true,
		})
	}

	const associateRows = associates.map((associate, index) => ({
		quote_request_id: quoteRequestId,
		sort_order: index,
		name: associate.name.trim(),
		country_code: associate.countryCode.trim(),
		number: associate.number.trim(),
	}))

	if (associateRows.length === 0) return

	const { error: insertAssociatesError } = await supabase
		.from('quote_request_associates')
		.insert(associateRows)
	if (insertAssociatesError) throw new Error(insertAssociatesError.message)
}
