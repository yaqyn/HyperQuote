import { create } from 'zustand'
import type { FinanceTab, PaymentMethod } from '../types/finance'

interface ARFilters {
  tier?: string
  salesRep?: string
  dateRange?: { start: string; end: string }
  amountRange?: { min: number; max: number }
  groupBy?: 'customer' | 'region' | 'salesperson'
}

interface PaymentFlowState {
  step: 'select_method' | 'details' | 'allocate' | 'confirm'
  method?: PaymentMethod
}

interface FinanceStore {
  // Tab navigation
  activeTab: FinanceTab
  setActiveTab: (tab: FinanceTab) => void

  // Entity selection
  selectedInvoiceId: string | null
  setSelectedInvoiceId: (id: string | null) => void

  selectedCustomerId: string | null
  setSelectedCustomerId: (id: string | null) => void

  selectedChequeId: string | null
  setSelectedChequeId: (id: string | null) => void

  // AR filters
  arFilters: ARFilters
  setARFilters: (filters: Partial<ARFilters>) => void
  clearARFilters: () => void

  // Payment recording flow
  paymentFlow: PaymentFlowState
  setPaymentFlowStep: (step: PaymentFlowState['step'], method?: PaymentMethod) => void
  resetPaymentFlow: () => void
}

const DEFAULT_AR_FILTERS: ARFilters = {}

const DEFAULT_PAYMENT_FLOW: PaymentFlowState = {
  step: 'select_method',
}

export const useFinanceStore = create<FinanceStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'home',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Entity selection
    selectedInvoiceId: null,
    setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),

    selectedCustomerId: null,
    setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),

    selectedChequeId: null,
    setSelectedChequeId: (id) => set({ selectedChequeId: id }),

    // AR filters
    arFilters: DEFAULT_AR_FILTERS,
    setARFilters: (filters) =>
      set((state) => ({ arFilters: { ...state.arFilters, ...filters } })),
    clearARFilters: () => set({ arFilters: DEFAULT_AR_FILTERS }),

    // Payment recording flow
    paymentFlow: DEFAULT_PAYMENT_FLOW,
    setPaymentFlowStep: (step, method) =>
      set((state) => ({
        paymentFlow: { ...state.paymentFlow, step, ...(method !== undefined ? { method } : {}) },
      })),
    resetPaymentFlow: () => set({ paymentFlow: DEFAULT_PAYMENT_FLOW }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
