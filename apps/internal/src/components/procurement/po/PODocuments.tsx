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

const STATUS_STYLES: Record<DocumentStatus, string> = {
  available: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  pending: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
  not_required: 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40',
}

/**
 * PO Documents section -- list of document types with view/download.
 * PDF generation is Phase 28, so actions are mock.
 */
export function PODocuments() {
  const { t } = useTranslation('internal')

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
      <h4 className="text-sm font-semibold mb-3">Documents</h4>

      <div className="space-y-2">
        {DOCUMENT_TYPES.map((doc) => (
          <div
            key={doc.type}
            className="flex items-center justify-between rounded-md bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-black/30 dark:text-white/30" viewBox="0 0 16 16" fill="none">
                <path d="M4 2H10L12 4V14H4V2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M10 2V4H12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-medium">{doc.label}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[doc.status]}`}>
                {doc.status === 'not_required' ? 'Not Required' : doc.status === 'available' ? 'Available' : 'Pending'}
              </span>

              {doc.status === 'available' && (
                <div className="flex items-center gap-1">
                  <Button
                    className="rounded-md border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/60
                      outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                      dark:border-white/10 dark:text-white/60 dark:data-[hovered]:bg-white/10"
                    onPress={() => {/* Mock: Phase 28 */}}
                  >
                    View
                  </Button>
                  <Button
                    className="rounded-md border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/60
                      outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                      dark:border-white/10 dark:text-white/60 dark:data-[hovered]:bg-white/10"
                    onPress={() => {/* Mock: Phase 28 */}}
                  >
                    Download
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload area (mock) */}
      <div className="mt-3 rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 p-4 text-center">
        <p className="text-xs text-black/40 dark:text-white/40">
          Drag and drop supplier confirmation here
        </p>
        <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">
          PDF, JPG, or PNG up to 10MB
        </p>
      </div>
    </div>
  )
}
