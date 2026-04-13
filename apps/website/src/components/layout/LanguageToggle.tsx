import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export function LanguageToggle() {
	const { i18n, t } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const next = isAr ? 'en' : 'ar'

	function handleToggle() {
		i18n.changeLanguage(next)
		document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
		document.documentElement.lang = next
		localStorage.setItem('hq-locale', next)
		document.cookie = 'hq-locale=' + next + ';path=/;max-age=31536000'
	}

	return (
		<button
			type="button"
			onClick={handleToggle}
			aria-label={isAr ? t('a11y.switchToEnglish') : t('a11y.switchToArabic')}
			className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
		>
			<Globe size={18} className="text-[var(--color-text-muted)]" />
		</button>
	)
}
