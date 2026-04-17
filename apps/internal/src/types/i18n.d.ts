import type enAdmin from '../locales/en/admin.json'
import type enAI from '../locales/en/ai.json'
import type enCS from '../locales/en/customer-service.json'
import type enDispatch from '../locales/en/dispatch.json'
import type enFinance from '../locales/en/finance.json'
import type enHR from '../locales/en/hr.json'
import type enInternal from '../locales/en/internal.json'
import type enReports from '../locales/en/reports.json'

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'internal'
		resources: {
			internal: typeof enInternal
			finance: typeof enFinance
			dispatch: typeof enDispatch
			admin: typeof enAdmin
			hr: typeof enHR
			'customer-service': typeof enCS
			reports: typeof enReports
			ai: typeof enAI
		}
	}
}
