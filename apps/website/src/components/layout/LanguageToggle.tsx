import { Globe } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
	const { i18n, t } = useTranslation('website')
	const [isSwitching, setIsSwitching] = useState(false)
	const isAr = i18n.language === 'ar'
	const next = isAr ? 'en' : 'ar'

	async function handleToggle() {
		if (isSwitching) return
		setIsSwitching(true)

		const swap = async () => {
			await i18n.changeLanguage(next)
			document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
			document.documentElement.lang = next
			localStorage.setItem('hq-locale', next)
			// Server reads this cookie for SSR locale. Cookie Store API has no
			// Safari support — document.cookie is the correct shim here.
			// biome-ignore lint/suspicious/noDocumentCookie: intentional SSR cookie write
			document.cookie = `hq-locale=${next};path=/;max-age=31536000`

			// Let React commit the translated, direction-aware layout before the
			// browser captures the incoming frame. A timer is intentional here:
			// animation frames are paused inside a view-transition update callback.
			await new Promise<void>((resolve) => setTimeout(resolve, 0))
		}

		try {
			if (document.startViewTransition) {
				await document.startViewTransition(swap).finished
			} else {
				await swap()
			}
		} finally {
			setIsSwitching(false)
		}
	}

	return (
		<button
			type="button"
			onClick={() => void handleToggle()}
			disabled={isSwitching}
			aria-busy={isSwitching}
			aria-label={isAr ? t('a11y.switchToEnglish') : t('a11y.switchToArabic')}
			className="rounded-lg p-2 transition-colors hover:bg-[var(--color-surface)] disabled:cursor-wait"
		>
			<Globe size={18} className="text-[var(--color-text-muted)]" />
		</button>
	)
}
