import { create } from 'zustand'

export type FinanceTab = 'payments' | 'accounting'

type FinanceInboxFilter = 'unpaid' | 'partial' | 'paid'

interface FinanceStore {
	activeTab: FinanceTab
	setActiveTab: (tab: FinanceTab) => void

	inboxFilter: FinanceInboxFilter
	setInboxFilter: (filter: FinanceInboxFilter) => void

	selectedOrderId: string | null
	setSelectedOrderId: (id: string | null) => void

	selectedDealId: string | null
	setSelectedDealId: (id: string | null) => void

	// Slide-in overlay dismissal handler — mirrors procurement store.
	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (fn: (() => boolean) | null) => void
}

export const useFinanceStore = create<FinanceStore>()(
	(set) => ({
		activeTab: 'payments',
		setActiveTab: (tab) => set({ activeTab: tab }),

		inboxFilter: 'unpaid',
		setInboxFilter: (filter) => set({ inboxFilter: filter }),

		selectedOrderId: null,
		setSelectedOrderId: (id) =>
			set({ selectedOrderId: id, selectedDealId: null }),

		selectedDealId: null,
		setSelectedDealId: (id) =>
			set({ selectedDealId: id, selectedOrderId: null }),

		overlayCloseHandler: null,
		setOverlayCloseHandler: (fn) => set({ overlayCloseHandler: fn }),
	}),
	// @ts-expect-error -- skipHydration is a valid persist middleware option
	{ skipHydration: true },
)
