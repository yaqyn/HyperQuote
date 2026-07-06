/**
 * Zustand store for quote builder multi-step state.
 * Persisted to localStorage with skipHydration for SSR safety.
 * Holds items, step, delivery details, and draft metadata.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

export interface QuoteItem {
	id: string
	productId?: string
	locationClientId?: string
	customerDescription: string
	quantity: number
	unitOfMeasure: string
	unitOfMeasureAr?: string
	notes?: string
	matchConfidence?: number
	sortOrder: number
	isUnmatched: boolean
}

export interface QuoteAttachment {
	name: string
	size: number
	type: string
	url: string
}

export type QuoteDeliveryPeriod = 'AM' | 'PM'

export interface QuoteLocation {
	clientId: string
	addressId: string | null
	deliveryDate: string | null
	deliveryHour: number | null
	deliveryPeriod: QuoteDeliveryPeriod | null
}

export interface QuoteAssociate {
	id: string
	name: string
	countryCode: string
	number: string
}

interface QuoteBuilderState {
	step: 1 | 2 | 3
	items: QuoteItem[]
	locations: QuoteLocation[]
	associates: QuoteAssociate[]
	draftId: string | null
	projectId: string | null
	deliveryAddressId: string | null
	deliveryDate: string | null
	notes: string
	attachments: QuoteAttachment[]
	isDirty: boolean
}

interface QuoteBuilderActions {
	setStep: (step: 1 | 2 | 3) => void
	addItem: (item: QuoteItem) => void
	removeItem: (id: string) => void
	updateItem: (id: string, updates: Partial<QuoteItem>) => void
	reorderItems: (fromIndex: number, toIndex: number) => void
	setItems: (items: QuoteItem[]) => void
	addLocation: () => string
	updateLocation: (
		clientId: string,
		updates: Partial<Omit<QuoteLocation, 'clientId'>>,
	) => void
	removeLocation: (clientId: string) => void
	moveItemToLocation: (itemId: string, locationClientId: string) => void
	applyDeliveryToAllLocations: (
		delivery: Pick<
			QuoteLocation,
			'deliveryDate' | 'deliveryHour' | 'deliveryPeriod'
		>,
	) => void
	addAssociate: () => string
	updateAssociate: (
		id: string,
		updates: Partial<Omit<QuoteAssociate, 'id'>>,
	) => void
	removeAssociate: (id: string) => void
	setProjectId: (id: string | null) => void
	setDeliveryAddressId: (id: string | null) => void
	setDeliveryDate: (date: string | null) => void
	setDeliveryHour: (hour: number | null) => void
	setDeliveryPeriod: (period: QuoteDeliveryPeriod | null) => void
	setNotes: (notes: string) => void
	setAttachments: (files: QuoteAttachment[]) => void
	setDraftId: (id: string | null) => void
	reset: () => void
}

type QuoteBuilderStore = QuoteBuilderState & QuoteBuilderActions

export const DEFAULT_QUOTE_LOCATION_CLIENT_ID = 'default-location'

// ============================================================================
// Initial state
// ============================================================================

const initialState: QuoteBuilderState = {
	step: 1,
	items: [],
	locations: [
		{
			clientId: DEFAULT_QUOTE_LOCATION_CLIENT_ID,
			addressId: null,
			deliveryDate: null,
			deliveryHour: null,
			deliveryPeriod: null,
		},
	],
	associates: [],
	draftId: null,
	projectId: null,
	deliveryAddressId: null,
	deliveryDate: null,
	notes: '',
	attachments: [],
	isDirty: false,
}

// ============================================================================
// Store
// ============================================================================

export const useQuoteBuilderStore = create<QuoteBuilderStore>()(
	persist(
		(set, _get) => ({
			...initialState,

			setStep: (step) => set({ step }),

			addItem: (item) =>
				set((state) => ({
					items: [
						...state.items,
						{
							...item,
							locationClientId:
								item.locationClientId ?? DEFAULT_QUOTE_LOCATION_CLIENT_ID,
						},
					],
					isDirty: true,
				})),

			removeItem: (id) =>
				set((state) => ({
					items: state.items
						.filter((i) => i.id !== id)
						.map((item, idx) => ({ ...item, sortOrder: idx })),
					isDirty: true,
				})),

			updateItem: (id, updates) =>
				set((state) => ({
					items: state.items.map((item) =>
						item.id === id ? { ...item, ...updates } : item,
					),
					isDirty: true,
				})),

			reorderItems: (fromIndex, toIndex) =>
				set((state) => {
					const newItems = [...state.items]
					const [moved] = newItems.splice(fromIndex, 1)
					newItems.splice(toIndex, 0, moved)
					return {
						items: newItems.map((item, idx) => ({ ...item, sortOrder: idx })),
						isDirty: true,
					}
				}),

			setItems: (items) =>
				set({
					items: items.map((item, idx) => ({
						...item,
						locationClientId:
							item.locationClientId ?? DEFAULT_QUOTE_LOCATION_CLIENT_ID,
						sortOrder: idx,
					})),
					isDirty: true,
				}),

			addLocation: () => {
				const clientId = randomClientId('loc')
				set((state) => ({
					locations: [
						...normalizedLocations(state),
						{
							clientId,
							addressId: null,
							deliveryDate: state.deliveryDate,
							deliveryHour: null,
							deliveryPeriod: null,
						},
					],
					isDirty: true,
				}))
				return clientId
			},

			updateLocation: (clientId, updates) =>
				set((state) => {
					const locations = normalizedLocations(state).map((location) =>
						location.clientId === clientId
							? { ...location, ...updates }
							: location,
					)
					const first = locations[0]
					return {
						locations,
						deliveryAddressId: first?.addressId ?? state.deliveryAddressId,
						deliveryDate: first?.deliveryDate ?? state.deliveryDate,
						isDirty: true,
					}
				}),

			removeLocation: (clientId) =>
				set((state) => {
					const currentLocations = normalizedLocations(state)
					if (currentLocations.length <= 1) return state
					const nextLocations = currentLocations.filter(
						(location) => location.clientId !== clientId,
					)
					const fallbackClientId =
						nextLocations[0]?.clientId ?? DEFAULT_QUOTE_LOCATION_CLIENT_ID
					return {
						locations: nextLocations,
						items: state.items.map((item) =>
							item.locationClientId === clientId
								? { ...item, locationClientId: fallbackClientId }
								: item,
						),
						deliveryAddressId:
							nextLocations[0]?.addressId ?? state.deliveryAddressId,
						deliveryDate: nextLocations[0]?.deliveryDate ?? state.deliveryDate,
						isDirty: true,
					}
				}),

			moveItemToLocation: (itemId, locationClientId) =>
				set((state) => ({
					items: state.items.map((item) =>
						item.id === itemId ? { ...item, locationClientId } : item,
					),
					isDirty: true,
				})),

			applyDeliveryToAllLocations: (delivery) =>
				set((state) => ({
					locations: normalizedLocations(state).map((location) => ({
						...location,
						...delivery,
					})),
					deliveryDate: delivery.deliveryDate,
					isDirty: true,
				})),

			addAssociate: () => {
				const id = randomClientId('assoc')
				set((state) => ({
					associates: [
						...state.associates,
						{ id, name: '', countryCode: '+20', number: '' },
					],
					isDirty: true,
				}))
				return id
			},

			updateAssociate: (id, updates) =>
				set((state) => ({
					associates: state.associates.map((associate) =>
						associate.id === id ? { ...associate, ...updates } : associate,
					),
					isDirty: true,
				})),

			removeAssociate: (id) =>
				set((state) => ({
					associates: state.associates.filter(
						(associate) => associate.id !== id,
					),
					isDirty: true,
				})),

			setProjectId: (id) => set({ projectId: id, isDirty: true }),
			setDeliveryAddressId: (id) =>
				set((state) => ({
					deliveryAddressId: id,
					locations: updateFirstLocation(state, { addressId: id }),
					isDirty: true,
				})),
			setDeliveryDate: (date) =>
				set((state) => ({
					deliveryDate: date,
					locations: updateFirstLocation(state, { deliveryDate: date }),
					isDirty: true,
				})),
			setDeliveryHour: (hour) =>
				set((state) => ({
					locations: updateFirstLocation(state, { deliveryHour: hour }),
					isDirty: true,
				})),
			setDeliveryPeriod: (period) =>
				set((state) => ({
					locations: updateFirstLocation(state, { deliveryPeriod: period }),
					isDirty: true,
				})),
			setNotes: (notes) => set({ notes, isDirty: true }),
			setAttachments: (files) => set({ attachments: files, isDirty: true }),
			setDraftId: (id) => set({ draftId: id }),

			reset: () => set(initialState),
		}),
		{
			name: 'quote-draft',
			storage: createJSONStorage(() => localStorage),
			skipHydration: true,
			// File objects are not serializable -- exclude attachments from persistence
			partialize: (state) => ({
				step: state.step,
				items: state.items,
				locations: state.locations,
				associates: state.associates,
				draftId: state.draftId,
				projectId: state.projectId,
				deliveryAddressId: state.deliveryAddressId,
				deliveryDate: state.deliveryDate,
				notes: state.notes,
				attachments: state.attachments,
				isDirty: state.isDirty,
			}),
		},
	),
)

function normalizedLocations(state: Pick<QuoteBuilderState, 'locations'>) {
	return state.locations.length > 0 ? state.locations : initialState.locations
}

function updateFirstLocation(
	state: Pick<QuoteBuilderState, 'locations'>,
	updates: Partial<Omit<QuoteLocation, 'clientId'>>,
) {
	const locations = normalizedLocations(state)
	return locations.map((location, index) =>
		index === 0 ? { ...location, ...updates } : location,
	)
}

function randomClientId(prefix: string): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return `${prefix}-${crypto.randomUUID()}`
	}
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
