import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { toast } from '../../../stores/toast'

interface DocumentsTabProps {
  customerId: string
  enabled: boolean
}

const DOC_TYPE_LABELS: Record<string, string> = {
  quote: 'QT',
  invoice: 'INV',
  delivery_note: 'DN',
  contract: 'CTR',
  certificate: 'CRT',
}

export function DocumentsTab({ customerId, enabled }: DocumentsTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'documents', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.documents,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
        {t('sales.customer360.documents.noDocuments')}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Upload area */}
      <div
        className="flex items-center justify-center gap-3 py-4 rounded-lg border border-dashed border-black/[0.08] dark:border-white/[0.08] hover:border-[#2563EB]/30 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const files = Array.from(e.dataTransfer.files)
          if (files.length > 0) {
            toast.info('File upload will be available soon')
          }
        }}
      >
        <span className="text-[13px] text-black/25 dark:text-white/25">
          {t('sales.customer360.documents.dragDrop')}
        </span>
        <label className="px-3 py-1 text-[11px] font-medium text-[#2563EB] rounded-md bg-[#2563EB]/[0.06] hover:bg-[#2563EB]/[0.1] cursor-pointer transition-colors">
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

      {/* File grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {data.map((doc) => (
          <div
            key={doc.id}
            className="group relative p-3 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
          >
            {/* Type badge */}
            <div className="w-8 h-8 rounded bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-2">
              <span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold text-black/35 dark:text-white/35 tabular-nums">
                {DOC_TYPE_LABELS[doc.type] ?? 'DOC'}
              </span>
            </div>

            {/* Filename */}
            <p className="text-[13px] font-medium text-[var(--color-text)] dark:text-white truncate leading-tight">
              {doc.name}
            </p>

            {/* Type + date */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.04] text-black/35 dark:text-white/35 capitalize">
                {doc.type.replace(/_/g, ' ')}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20">
                {new Date(doc.uploadedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Download action — visible on hover */}
            <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                className="text-[10px] font-medium text-[#2563EB] px-2 py-1 rounded bg-white dark:bg-[var(--color-bg)] shadow-sm outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
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
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-12 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
        ))}
      </div>
    </div>
  )
}
