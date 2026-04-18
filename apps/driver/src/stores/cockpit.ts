/**
 * App UI state — selected order, current message thread, theme, language.
 * Persisted so the app comes back exactly as you left it.
 *
 * (Store key remains `driver-cockpit` for migration continuity.)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThreadId } from '../lib/types'

type Theme = 'dark' | 'light'
type Lang = 'en' | 'ar'

interface AppState {
	activeOrderId: string
	threadId: ThreadId
	theme: Theme
	lang: Lang
	setActiveOrderId: (id: string) => void
	setThreadId: (t: ThreadId) => void
	toggleTheme: () => void
	setLang: (l: Lang) => void
}

export const useApp = create<AppState>()(
	persist(
		(set) => ({
			activeOrderId: 'ord-7204',
			threadId: 'warehouse',
			theme: 'light',
			lang: 'en',
			setActiveOrderId: (activeOrderId) => set({ activeOrderId }),
			setThreadId: (threadId) => set({ threadId }),
			toggleTheme: () =>
				set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
			setLang: (lang) => set({ lang }),
		}),
		{ name: 'driver-cockpit' },
	),
)
