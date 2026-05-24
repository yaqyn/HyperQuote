import arCommon from '@hyperquote/i18n/locales/ar/common'
import arPortal from '@hyperquote/i18n/locales/ar/portal'
import arUnits from '@hyperquote/i18n/locales/ar/units'
import enCommon from '@hyperquote/i18n/locales/en/common'
import enPortal from '@hyperquote/i18n/locales/en/portal'
import enUnits from '@hyperquote/i18n/locales/en/units'
import { setupReactI18n } from '@hyperquote/i18n/react/setup'
import i18n from 'i18next'

export { i18n }

function browserStorage(): Storage | undefined {
	const storage = globalThis.localStorage
	return typeof storage?.getItem === 'function' ? storage : undefined
}

const resources = {
	en: {
		common: enCommon,
		portal: enPortal,
		units: enUnits,
	},
	ar: {
		common: arCommon,
		portal: arPortal,
		units: arUnits,
	},
} as const

function detectEarlyLocale(): 'ar' | 'en' {
	const storage = browserStorage()
	if (storage) {
		const stored = storage.getItem('hq-locale')
		if (stored === 'ar' || stored === 'en') return stored
	}
	if (typeof document !== 'undefined') {
		if (document.documentElement.dir === 'rtl') return 'ar'
		const match = document.cookie.match(/hq-locale=(ar|en)/)
		if (match) return match[1] as 'ar' | 'en'
	}
	return 'en'
}

export function setupI18n(locale: 'ar' | 'en' = 'en') {
	return setupReactI18n({
		i18n,
		locale,
		namespaces: ['common', 'portal', 'units'],
		resources,
	})
}

setupI18n(detectEarlyLocale())
