import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui'

type DocumentStatus = 'available' | 'pending' | 'not_required'

interface PODocument {
  type: string
  label: string
  status: DocumentStatus
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
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

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.round(bytes / 1024)} KB`
}

function processFiles(fileList: FileList): UploadedFile[] {
  const results: UploadedFile[] = []
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    if (!ACCEPTED_TYPES.includes(file.type)) continue
    if (file.size > MAX_FILE_SIZE) continue
    results.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
    })
  }
  return results
}

/**
 * PO Documents section -- file grid with type icons and drag-and-drop upload.
 * PDF generation is Phase 28, so actions are mock.
 */
export function PODocuments() {
  const { t } = useTranslation('internal')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      const newFiles = processFiles(e.dataTransfer.files)
      setUploadedFiles((prev) => [...prev, ...newFiles])
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = processFiles(e.target.files)
      setUploadedFiles((prev) => [...prev, ...newFiles])
      e.target.value = '' // reset so same file can be re-selected
    }
  }

  function removeFile(id: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <section>
      <h4 className="text-[12px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
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
                  ? 'text-black/40 dark:text-white/40'
                  : 'text-black/40 dark:text-white/40'
              }
            `}>
              {TYPE_ICONS[doc.type] ?? TYPE_ICONS.po_pdf}
            </div>

            {/* Label */}
            <span className={`text-[12px] leading-tight ${
              doc.status === 'available'
                ? 'text-black/60 dark:text-white/60'
                : 'text-black/40 dark:text-white/40'
            }`}>
              {doc.label}
            </span>

            {/* Status indicator */}
            {doc.status === 'available' ? (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  className="text-[12px] text-[#2563EB] data-[hovered]:text-[#2563EB]/80"
                  onPress={() => {/* Mock: Phase 28 */}}
                >
                  View
                </Button>
              </div>
            ) : doc.status === 'pending' ? (
              <span className="text-[12px] text-black/40 dark:text-white/40">Pending</span>
            ) : (
              <span className="text-[12px] text-black/40 dark:text-white/40">N/A</span>
            )}
          </div>
        ))}
      </div>

      {/* Upload area */}
      {/* TODO: Upload to Cloudflare R2 in Phase 28 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { fileInputRef.current?.click() }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-3 rounded-xl border border-dashed p-5 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-[#2563EB]/30 bg-[#2563EB]/[0.02]'
            : 'border-black/[0.08] dark:border-white/[0.08]'
        }`}
      >
        <p className="text-[12px] text-black/40 dark:text-white/40">
          Drop supplier documents here
        </p>
        <p className="text-[12px] text-black/40 dark:text-white/40 mt-0.5">
          PDF, JPG, PNG up to 10MB
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02]"
            >
              {/* File icon */}
              <svg className="size-4 shrink-0 text-black/40 dark:text-white/40" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>

              {/* Name */}
              <span className="text-[12px] text-black/60 dark:text-white/60 truncate flex-1 min-w-0">
                {file.name}
              </span>

              {/* Size (mono) */}
              <span className="text-[12px] text-black/40 dark:text-white/40 shrink-0" style={{ fontFamily: 'Geist Mono, monospace' }}>
                {formatFileSize(file.size)}
              </span>

              {/* Remove */}
              <Button
                variant="ghost"
                className="text-[12px] px-1.5 py-0.5"
                onPress={() => { removeFile(file.id) }}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
