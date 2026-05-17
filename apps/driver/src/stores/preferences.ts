import { create } from 'zustand'
import type { DriverLanguage } from '../lib/driver-repository'
import { setDriverLanguage } from '../lib/i18n'

type DriverTheme = 'light' | 'dark'

interface PreferencesState {
	language: DriverLanguage
	theme: DriverTheme
	setLanguage: (language: DriverLanguage) => void
	toggleLanguage: () => void
	toggleTheme: () => void
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
	language: 'en',
	theme: 'light',
	setLanguage: (language) => {
		setDriverLanguage(language)
		set({ language })
	},
	toggleLanguage: () => {
		const nextLanguage = get().language === 'en' ? 'ar' : 'en'
		setDriverLanguage(nextLanguage)
		set({ language: nextLanguage })
	},
	toggleTheme: () => {
		const nextTheme = get().theme === 'light' ? 'dark' : 'light'
		document.documentElement.dataset.theme = nextTheme
		set({ theme: nextTheme })
	},
}))
