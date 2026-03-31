import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function CareersCTA() {
	const { t } = useTranslation('website')

	return (
		<section className="py-24 max-md:py-16 px-6 text-center bg-[var(--color-base-alt)]">
			<h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">
				{t('about.careers.heading')}
			</h2>
			<p className="text-base text-[var(--color-text-muted)] max-w-[600px] mx-auto leading-relaxed">
				{t('about.careers.description')}
			</p>
			<Link
				to="/careers"
				className="inline-flex items-center justify-center bg-[var(--color-primary)] text-white font-semibold text-sm h-10 px-6 rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors mt-6"
			>
				{t('about.careers.cta')}
			</Link>
		</section>
	)
}
