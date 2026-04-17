import { create } from 'zustand'
import type { EditorMode, VolumeId } from '../types/admin'

interface AdminStore {
	// ── Navigation ────────────────────────────────────────
	activeVolume: VolumeId
	setActiveVolume: (volume: VolumeId) => void

	// ── Per-volume search ─────────────────────────────────
	// Each volume keeps its own query so flipping between volumes doesn't
	// blow away a typed filter. Empty string = no filter.
	searchByVolume: Record<VolumeId, string>
	setSearch: (volume: VolumeId, query: string) => void

	// ── Editor panel ──────────────────────────────────────
	// `editorMode === null` is the closed state. Opening always sets both
	// the mode and the target id in one call (create pairs with a null id).
	selectedEntryId: string | null
	editorMode: EditorMode | null
	openEditor: (mode: EditorMode, entryId: string | null) => void
	closeEditor: () => void

	// ── Overlay close handler ─────────────────────────────
	// Populated by the editor slide panel while open; ModuleWindow's outer
	// X consults this first so the panel dismisses before the module does.
	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (handler: (() => boolean) | null) => void
}

const initialSearch: Record<VolumeId, string> = {
	customers: '',
	products: '',
	employees: '',
	drivers: '',
	suppliers: '',
}

export const useAdminStore = create<AdminStore>()(
	(set) => ({
		activeVolume: 'customers',
		setActiveVolume: (volume) =>
			set({ activeVolume: volume, editorMode: null, selectedEntryId: null }),

		searchByVolume: initialSearch,
		setSearch: (volume, query) =>
			set((s) => ({
				searchByVolume: { ...s.searchByVolume, [volume]: query },
			})),

		selectedEntryId: null,
		editorMode: null,
		openEditor: (mode, entryId) =>
			set({ editorMode: mode, selectedEntryId: entryId }),
		closeEditor: () => set({ editorMode: null, selectedEntryId: null }),

		overlayCloseHandler: null,
		setOverlayCloseHandler: (handler) => set({ overlayCloseHandler: handler }),
	}),
	// SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
	// @ts-expect-error -- skipHydration is a valid persist middleware option
	{ skipHydration: true },
)
