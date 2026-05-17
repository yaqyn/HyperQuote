import i18n from 'i18next'
import arCommon from './locales/ar/common.json'
import arPortal from './locales/ar/portal.json'
import arUnits from './locales/ar/units.json'
import arWebsite from './locales/ar/website.json'
import enCommon from './locales/en/common.json'
import enPortal from './locales/en/portal.json'
import enUnits from './locales/en/units.json'
import enWebsite from './locales/en/website.json'
import { setupReactI18n } from './react/setup'

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
	return setupReactI18n({
		i18n,
		locale,
		namespaces: ['common', 'portal', 'units', 'website'],
		resources,
	})
}
