import type enAdmin from '../locales/en/admin.json'
import type enCS from '../locales/en/customer-service.json'
import type enDispatch from '../locales/en/dispatch.json'
import type enFinance from '../locales/en/finance.json'
import type enInternal from '../locales/en/internal.json'

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'internal'
		resources: {
			internal: typeof enInternal
			finance: typeof enFinance
			dispatch: typeof enDispatch
			admin: typeof enAdmin
			'customer-service': typeof enCS
		}
	}
}
