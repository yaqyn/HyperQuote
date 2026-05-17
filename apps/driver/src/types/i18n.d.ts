import type enDriver from '../locales/en/driver.json'

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'driver'
		resources: {
			driver: typeof enDriver
		}
	}
}
