import { useTranslation } from 'react-i18next'

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
			className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
		>
			{isAr ? 'EN' : 'AR'}
		</button>
	)
}
