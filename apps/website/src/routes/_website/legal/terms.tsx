import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LegalProse } from '../../../components/legal/LegalProse'
import { TranslationBanner } from '../../../components/legal/TranslationBanner'
import { LanguageToggle } from '../../../components/layout/LanguageToggle'

export const Route = createFileRoute('/_website/legal/terms')({
	head: () => ({
		meta: [
			{ title: 'Terms of Use \u2014 HyperQuote' },
			{
				name: 'description',
				content:
					'HyperQuote terms of use. Read the conditions for using our platform.',
			},
		],
	}),
	component: TermsPage,
})

function TermsPage() {
	const { t } = useTranslation('website')

	return (
		<>
			<div className="mx-auto max-w-[800px] px-6 pt-12 flex justify-end">
				<LanguageToggle />
			</div>
			<TranslationBanner />
			<LegalProse
				title={t('legal.terms.title')}
				lastUpdated={`${t('legal.lastUpdated')}: 2026-04-01`}
			>
				<h2>{t('legal.terms.acceptance.title')}</h2>
				<p>{t('legal.terms.acceptance.content')}</p>

				<h2>{t('legal.terms.services.title')}</h2>
				<p>{t('legal.terms.services.content')}</p>

				<h2>{t('legal.terms.obligations.title')}</h2>
				<p>{t('legal.terms.obligations.content')}</p>

				<h2>{t('legal.terms.liability.title')}</h2>
				<p>{t('legal.terms.liability.content')}</p>

				<h2>{t('legal.terms.governingLaw.title')}</h2>
				<p>{t('legal.terms.governingLaw.content')}</p>

				<h2>{t('legal.terms.amendments.title')}</h2>
				<p>{t('legal.terms.amendments.content')}</p>
			</LegalProse>
		</>
	)
}
