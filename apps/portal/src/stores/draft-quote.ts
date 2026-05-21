import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
	type DraftCartItem,
	sanitizeDraftQuoteSnapshot,
} from '../lib/draft-quote-cart'

interface DraftQuoteState {
	items: DraftCartItem[]
	globalNote: string
	add: (
		item: Omit<DraftCartItem, 'quantity' | 'note'>,
		quantity?: number,
	) => void
	remove: (productId: string) => void
	updateQuantity: (productId: string, quantity: number) => void
	updateNote: (productId: string, note: string) => void
	setGlobalNote: (note: string) => void
	clear: () => void
}

export const useDraftQuoteStore = create<DraftQuoteState>()(
	persist(
		(set) => ({
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
				set((state) => ({
					items:
						quantity <= 0
							? state.items.filter((i) => i.productId !== productId)
							: state.items.map((i) =>
									i.productId === productId ? { ...i, quantity } : i,
								),
				})),
			updateNote: (productId, note) =>
				set((state) => ({
					items: state.items.map((i) =>
						i.productId === productId ? { ...i, note } : i,
					),
				})),
			setGlobalNote: (globalNote) => set({ globalNote }),
			clear: () => set({ items: [], globalNote: '' }),
		}),
		{
			merge: (persisted, current) => ({
				...current,
				...sanitizeDraftQuoteSnapshot(persisted),
			}),
			name: 'hq-draft-quote',
			partialize: (state) => ({
				globalNote: state.globalNote,
				items: state.items,
			}),
			storage: createJSONStorage(() => localStorage),
		},
	),
)
