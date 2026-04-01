/**
 * Zustand store for quote builder multi-step state.
 * Persisted to localStorage with skipHydration for SSR safety.
 * Holds items, step, delivery details, and draft metadata.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

export interface QuoteItem {
  id: string
  productId?: string
  customerDescription: string
  quantity: number
  unitOfMeasure: string
  notes?: string
  matchConfidence?: number
  sortOrder: number
  isUnmatched: boolean
}

interface QuoteBuilderState {
  step: 1 | 2 | 3
  items: QuoteItem[]
  draftId: string | null
  projectId: string | null
  deliveryAddressId: string | null
  deliveryDate: string | null
  notes: string
  attachments: File[]
  isDirty: boolean
}

interface QuoteBuilderActions {
  setStep: (step: 1 | 2 | 3) => void
  addItem: (item: QuoteItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<QuoteItem>) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  setItems: (items: QuoteItem[]) => void
  setProjectId: (id: string | null) => void
  setDeliveryAddressId: (id: string | null) => void
  setDeliveryDate: (date: string | null) => void
  setNotes: (notes: string) => void
  setAttachments: (files: File[]) => void
  setDraftId: (id: string | null) => void
  reset: () => void
}

type QuoteBuilderStore = QuoteBuilderState & QuoteBuilderActions

// ============================================================================
// Initial state
// ============================================================================

const initialState: QuoteBuilderState = {
  step: 1,
  items: [],
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
          items: [...state.items, item],
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
          items: items.map((item, idx) => ({ ...item, sortOrder: idx })),
          isDirty: true,
        }),

      setProjectId: (id) => set({ projectId: id, isDirty: true }),
      setDeliveryAddressId: (id) => set({ deliveryAddressId: id, isDirty: true }),
      setDeliveryDate: (date) => set({ deliveryDate: date, isDirty: true }),
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
        draftId: state.draftId,
        projectId: state.projectId,
        deliveryAddressId: state.deliveryAddressId,
        deliveryDate: state.deliveryDate,
        notes: state.notes,
        isDirty: state.isDirty,
      }),
    },
  ),
)
