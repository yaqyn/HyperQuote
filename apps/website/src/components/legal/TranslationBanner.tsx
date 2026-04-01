import { useTranslation } from 'react-i18next'

export function TranslationBanner() {
	const { i18n, t } = useTranslation('website')

	if (i18n.language !== 'en') return null

	return (
		<div className="mx-auto max-w-[800px] px-6">
			<div className="rounded-lg bg-[var(--color-primary)]/10 p-4 mb-6">
				<p className="text-sm text-[var(--color-primary)]">
					{t('legal.translationBanner')}
				</p>
			</div>
		</div>
	)
}
