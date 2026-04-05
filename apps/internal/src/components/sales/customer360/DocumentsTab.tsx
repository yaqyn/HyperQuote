import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { toast } from '../../../stores/toast'

interface DocumentsTabProps {
  customerId: string
  enabled: boolean
}

const DOC_TYPE_ICONS: Record<string, string> = {
  quote: '\u{1F4C4}',
  invoice: '\u{1F4B0}',
  delivery_note: '\u{1F69A}',
  contract: '\u{1F4DD}',
  certificate: '\u{1F3C6}',
}

export function DocumentsTab({ customerId, enabled }: DocumentsTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'documents', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.documents,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
        {t('sales.customer360.documents.noDocuments')}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Upload Area */}
      <div
        className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#2563EB]/30 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const files = Array.from(e.dataTransfer.files)
          if (files.length > 0) {
            toast.info('File upload will be available soon')
          }
        }}
      >
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('sales.customer360.documents.dragDrop')}
        </p>
        <label className="mt-2 px-3 py-1.5 text-xs font-medium text-[#2563EB] border border-[#2563EB]/30 rounded-lg hover:bg-[#2563EB]/5 cursor-pointer">
          {t('sales.customer360.documents.browse')}
          <input
            type="file"
            className="hidden"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                toast.info('File upload will be available soon')
              }
            }}
          />
        </label>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((doc) => (
          <div
            key={doc.id}
            className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-3"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">
                {DOC_TYPE_ICONS[doc.type] ?? '\u{1F4C4}'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">
                  {doc.name}
                </p>
                <p className="text-xs text-black/40 dark:text-white/40 capitalize">
                  {doc.type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs font-[family-name:var(--font-geist-mono)] text-black/30 dark:text-white/30 mt-1">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
              <Button
                className="text-xs text-[#2563EB] hover:underline outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded"
                onPress={() => window.open(doc.url, '_blank')}
              >
                {t('sales.customer360.documents.view')}
              </Button>
              <Button
                className="text-xs text-black/40 dark:text-white/40 hover:underline outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded"
                onPress={() => {
                  const link = document.createElement('a')
                  link.href = doc.url
                  link.download = doc.name
                  link.click()
                }}
              >
                {t('sales.customer360.documents.download')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-24 rounded-xl bg-black/5 dark:bg-white/5" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-black/5 dark:bg-white/5" />
        ))}
      </div>
    </div>
  )
}
