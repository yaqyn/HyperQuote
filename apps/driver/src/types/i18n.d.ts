import type enDriver from '../i18n/locales/en/driver.json'

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'driver'
		resources: {
			driver: typeof enDriver
		}
	}
}
