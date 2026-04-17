import type enCeo from '../../public/locales/en/ceo.json'

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'ceo'
		resources: {
			ceo: typeof enCeo
		}
	}
}
