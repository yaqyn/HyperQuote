import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PortalStore {
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
	pendingProjectId: string | undefined
	setPendingProjectId: (projectId: string | undefined) => void
	pendingQuoteDraftId: string | undefined
	setPendingQuoteDraftId: (draftId: string | undefined) => void
}

export const usePortalStore = create<PortalStore>()(
	persist(
		(set) => ({
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
			pendingProjectId: undefined,
			setPendingProjectId: (projectId) => set({ pendingProjectId: projectId }),
			pendingQuoteDraftId: undefined,
			setPendingQuoteDraftId: (draftId) =>
				set({ pendingQuoteDraftId: draftId }),
		}),
		{
			name: 'hq-portal',
			// Only persist sidebar preference; the rest is session state.
			partialize: (s) => ({ isSidebarOpen: s.isSidebarOpen }),
		},
	),
)
