import {
	DEFAULT_QUOTE_LOCATION_CLIENT_ID,
	type QuoteAssociate,
	type QuoteAttachment,
	type QuoteDeliveryPeriod,
	type QuoteItem,
	type QuoteLocation,
} from '../stores/quote-builder'

interface QuoteItemPayload {
	productId?: string
	customerDescription: string
	quantity: number
	unitOfMeasure: string
	unitOfMeasureAr?: string
	notes?: string
	sortOrder: number
	matchConfidence?: number
	isUnmatched?: boolean
}

interface QuoteBuilderPayloadSource {
	draftId: string | null
	items: QuoteItem[]
	locations?: QuoteLocation[]
	associates?: QuoteAssociate[]
	deliveryAddressId: string | null
	deliveryDate: string | null
	notes: string
	projectId: string | null
	attachments?: QuoteAttachment[]
}

interface QuoteSubmissionPayload {
	draftId?: string
	items: QuoteItemPayload[]
	locations: QuoteLocationPayload[]
	associates?: QuoteAssociatePayload[]
	deliveryAddressId?: string
	deliveryDate?: string
	notes?: string
	projectId?: string
	attachmentUrls?: string[]
}

interface QuoteLocationPayload {
	clientId: string
	addressId?: string
	deliveryDate?: string
	deliveryHour?: number
	deliveryPeriod?: QuoteDeliveryPeriod
	items: QuoteItemPayload[]
}

interface QuoteAssociatePayload {
	name: string
	countryCode: string
	number: string
}

function toQuoteItemPayload(item: QuoteItem): QuoteItemPayload {
	const payload: QuoteItemPayload = {
		productId: item.productId,
		customerDescription: item.customerDescription,
		quantity: item.quantity,
		unitOfMeasure: item.unitOfMeasure,
		notes: item.notes,
		sortOrder: item.sortOrder,
		matchConfidence: item.matchConfidence,
		isUnmatched: item.isUnmatched,
	}
	if (item.unitOfMeasureAr) payload.unitOfMeasureAr = item.unitOfMeasureAr
	return payload
}

export function toQuoteItemsPayload(items: QuoteItem[]): QuoteItemPayload[] {
	return items.map(toQuoteItemPayload)
}

function normalizeLocations(
	state: Pick<
		QuoteBuilderPayloadSource,
		'deliveryAddressId' | 'deliveryDate' | 'items' | 'locations'
	>,
): QuoteLocation[] {
	const locations =
		state.locations && state.locations.length > 0
			? state.locations
			: [
					{
						clientId: DEFAULT_QUOTE_LOCATION_CLIENT_ID,
						addressId: state.deliveryAddressId,
						deliveryDate: state.deliveryDate,
						deliveryHour: null,
						deliveryPeriod: null,
					},
				]

	return locations.map((location, index) => ({
		...location,
		clientId:
			location.clientId || `${DEFAULT_QUOTE_LOCATION_CLIENT_ID}-${index}`,
		addressId:
			index === 0
				? (location.addressId ?? state.deliveryAddressId)
				: location.addressId,
		deliveryDate:
			index === 0
				? (location.deliveryDate ?? state.deliveryDate)
				: location.deliveryDate,
	}))
}

function toQuoteLocationsPayload(
	state: Pick<
		QuoteBuilderPayloadSource,
		'deliveryAddressId' | 'deliveryDate' | 'items' | 'locations'
	>,
): QuoteLocationPayload[] {
	const locations = normalizeLocations(state)
	const fallbackClientId =
		locations[0]?.clientId ?? DEFAULT_QUOTE_LOCATION_CLIENT_ID

	return locations
		.map((location) => {
			const locationItems = state.items.filter(
				(item) =>
					(item.locationClientId ?? fallbackClientId) === location.clientId,
			)
			return {
				clientId: location.clientId,
				addressId: location.addressId ?? undefined,
				deliveryDate: location.deliveryDate ?? undefined,
				deliveryHour: location.deliveryHour ?? undefined,
				deliveryPeriod: location.deliveryPeriod ?? undefined,
				items: toQuoteItemsPayload(locationItems),
			}
		})
		.filter((location) => location.items.length > 0)
}

function toQuoteAssociatesPayload(
	associates: QuoteAssociate[] | undefined,
): QuoteAssociatePayload[] | undefined {
	const payload = (associates ?? [])
		.map((associate) => ({
			name: associate.name.trim(),
			countryCode: associate.countryCode.trim(),
			number: associate.number.trim(),
		}))
		.filter(
			(associate) =>
				associate.name.length > 0 &&
				associate.countryCode.length > 0 &&
				associate.number.length > 0,
		)

	return payload.length > 0 ? payload : undefined
}

export function toQuoteSubmissionPayload(
	state: QuoteBuilderPayloadSource,
): QuoteSubmissionPayload {
	return {
		draftId: state.draftId ?? undefined,
		items: toQuoteItemsPayload(state.items),
		locations: toQuoteLocationsPayload(state),
		associates: toQuoteAssociatesPayload(state.associates),
		deliveryAddressId: state.deliveryAddressId ?? undefined,
		deliveryDate: state.deliveryDate ?? undefined,
		notes: state.notes || undefined,
		projectId: state.projectId ?? undefined,
		attachmentUrls: state.attachments?.map((attachment) => attachment.url),
	}
}

export function toQuoteDraftPayload(
	state: QuoteBuilderPayloadSource,
): QuoteSubmissionPayload & { draftId?: string } {
	return {
		draftId: state.draftId ?? undefined,
		...toQuoteSubmissionPayload(state),
	}
}
