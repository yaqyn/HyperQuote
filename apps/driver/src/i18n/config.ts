import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import arDriver from './locales/ar/driver.json'
import enDriver from './locales/en/driver.json'

function toArabicIndic(value: string): string {
	return value.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)))
}

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			ar: { driver: arDriver },
			en: { driver: enDriver },
		},
		lng: 'en',
		fallbackLng: 'en',
		defaultNS: 'driver',
		ns: ['driver'],
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
		},
	})

i18n.services.formatter?.add('number', (value, lng) => {
	if (typeof value !== 'number') return String(value)
	if (lng === 'ar') {
		return toArabicIndic(new Intl.NumberFormat('ar-EG').format(value))
	}
	return String(value)
})
