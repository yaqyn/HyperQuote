import { initI18n } from '@hyperquote/i18n'

// Initialize i18n for the website app.
// Arabic is the primary language.
let initialized = false

export async function setupI18n(locale: 'ar' | 'en' = 'ar') {
  if (initialized) return
  await initI18n(locale)
  initialized = true
}
