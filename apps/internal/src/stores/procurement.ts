import type { BroadCategory } from '@hyperquote/types'
import { create } from 'zustand'
import type { ProcurementTab } from '../types/procurement'

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

	// Slide-in overlay dismissal handler. Each view that renders a side
	// panel (RefillPanel, ProductDetailModal) registers a closer here;
	// ModuleWindow.handleClose calls it first so the outer panel X dismisses
	// the overlay before dismissing the whole panel.
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

		overlayCloseHandler: null,
		setOverlayCloseHandler: (fn) => set({ overlayCloseHandler: fn }),
	}),
	// SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
	// @ts-expect-error -- skipHydration is a valid persist middleware option
	{ skipHydration: true },
)
