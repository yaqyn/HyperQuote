import { create } from 'zustand'

interface OrderStatusStore {
	isOpen: boolean
	initialRfqId: string | null
	open: (rfqId?: string | null) => void
	close: () => void
	clearInitialRfqId: () => void
}

export const useOrderStatusStore = create<OrderStatusStore>()((set) => ({
	isOpen: false,
	initialRfqId: null,
	open: (rfqId = null) => set({ initialRfqId: rfqId, isOpen: true }),
	close: () => set({ initialRfqId: null, isOpen: false }),
	clearInitialRfqId: () => set({ initialRfqId: null }),
}))
