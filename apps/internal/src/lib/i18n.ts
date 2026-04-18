import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import arAdmin from '../locales/ar/admin.json'
import arAI from '../locales/ar/ai.json'
import arCS from '../locales/ar/customer-service.json'
import arDispatch from '../locales/ar/dispatch.json'
import arFinance from '../locales/ar/finance.json'
import arHR from '../locales/ar/hr.json'
// Static imports — bundled with the app, no async loading needed
import arInternal from '../locales/ar/internal.json'
import arReports from '../locales/ar/reports.json'
import enAdmin from '../locales/en/admin.json'
import enAI from '../locales/en/ai.json'
import enCS from '../locales/en/customer-service.json'
import enDispatch from '../locales/en/dispatch.json'
import enFinance from '../locales/en/finance.json'
import enHR from '../locales/en/hr.json'
import enInternal from '../locales/en/internal.json'
import enReports from '../locales/en/reports.json'

i18n.use(initReactI18next).init({
	lng: 'en',
	fallbackLng: 'en',
	defaultNS: 'internal',
	ns: [
		'internal',
		'finance',
		'dispatch',
		'admin',
		'hr',
		'customer-service',
		'ai',
		'reports',
	],
	interpolation: { escapeValue: false },
	resources: {
		ar: {
			internal: arInternal,
			finance: arFinance,
			dispatch: arDispatch,
			admin: arAdmin,
			hr: arHR,
			'customer-service': arCS,
			ai: arAI,
			reports: arReports,
		},
		en: {
			internal: enInternal,
			finance: enFinance,
			dispatch: enDispatch,
			admin: enAdmin,
			hr: enHR,
			'customer-service': enCS,
			ai: enAI,
			reports: enReports,
		},
	},
})
