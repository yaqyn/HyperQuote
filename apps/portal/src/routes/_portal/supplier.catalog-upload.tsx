/**
 * Catalog Upload route -- /supplier/catalog-upload
 * 4-step flow: upload -> AI processing -> review -> submitted
 */
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CatalogUploadModal } from '../../components/supplier/CatalogUploadModal'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { WindowShell } from '../../components/windows/WindowShell'
import { portalHead } from '../../lib/page-meta'

export const Route = createFileRoute('/_portal/supplier/catalog-upload')({
	head: () =>
		portalHead({
			title: 'Catalog Upload — HyperQuote Portal',
			description:
				'Private supplier catalog upload workflow for importing, reviewing, and publishing product data in HyperQuote.',
			path: '/supplier/catalog-upload',
		}),
	component: CatalogUploadPage,
})

function CatalogUploadPage() {
	const { t, i18n } = useTranslation('portal')
	const locale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'

	return (
		<WindowShell title={t('supplier.catalogUploadTitle')}>
			<CatalogUploadModal locale={locale} />
			<FloatingAIButton />
		</WindowShell>
	)
}
