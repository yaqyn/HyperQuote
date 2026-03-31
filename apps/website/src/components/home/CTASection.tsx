import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

export function CTASection() {
	const { t } = useTranslation('website')

	return (
		<section
			className="py-24 max-md:py-16 px-6 text-center"
			style={{ background: 'var(--gradient-cta)' }}
		>
			<h2 className="text-[48px] max-md:text-2xl font-semibold text-white mb-6">
				{t('cta.readyToBuild')}
			</h2>

			<Link
				to="/portal"
				className="inline-flex items-center justify-center bg-white text-[var(--color-primary)] font-semibold text-[18px] h-14 px-8 rounded-xl hover:bg-white/90 transition-colors"
			>
				{t('cta.getStartedFree')}
			</Link>

			<p className="text-sm text-white/60 mt-4">{t('cta.noCreditCard')}</p>
		</section>
	)
}
