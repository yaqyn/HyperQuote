import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import arCommon from './locales/ar/common.json'
import arUnits from './locales/ar/units.json'
import arWebsite from './locales/ar/website.json'
import enCommon from './locales/en/common.json'
import enUnits from './locales/en/units.json'
import enWebsite from './locales/en/website.json'

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

/**
 * Initialize i18next with AR+EN resources.
 * Call once at app startup.
 */
export function initI18n(locale: 'ar' | 'en' = 'ar') {
  return i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'units', 'website'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
  })
}
