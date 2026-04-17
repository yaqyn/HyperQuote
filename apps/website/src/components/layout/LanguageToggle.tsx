import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
	const { i18n, t } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const next = isAr ? 'en' : 'ar'

	function handleToggle() {
		const swap = () => {
			i18n.changeLanguage(next)
			document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
			document.documentElement.lang = next
			localStorage.setItem('hq-locale', next)
			// Server reads this cookie for SSR locale. Cookie Store API has no
			// Safari support — document.cookie is the correct shim here.
			// biome-ignore lint/suspicious/noDocumentCookie: intentional SSR cookie write
			document.cookie = `hq-locale=${next};path=/;max-age=31536000`
		}

		if (document.startViewTransition) {
			document.startViewTransition(swap)
		} else {
			swap()
		}
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
