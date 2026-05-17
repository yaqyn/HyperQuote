import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '../../../components/legal/LegalDocumentPage'
import { PRIVACY_SECTIONS as SECTIONS } from '../../../content/legal'

export const Route = createFileRoute('/_website/legal/privacy')({
	head: () => ({
		meta: [
			{ title: 'Privacy Policy — HyperQuote' },
			{
				name: 'description',
				content:
					'HyperQuote privacy policy. Learn how we collect, use, and protect your data in compliance with Egyptian data protection law.',
			},
		],
	}),
	component: PrivacyPage,
})

function PrivacyPage() {
	return (
		<LegalDocumentPage
			title="Privacy Policy"
			effectiveDate="Effective January 2026"
			sections={SECTIONS}
		/>
	)
}
