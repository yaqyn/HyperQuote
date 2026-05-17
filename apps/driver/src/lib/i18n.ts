import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import arDriver from '../locales/ar/driver.json'
import enDriver from '../locales/en/driver.json'
import type { DriverLanguage } from './driver-repository'

i18n.use(initReactI18next).init({
	lng: 'en',
	fallbackLng: 'en',
	defaultNS: 'driver',
	ns: ['driver'],
	interpolation: { escapeValue: false },
	resources: {
		ar: { driver: arDriver },
		en: { driver: enDriver },
	},
})

export function setDriverLanguage(language: DriverLanguage) {
	i18n.changeLanguage(language)
	document.documentElement.lang = language
	document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}
