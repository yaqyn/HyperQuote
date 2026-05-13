import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import arCommon from './locales/ar/common.json'
import arPortal from './locales/ar/portal.json'
import arUnits from './locales/ar/units.json'
import arWebsite from './locales/ar/website.json'
import enCommon from './locales/en/common.json'
import enPortal from './locales/en/portal.json'
import enUnits from './locales/en/units.json'
import enWebsite from './locales/en/website.json'

export { i18n }

const resources = {
	en: {
		common: enCommon,
		portal: enPortal,
		units: enUnits,
		website: enWebsite,
	},
	ar: {
		common: arCommon,
		portal: arPortal,
		units: arUnits,
		website: arWebsite,
	},
} as const

/**
 * Initialize i18next with AR+EN resources.
 * Call once at app startup.
 */
export function initI18n(locale: 'ar' | 'en' = 'en') {
	if (i18n.isInitialized) {
		if (i18n.language !== locale) return i18n.changeLanguage(locale)
		return Promise.resolve(i18n.t)
	}
	return i18n.use(initReactI18next).init({
		resources,
		lng: locale,
		fallbackLng: 'en',
		defaultNS: 'common',
		ns: ['common', 'portal', 'units', 'website'],
		interpolation: {
			escapeValue: false, // React already escapes
		},
		initAsync: false, // Sync init — resources are bundled, no backend needed
	})
}
