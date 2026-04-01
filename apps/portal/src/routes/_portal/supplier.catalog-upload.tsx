/**
 * Catalog Upload route -- /supplier/catalog-upload
 * 4-step flow: upload -> AI processing -> review -> submitted
 */
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { CatalogUploadModal } from '../../components/supplier/CatalogUploadModal'

export const Route = createFileRoute('/_portal/supplier/catalog-upload')({
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
