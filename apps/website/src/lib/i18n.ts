import { initI18n } from '@hyperquote/i18n'

// Initialize i18n for the website app.
// English is the default language.
export async function setupI18n(locale: 'ar' | 'en' = 'en') {
  await initI18n(locale)
}
