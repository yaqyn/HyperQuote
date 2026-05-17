import type { i18n as I18n, InitOptions } from 'i18next'
import { initReactI18next } from 'react-i18next'

export type HyperQuoteLocale = 'ar' | 'en'

type ReactI18nResources = NonNullable<InitOptions['resources']>

type SetupReactI18nOptions = {
	defaultNamespace?: string
	i18n: I18n
	locale?: HyperQuoteLocale
	namespaces: readonly string[]
	resources: ReactI18nResources
}

export function setupReactI18n({
	defaultNamespace = 'common',
	i18n,
	locale = 'en',
	namespaces,
	resources,
}: SetupReactI18nOptions) {
	if (i18n.isInitialized) {
		if (i18n.language !== locale) return i18n.changeLanguage(locale)
		return Promise.resolve(i18n.t)
	}

	return i18n.use(initReactI18next).init({
		defaultNS: defaultNamespace,
		fallbackLng: 'en',
		initAsync: false,
		interpolation: {
			escapeValue: false,
		},
		lng: locale,
		ns: [...namespaces],
		resources,
	})
}
