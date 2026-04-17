import type enCommon from '../locales/en/common.json'
import type enPortal from '../locales/en/portal.json'
import type enUnits from '../locales/en/units.json'
import type enWebsite from '../locales/en/website.json'

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'common'
		resources: {
			common: typeof enCommon
			portal: typeof enPortal
			units: typeof enUnits
			website: typeof enWebsite
		}
	}
}

export type UnitKey = keyof typeof enUnits
