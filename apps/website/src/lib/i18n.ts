import { initI18n } from '@hyperquote/i18n'

function detectEarlyLocale(): 'ar' | 'en' {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('hq-locale')
    if (stored === 'ar' || stored === 'en') return stored
  }
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/hq-locale=(ar|en)/)
    if (match) return match[1] as 'ar' | 'en'
  }
  return 'en'
}

// Eagerly initialize i18n so it's ready before React hydrates.
// Reads stored locale preference to avoid English flash.
initI18n(detectEarlyLocale())

export async function setupI18n(locale: 'ar' | 'en' = 'en') {
  await initI18n(locale)
}
