import { create } from 'zustand'
import type { LineDecision } from '../types/quote'

interface QuoteActionsStore {
  mode: 'view' | 'counter-total' | 'counter-per-line' | 'partial'
  setMode: (mode: QuoteActionsStore['mode']) => void
  // Counter-offer state
  modifiedPrices: Record<string, number>
  modifiedQuantities: Record<string, number>
  totalDiscount: number | null
  counterNotes: string
  selfPickup: boolean
  setItemPrice: (itemId: string, price: number) => void
  setItemQuantity: (itemId: string, qty: number) => void
  setTotalDiscount: (discount: number | null) => void
  setCounterNotes: (notes: string) => void
  setSelfPickup: (pickup: boolean) => void
  // Partial accept state
  lineDecisions: Record<string, LineDecision>
  rejectReasons: Record<string, string>
  negotiatedPrices: Record<string, number>
  setLineDecision: (
    itemId: string,
    decision: 'accepted' | 'rejected' | 'negotiate',
  ) => void
  setRejectReason: (itemId: string, reason: string) => void
  setNegotiatedPrice: (itemId: string, price: number) => void
  // Computed helpers
  getModifiedCount: () => number
  getDecisionSummary: () => {
    accepted: number
    rejected: number
    pending: number
  }
  allDecided: () => boolean
  // Reset
  reset: () => void
}

const initialState = {
  mode: 'view' as const,
  modifiedPrices: {} as Record<string, number>,
  modifiedQuantities: {} as Record<string, number>,
  totalDiscount: null as number | null,
  counterNotes: '',
  selfPickup: false,
  lineDecisions: {} as Record<string, LineDecision>,
  rejectReasons: {} as Record<string, string>,
  negotiatedPrices: {} as Record<string, number>,
}

export const useQuoteActionsStore = create<QuoteActionsStore>()((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  // Counter-offer actions
  setItemPrice: (itemId, price) =>
    set((s) => ({
      modifiedPrices: { ...s.modifiedPrices, [itemId]: price },
    })),

  setItemQuantity: (itemId, qty) =>
    set((s) => ({
      modifiedQuantities: { ...s.modifiedQuantities, [itemId]: qty },
    })),

  setTotalDiscount: (discount) => set({ totalDiscount: discount }),

  setCounterNotes: (notes) => set({ counterNotes: notes }),

  setSelfPickup: (pickup) => set({ selfPickup: pickup }),

  // Partial accept actions
  setLineDecision: (itemId, decision) =>
    set((s) => ({
      lineDecisions: { ...s.lineDecisions, [itemId]: decision },
    })),

  setRejectReason: (itemId, reason) =>
    set((s) => ({
      rejectReasons: { ...s.rejectReasons, [itemId]: reason },
    })),

  setNegotiatedPrice: (itemId, price) =>
    set((s) => ({
      negotiatedPrices: { ...s.negotiatedPrices, [itemId]: price },
    })),

  // Computed helpers
  getModifiedCount: () => Object.keys(get().modifiedPrices).length,

  getDecisionSummary: () => {
    const decisions = Object.values(get().lineDecisions)
    return {
      accepted: decisions.filter((d) => d === 'accepted').length,
      rejected: decisions.filter((d) => d === 'rejected').length,
      pending: decisions.filter((d) => d === 'pending').length,
    }
  },

  allDecided: () => {
    const decisions = Object.values(get().lineDecisions)
    return decisions.length > 0 && decisions.every((d) => d !== 'pending')
  },

  // Reset
  reset: () => set(initialState),
}))
