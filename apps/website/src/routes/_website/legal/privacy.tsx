import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LegalProse } from '../../../components/legal/LegalProse'
import { TranslationBanner } from '../../../components/legal/TranslationBanner'
import { LanguageToggle } from '../../../components/layout/LanguageToggle'

export const Route = createFileRoute('/_website/legal/privacy')({
	head: () => ({
		meta: [
			{ title: 'Privacy Policy \u2014 HyperQuote' },
			{
				name: 'description',
				content:
					'HyperQuote privacy policy. Learn how we collect, use, and protect your data.',
			},
		],
	}),
	component: PrivacyPage,
})

function PrivacyPage() {
	const { t } = useTranslation('website')

	return (
		<>
			<div className="mx-auto max-w-[800px] px-6 pt-12 flex justify-end">
				<LanguageToggle />
			</div>
			<TranslationBanner />
			<LegalProse
				title={t('legal.privacy.title')}
				lastUpdated={`${t('legal.lastUpdated')}: 2026-04-01`}
			>
				<h2>{t('legal.privacy.dataCollection.title')}</h2>
				<p>{t('legal.privacy.dataCollection.content')}</p>

				<h2>{t('legal.privacy.usage.title')}</h2>
				<p>{t('legal.privacy.usage.content')}</p>

				<h2>{t('legal.privacy.storage.title')}</h2>
				<p>{t('legal.privacy.storage.content')}</p>

				<h2>{t('legal.privacy.sharing.title')}</h2>
				<p>{t('legal.privacy.sharing.content')}</p>

				<h2>{t('legal.privacy.rights.title')}</h2>
				<p>{t('legal.privacy.rights.content')}</p>

				<h2>{t('legal.privacy.contact.title')}</h2>
				<p>{t('legal.privacy.contact.content')}</p>
			</LegalProse>
		</>
	)
}
