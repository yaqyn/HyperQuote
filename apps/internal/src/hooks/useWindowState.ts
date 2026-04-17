import { useCallback, useEffect } from 'react'
import { useInternalStore, type WindowState } from '../stores/internal'

/**
 * Hook for reading and saving per-module window state.
 * Automatically saves scroll position on unmount.
 */
export function useWindowState(moduleId: string) {
	const state = useInternalStore((s) => s.getWindowState(moduleId))
	const saveWindowState = useInternalStore((s) => s.saveWindowState)

	const save = useCallback(
		(partial: Partial<WindowState>) => saveWindowState(moduleId, partial),
		[moduleId, saveWindowState],
	)

	// Save scroll position on unmount
	useEffect(() => {
		return () => {
			const el = document.querySelector('[data-module-content]')
			if (el) {
				saveWindowState(moduleId, { scrollTop: el.scrollTop })
			}
		}
	}, [moduleId, saveWindowState])

	return { state, save }
}
