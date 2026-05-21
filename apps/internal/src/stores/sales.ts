import { create } from 'zustand'

interface SalesNewQuoteCustomer {
	id: string
	name: string
	address?: string
	companyName?: string
	contactName?: string
	email?: string | null
	phone?: string
}

interface SalesStore {
	editingRfqId: string | null
	newQuoteCustomer: SalesNewQuoteCustomer | null
	newQuoteRequestId: number
	statusDialogRequestId: number
	setEditingRfqId: (id: string | null) => void
	setNewQuoteCustomer: (c: SalesNewQuoteCustomer | null) => void
	requestNewQuote: () => void
	requestStatusDialog: () => void
	// True when the quote builder is showing (either editing an RFQ or creating a new quote).
	// Used by ModuleWindow so clicking the X / backdrop closes the builder first, then the panel.
	isQuoteBuilderOpen: () => boolean
	closeQuoteBuilder: () => void
	// When the quote builder has a slide-in overlay open (map / line margin),
	// it registers a handler here. ModuleWindow calls it on panel X click;
	// the handler returns `true` if it dismissed an overlay (swallowing the
	// close), or `false` if nothing was open (letting the panel close).
	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (fn: (() => boolean) | null) => void
}

export const useSalesStore = create<SalesStore>()(
	(set) => ({
		editingRfqId: null,
		newQuoteCustomer: null,
		newQuoteRequestId: 0,
		statusDialogRequestId: 0,
		setEditingRfqId: (id) => set({ editingRfqId: id }),
		setNewQuoteCustomer: (c) => set({ newQuoteCustomer: c }),
		requestNewQuote: () =>
			set((s) => ({ newQuoteRequestId: s.newQuoteRequestId + 1 })),
		requestStatusDialog: () =>
			set((s) => ({ statusDialogRequestId: s.statusDialogRequestId + 1 })),
		isQuoteBuilderOpen: () => {
			const s = (
				useSalesStore as unknown as { getState: () => SalesStore }
			).getState()
			return !!s.editingRfqId || !!s.newQuoteCustomer
		},
		closeQuoteBuilder: () =>
			set({ editingRfqId: null, newQuoteCustomer: null }),
		overlayCloseHandler: null,
		setOverlayCloseHandler: (fn) => set({ overlayCloseHandler: fn }),
	}),
	// SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
	// @ts-expect-error -- skipHydration is a valid persist middleware option
	{ skipHydration: true },
)
