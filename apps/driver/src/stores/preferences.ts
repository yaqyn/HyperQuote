import { create } from 'zustand'
import type { DriverLanguage } from '../lib/driver-repository'

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
	setLanguage: (language) => set({ language }),
	toggleLanguage: () => {
		const nextLanguage = get().language === 'en' ? 'ar' : 'en'
		set({ language: nextLanguage })
	},
	toggleTheme: () => {
		const nextTheme = get().theme === 'light' ? 'dark' : 'light'
		set({ theme: nextTheme })
	},
}))
