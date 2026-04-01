import { initI18n } from '@hyperquote/i18n'

// Eagerly initialize i18n so it's ready before React hydrates.
// This runs at module load time — before any component renders.
initI18n('en')

export async function setupI18n(locale: 'ar' | 'en' = 'en') {
  await initI18n(locale)
}
