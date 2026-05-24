import arCommon from '@hyperquote/i18n/locales/ar/common'
import arUnits from '@hyperquote/i18n/locales/ar/units'
import arWebsite from '@hyperquote/i18n/locales/ar/website'
import enCommon from '@hyperquote/i18n/locales/en/common'
import enUnits from '@hyperquote/i18n/locales/en/units'
import enWebsite from '@hyperquote/i18n/locales/en/website'
import { setupReactI18n } from '@hyperquote/i18n/react/setup'
import i18n from 'i18next'

export { i18n }

function browserStorage(): Storage | undefined {
	const storage = globalThis.localStorage
	return typeof storage?.getItem === 'function' ? storage : undefined
}

function detectEarlyLocale(): 'ar' | 'en' {
	const storage = browserStorage()
	if (storage) {
		const stored = storage.getItem('hq-locale')
		if (stored === 'ar' || stored === 'en') return stored
	}
	if (typeof document !== 'undefined') {
		const match = document.cookie.match(/hq-locale=(ar|en)/)
		const cookieLocale = match?.[1]
		if (cookieLocale === 'ar' || cookieLocale === 'en') return cookieLocale
	}
	return 'en'
}

const resources = {
	en: {
		common: enCommon,
		units: enUnits,
		website: enWebsite,
	},
	ar: {
		common: arCommon,
		units: arUnits,
		website: arWebsite,
	},
} as const

export function setupI18n(locale: 'ar' | 'en' = 'en') {
	return setupReactI18n({
		i18n,
		locale,
		namespaces: ['common', 'units', 'website'],
		resources,
	})
}

setupI18n(detectEarlyLocale())
