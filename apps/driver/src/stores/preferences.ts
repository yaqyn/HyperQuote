import { create } from 'zustand'
import type { DriverLanguage } from '../lib/driver-repository'

type DriverTheme = 'light' | 'dark'

const DRIVER_THEME_STORAGE_KEY = 'hq-driver-theme'

interface PreferencesState {
	language: DriverLanguage
	theme: DriverTheme
	setLanguage: (language: DriverLanguage) => void
	toggleLanguage: () => void
	toggleTheme: () => void
}

function readStoredTheme(): DriverTheme {
	if (typeof localStorage === 'undefined') return 'light'

	const stored = localStorage.getItem(DRIVER_THEME_STORAGE_KEY)
	return stored === 'dark' || stored === 'light' ? stored : 'light'
}

function persistTheme(theme: DriverTheme) {
	if (typeof localStorage === 'undefined') return

	localStorage.setItem(DRIVER_THEME_STORAGE_KEY, theme)
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
	language: 'en',
	theme: readStoredTheme(),
	setLanguage: (language) => set({ language }),
	toggleLanguage: () => {
		const nextLanguage = get().language === 'en' ? 'ar' : 'en'
		set({ language: nextLanguage })
	},
	toggleTheme: () => {
		const nextTheme = get().theme === 'light' ? 'dark' : 'light'
		persistTheme(nextTheme)
		set({ theme: nextTheme })
	},
}))
