import { Preferences } from '@capacitor/preferences'
import { create } from 'zustand'

const THEME_KEY = 'hq-theme'

type Theme = 'light' | 'dark'

interface ThemeState {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
	init: () => Promise<void>
}

function getAutoTheme(): Theme {
	const hour = new Date().getHours()
	return hour >= 18 || hour < 6 ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
	theme: getAutoTheme(),

	setTheme: (theme) => {
		applyTheme(theme)
		set({ theme })
		Preferences.set({ key: THEME_KEY, value: theme })
	},

	toggleTheme: () => {
		const next = get().theme === 'light' ? 'dark' : 'light'
		get().setTheme(next)
	},

	init: async () => {
		const { value } = await Preferences.get({ key: THEME_KEY })
		const theme = value === 'light' || value === 'dark' ? value : getAutoTheme()
		applyTheme(theme)
		set({ theme })
	},
}))
