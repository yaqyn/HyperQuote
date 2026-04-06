import { Button } from 'react-aria-components'
import { FileText, File, Download } from 'lucide-react'
import type { OrderDocument } from '../../../types/operations'

interface OrderDocumentsProps {
  documents: OrderDocument[]
}

const TYPE_LABELS: Record<string, string> = {
  quote: 'Quote',
  purchase_order: 'Purchase Order',
  delivery_note: 'Delivery Note',
  invoice: 'Invoice',
}

/**
 * Document list for order detail -- shows linked files with type badge and download.
 */
export function OrderDocuments({ documents }: OrderDocumentsProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h3 className="text-sm font-semibold mb-3">Documents</h3>

      <div className="space-y-2">
        {documents.map((doc) => {
          const isPdf = doc.name.endsWith('.pdf')
          const Icon = isPdf ? FileText : File

          return (
            <div
              key={doc.id}
              className="group flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-4 w-4 shrink-0 text-black/30 dark:text-white/30" />
                <span className="text-sm font-medium truncate">{doc.name}</span>
                <span className="shrink-0 rounded-full bg-black/5 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-black/50 dark:text-white/50">
                  {TYPE_LABELS[doc.type] ?? doc.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-geist-mono text-xs text-black/40 dark:text-white/40">
                  {new Date(doc.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <Button
                  className="rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity
                    outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                    dark:data-[hovered]:bg-white/10"
                  onPress={() => {
                    /* Mock: download doc.url -- Phase 28 */
                  }}
                >
                  <Download className="h-4 w-4 text-black/50 dark:text-white/50" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {documents.length === 0 && (
        <p className="text-xs text-black/40 dark:text-white/40 text-center py-4">
          No documents attached
        </p>
      )}
    </div>
  )
}
