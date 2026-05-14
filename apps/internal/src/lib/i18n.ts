import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import arAdmin from '../locales/ar/admin.json'
import arCS from '../locales/ar/customer-service.json'
import arDispatch from '../locales/ar/dispatch.json'
import arFinance from '../locales/ar/finance.json'
// Static imports — bundled with the app, no async loading needed
import arInternal from '../locales/ar/internal.json'
import enAdmin from '../locales/en/admin.json'
import enCS from '../locales/en/customer-service.json'
import enDispatch from '../locales/en/dispatch.json'
import enFinance from '../locales/en/finance.json'
import enInternal from '../locales/en/internal.json'

i18n.use(initReactI18next).init({
	lng: 'en',
	fallbackLng: 'en',
	defaultNS: 'internal',
	ns: ['internal', 'finance', 'dispatch', 'admin', 'customer-service'],
	interpolation: { escapeValue: false },
	resources: {
		ar: {
			internal: arInternal,
			finance: arFinance,
			dispatch: arDispatch,
			admin: arAdmin,
			'customer-service': arCS,
		},
		en: {
			internal: enInternal,
			finance: enFinance,
			dispatch: enDispatch,
			admin: enAdmin,
			'customer-service': enCS,
		},
	},
})
