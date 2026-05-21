import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface CartItem {
	productId: string
	slug: string
	name: string
	nameAr: string
	category: string
	unitOfMeasure: string
	unitOfMeasureAr: string
	quantity: number
	imageUrl: string | null
	note: string
}

interface QuoteCartState {
	items: CartItem[]
	globalNote: string
	add: (item: Omit<CartItem, 'quantity' | 'note'>, quantity?: number) => void
	remove: (productId: string) => void
	updateQuantity: (productId: string, quantity: number) => void
	updateNote: (productId: string, note: string) => void
	setGlobalNote: (note: string) => void
	duplicate: (productId: string) => void
	clear: () => void
	totalUnits: () => number
}

export const useQuoteCart = create<QuoteCartState>()(
	persist(
		(set, get) => ({
			items: [],
			globalNote: '',
			add: (item, quantity = 1) =>
				set((state) => {
					const existing = state.items.find(
						(i) => i.productId === item.productId,
					)
					if (existing) {
						return {
							items: state.items.map((i) =>
								i.productId === item.productId
									? { ...i, quantity: i.quantity + quantity }
									: i,
							),
						}
					}
					return { items: [...state.items, { ...item, quantity, note: '' }] }
				}),
			remove: (productId) =>
				set((state) => ({
					items: state.items.filter((i) => i.productId !== productId),
				})),
			updateQuantity: (productId, quantity) =>
				set((state) => {
					if (!Number.isFinite(quantity)) return state
					const nextQuantity = Math.max(0, Math.floor(quantity))
					return {
						items: state.items.map((i) =>
							i.productId === productId ? { ...i, quantity: nextQuantity } : i,
						),
					}
				}),
			updateNote: (productId, note) =>
				set((state) => ({
					items: state.items.map((i) =>
						i.productId === productId ? { ...i, note } : i,
					),
				})),
			setGlobalNote: (globalNote) => set({ globalNote }),
			duplicate: (productId) =>
				set((state) => {
					const item = state.items.find((i) => i.productId === productId)
					if (!item) return state
					const clone = {
						...item,
						productId: `${item.productId}-${Date.now()}`,
						note: '',
					}
					return { items: [...state.items, clone] }
				}),
			clear: () => set({ items: [], globalNote: '' }),
			totalUnits: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
		}),
		{
			name: 'hq-website-quote-cart',
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				globalNote: state.globalNote,
				items: state.items,
			}),
		},
	),
)
