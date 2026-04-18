import type { BroadCategory } from '@hyperquote/types'
import { create } from 'zustand'
import type { ProcurementTab, SourcingView } from '../types/procurement'

interface InquiryFilters {
	status?: string
	supplierId?: string
	dateRange?: { from: string; to: string }
}

interface POFilters {
	status?: string
	supplierId?: string
	dateRange?: { from: string; to: string }
}

/** Category filter used by all three compendium tabs. A single axis shared
 * across Atlas / Desk / Commitments so clicking "cement" in the sidebar
 * narrows every view in sync. */
export type CompendiumCategory = BroadCategory | 'all'

interface ProcurementStore {
	// Tab navigation
	activeTab: ProcurementTab
	setActiveTab: (tab: ProcurementTab) => void

	// Cross-tab category filter (from the compendium sidebar index)
	activeCategory: CompendiumCategory
	setActiveCategory: (category: CompendiumCategory) => void

	// Inquiry state
	selectedInquiryId: string | null
	setSelectedInquiryId: (id: string | null) => void
	inquiryFilters: InquiryFilters
	setInquiryFilters: (filters: InquiryFilters) => void

	// PO state
	selectedPOId: string | null
	setSelectedPOId: (id: string | null) => void
	poFilters: POFilters
	setPOFilters: (filters: POFilters) => void

	// Directory
	directorySearch: string
	setDirectorySearch: (search: string) => void

	// Supplier detail (scorecard drill-down)
	selectedSupplierId: string | null
	setSelectedSupplierId: (id: string | null) => void

	// Pre-selected supplier for inquiry builder (scorecard → sourcing flow)
	preSelectedSupplierId: string | null
	setPreSelectedSupplierId: (id: string | null) => void
	consumePreSelectedSupplierId: () => string | null

	// Sourcing view (inquiry list vs comparison matrix)
	sourcingView: SourcingView
	setSourcingView: (view: SourcingView) => void

	// Slide-in overlay dismissal handler. Each view that renders a side
	// panel (RefillPanel, ProductDetailModal, SupplierProfileModal) registers
	// a closer here; ModuleWindow.handleClose calls it first so the outer
	// panel X dismisses the overlay before dismissing the whole panel.
	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (fn: (() => boolean) | null) => void
}

export const useProcurementStore = create<ProcurementStore>()(
	(set) => ({
		// Tab navigation
		activeTab: 'stock',
		setActiveTab: (tab) => set({ activeTab: tab }),

		// Cross-tab category filter
		activeCategory: 'all',
		setActiveCategory: (category) => set({ activeCategory: category }),

		// Inquiry state
		selectedInquiryId: null,
		setSelectedInquiryId: (id) => set({ selectedInquiryId: id }),
		inquiryFilters: {},
		setInquiryFilters: (filters) => set({ inquiryFilters: filters }),

		// PO state
		selectedPOId: null,
		setSelectedPOId: (id) => set({ selectedPOId: id }),
		poFilters: {},
		setPOFilters: (filters) => set({ poFilters: filters }),

		// Directory
		directorySearch: '',
		setDirectorySearch: (search) => set({ directorySearch: search }),

		// Supplier detail (scorecard drill-down)
		selectedSupplierId: null,
		setSelectedSupplierId: (id) => set({ selectedSupplierId: id }),

		// Pre-selected supplier for inquiry builder
		preSelectedSupplierId: null,
		setPreSelectedSupplierId: (id) => set({ preSelectedSupplierId: id }),
		consumePreSelectedSupplierId: () => {
			const current = useProcurementStore.getState().preSelectedSupplierId
			if (current) set({ preSelectedSupplierId: null })
			return current
		},

		// Sourcing view
		sourcingView: 'inquiry',
		setSourcingView: (view) => set({ sourcingView: view }),

		overlayCloseHandler: null,
		setOverlayCloseHandler: (fn) => set({ overlayCloseHandler: fn }),
	}),
	// SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
	// @ts-expect-error -- skipHydration is a valid persist middleware option
	{ skipHydration: true },
)
