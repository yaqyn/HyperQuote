import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * Initialize i18n for the CEO app with the `ceo` namespace.
 * Resources are loaded via HTTP backend from /locales/{lng}/{ns}.json.
 */
export async function setupCEOI18n(locale: 'ar' | 'en' = 'en') {
	if (i18n.isInitialized) {
		if (i18n.language !== locale) await i18n.changeLanguage(locale)
		return
	}

	await i18n.use(initReactI18next).init({
		lng: locale,
		fallbackLng: 'en',
		defaultNS: 'ceo',
		ns: ['ceo'],
		interpolation: {
			escapeValue: false,
		},
		resources: {},
	})

	// Load resources dynamically
	for (const lng of ['ar', 'en'] as const) {
		try {
			const res = await fetch(`/locales/${lng}/ceo.json`)
			if (res.ok) {
				const data = await res.json()
				i18n.addResourceBundle(lng, 'ceo', data, true, true)
			}
		} catch {
			// Silently fail -- fallback to key names
		}
	}
}
