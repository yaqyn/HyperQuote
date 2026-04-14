import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DraftItem {
  productId: string
  slug: string
  name: string
  nameAr: string
  category: string
  unitOfMeasure: string
  quantity: number
  imageUrl: string
  note: string
}

interface DraftQuoteState {
  items: DraftItem[]
  globalNote: string
  add: (item: Omit<DraftItem, 'quantity' | 'note'>, quantity?: number) => void
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
          const existing = state.items.find((i) => i.productId === item.productId)
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
      name: 'hq-draft-quote',
    },
  ),
)
