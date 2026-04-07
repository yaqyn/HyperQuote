import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'

type DocumentStatus = 'available' | 'pending' | 'not_required'

interface PODocument {
  type: string
  label: string
  status: DocumentStatus
}

const DOCUMENT_TYPES: PODocument[] = [
  { type: 'po_pdf', label: 'Purchase Order PDF', status: 'available' },
  { type: 'supplier_confirmation', label: 'Supplier Confirmation', status: 'pending' },
  { type: 'bol', label: 'Bill of Lading', status: 'pending' },
  { type: 'supplier_invoice', label: 'Supplier Invoice', status: 'pending' },
  { type: 'inspection_report', label: 'Inspection Reports', status: 'not_required' },
]

const TYPE_ICONS: Record<string, React.ReactNode> = {
  po_pdf: (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  supplier_confirmation: (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 10L9 11.5L12.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bol: (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 8h6M7 11h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  supplier_invoice: (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7h4M8 10h4M8 13h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  inspection_report: (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 7v3.5l2 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

/**
 * PO Documents section -- file grid with type icons.
 * PDF generation is Phase 28, so actions are mock.
 */
export function PODocuments() {
  const { t } = useTranslation('internal')

  return (
    <section>
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
        Documents
      </h4>

      {/* File grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DOCUMENT_TYPES.map((doc) => (
          <div
            key={doc.type}
            className={`
              group flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors
              ${doc.status === 'available'
                ? 'bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04] cursor-pointer'
                : 'bg-black/[0.01] dark:bg-white/[0.01]'
              }
            `}
          >
            {/* Icon */}
            <div className={`
              ${doc.status === 'available'
                ? 'text-black/50 dark:text-white/50'
                : doc.status === 'pending'
                  ? 'text-black/20 dark:text-white/20'
                  : 'text-black/10 dark:text-white/10'
              }
            `}>
              {TYPE_ICONS[doc.type] ?? TYPE_ICONS.po_pdf}
            </div>

            {/* Label */}
            <span className={`text-[11px] leading-tight ${
              doc.status === 'available'
                ? 'text-black/60 dark:text-white/60'
                : 'text-black/25 dark:text-white/25'
            }`}>
              {doc.label}
            </span>

            {/* Status indicator */}
            {doc.status === 'available' ? (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  className="rounded-md px-2 py-0.5 text-[9px] font-medium text-[#2563EB] outline-none
                    data-[hovered]:bg-[#2563EB]/10 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                  onPress={() => {/* Mock: Phase 28 */}}
                >
                  View
                </Button>
              </div>
            ) : doc.status === 'pending' ? (
              <span className="text-[9px] text-black/20 dark:text-white/20">Pending</span>
            ) : (
              <span className="text-[9px] text-black/15 dark:text-white/15">N/A</span>
            )}
          </div>
        ))}
      </div>

      {/* Upload area */}
      <div className="mt-3 rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] p-5 text-center">
        <p className="text-[11px] text-black/25 dark:text-white/25">
          Drop supplier documents here
        </p>
        <p className="text-[9px] text-black/15 dark:text-white/15 mt-0.5">
          PDF, JPG, PNG up to 10MB
        </p>
      </div>
    </section>
  )
}
