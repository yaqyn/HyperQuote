import { Button } from 'react-aria-components'
import type { OrderDocument } from '../../../types/operations'

interface OrderDocumentsProps {
  documents: OrderDocument[]
}

const TYPE_LABELS: Record<string, string> = {
  quote: 'Quote',
  purchase_order: 'PO',
  delivery_note: 'DN',
  invoice: 'Invoice',
}

/**
 * File chips — doc type tag + filename + download on hover.
 * Compact inline chips, not a heavy list.
 */
export function OrderDocuments({ documents }: OrderDocumentsProps) {
  if (documents.length === 0) {
    return (
      <div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3 block">
          Documents
        </span>
        <p className="text-[12px] text-black/25 dark:text-white/25">
          No documents attached
        </p>
      </div>
    )
  }

  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3 block">
        Documents
      </span>

      <div className="flex flex-wrap gap-2">
        {documents.map((doc) => (
          <Button
            key={doc.id}
            className="group inline-flex items-center gap-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5
              outline-none data-[hovered]:bg-black/[0.06] dark:data-[hovered]:bg-white/[0.06]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 transition-colors"
            onPress={() => {
              /* Mock: download doc.url -- Phase 28 */
            }}
          >
            {/* Type tag */}
            <span className="rounded bg-black/[0.06] dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-black/50 dark:text-white/50">
              {TYPE_LABELS[doc.type] ?? doc.type}
            </span>

            {/* Filename */}
            <span className="text-[12px] font-medium truncate max-w-[160px]">
              {doc.name}
            </span>

            {/* Date */}
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/25 dark:text-white/25">
              {new Date(doc.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>

            {/* Download icon — visible on hover */}
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-black/40 dark:text-white/40 shrink-0"
            >
              <path d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5M2 10H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        ))}
      </div>
    </div>
  )
}
