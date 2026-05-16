import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PortalStore {
	activeRole: 'customer' | 'supplier'
	setActiveRole: (role: 'customer' | 'supplier') => void
	isFloatingAIOpen: boolean
	toggleFloatingAI: () => void
	setFloatingAIOpen: (open: boolean) => void
	isSigningOut: boolean
	setSigningOut: (v: boolean) => void
	// Sidebar visibility — hidden by default, persisted across sessions.
	isSidebarOpen: boolean
	toggleSidebar: () => void
	setSidebarOpen: (open: boolean) => void
	isDraftQuoteOpen: boolean
	setDraftQuoteOpen: (open: boolean) => void
}

export const usePortalStore = create<PortalStore>()(
	persist(
		(set) => ({
			activeRole: 'customer',
			setActiveRole: (role) => set({ activeRole: role }),
			isFloatingAIOpen: false,
			toggleFloatingAI: () =>
				set((s) => ({ isFloatingAIOpen: !s.isFloatingAIOpen })),
			setFloatingAIOpen: (open) => set({ isFloatingAIOpen: open }),
			isSigningOut: false,
			setSigningOut: (v) => set({ isSigningOut: v }),
			isSidebarOpen: false,
			toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
			setSidebarOpen: (open) => set({ isSidebarOpen: open }),
			isDraftQuoteOpen: false,
			setDraftQuoteOpen: (open) => set({ isDraftQuoteOpen: open }),
		}),
		{
			name: 'hq-portal',
			// Only persist sidebar preference; the rest is session state.
			partialize: (s) => ({ isSidebarOpen: s.isSidebarOpen }),
		},
	),
)
