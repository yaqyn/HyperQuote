/**
 * CatalogUploadModal -- 4-step catalog upload flow.
 * Step 1: Drag-and-drop file upload (PDF/Excel/CSV)
 * Step 2: AI processing with skeleton loader
 * Step 3: Side-by-side review with CatalogReview
 * Step 4: Success confirmation
 *
 * Uses React Aria DropZone + FileTrigger (matching UploadMethod pattern).
 * Dev mode auto-advances step 2 after 2 seconds with mock parsed data.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { DropZone, FileTrigger, Button } from 'react-aria-components'
import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { uploadCatalog } from '../../lib/server/supplier-catalog'
import type { CatalogParsedItem } from '../../types/supplier'
import { CatalogReview } from './CatalogReview'

// ============================================================================
// Mock parsed items for dev mode
// ============================================================================

const MOCK_PARSED_ITEMS: CatalogParsedItem[] = [
  {
    id: 'mock-1',
    productName: 'Portland Cement 50kg',
    productNameAr: '\u0623\u0633\u0645\u0646\u062a \u0628\u0648\u0631\u062a\u0644\u0627\u0646\u062f\u064a \u0665\u0660 \u0643\u062c\u0645',
    sku: 'CEM-50K-001',
    price: 85,
    quantity: 12000,
    confidence: 96,
    originalText: 'Portland Cement OPC 42.5N 50kg bag - EGP 85/bag',
  },
  {
    id: 'mock-2',
    productName: 'White Cement 50kg',
    productNameAr: '\u0623\u0633\u0645\u0646\u062a \u0623\u0628\u064a\u0636 \u0665\u0660 \u0643\u062c\u0645',
    sku: 'CEM-WHT-001',
    price: 150,
    quantity: 500,
    confidence: 92,
    originalText: 'White Cement 50kg - 150 LE',
  },
  {
    id: 'mock-3',
    productName: 'Rebar 12mm',
    productNameAr: '\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d \u0661\u0662 \u0645\u0645',
    sku: 'REB-12M-001',
    price: 32500,
    quantity: 450,
    confidence: 88,
    originalText: 'TMT Rebar 12mm - 32,500 EGP/ton',
  },
  {
    id: 'mock-4',
    productName: 'Washed Sand',
    productNameAr: '\u0631\u0645\u0644 \u0645\u063a\u0633\u0648\u0644',
    sku: 'SND-WSH-001',
    price: 125,
    quantity: 2000,
    confidence: 75,
    originalText: 'Washed Sand per m3 - approx 125',
  },
  {
    id: 'mock-5',
    productName: 'Steel Mesh',
    productNameAr: '\u0634\u0628\u0643 \u062d\u062f\u064a\u062f',
    sku: '',
    price: 4500,
    quantity: 80,
    confidence: 62,
    originalText: 'Welded mesh 6mm 2.4x6m sheet',
  },
  {
    id: 'mock-6',
    productName: 'Gravel 20mm',
    productNameAr: '\u0632\u0644\u0637 \u0662\u0660 \u0645\u0645',
    sku: 'GRV-20M-001',
    price: 180,
    quantity: 1500,
    confidence: 45,
    originalText: 'gravel 20mm crushed - 180?',
  },
]

// ============================================================================
// Types
// ============================================================================

interface CatalogUploadModalProps {
  locale: 'ar' | 'en'
}

// ============================================================================
// Component
// ============================================================================

export function CatalogUploadModal({ locale }: CatalogUploadModalProps) {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [isDragOver, setIsDragOver] = useState(false)
  const [parsedItems, setParsedItems] = useState<CatalogParsedItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Call server function
      try {
        await uploadCatalog({
          data: { fileUrl: URL.createObjectURL(file), fileType: file.type },
        })
      } catch {
        // Ignore upload errors in dev mode
      }

      // Move to processing step
      setStep(2)

      // Dev mode: auto-advance after 2 seconds with mock data
      timerRef.current = setTimeout(() => {
        setParsedItems(MOCK_PARSED_ITEMS)
        setStep(3)
      }, 2000)
    },
    [],
  )

  const handleDrop = useCallback(
    async (e: { items: Array<{ kind: string; getFile?: () => Promise<File> }> }) => {
      setIsDragOver(false)
      const fileItem = e.items.find((i) => i.kind === 'file')
      if (fileItem && fileItem.getFile) {
        const file = await fileItem.getFile()
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (fileList && fileList.length > 0) {
        handleFileUpload(fileList[0])
      }
    },
    [handleFileUpload],
  )

  const handleSubmitReview = useCallback(() => {
    setStep(4)
  }, [])

  // ---- Step 1: Upload ----
  if (step === 1) {
    return (
      <div className="p-6">
        <div className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl border border-[var(--color-border)]/50 p-8">
          <DropZone
            onDropEnter={() => setIsDragOver(true)}
            onDropExit={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex h-[240px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150 ${
              isDragOver
                ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-info-bg)_50%,transparent)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <Upload
              size={48}
              className="mb-4 text-[var(--color-text-muted)]"
            />
            <p className="text-sm font-medium text-[var(--color-text)]">
              {t('supplier.dragDrop')}
            </p>
            <FileTrigger
              acceptedFileTypes={['.pdf', '.xlsx', '.xls', '.csv']}
              onSelect={handleFileSelect}
            >
              <Button className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline cursor-pointer outline-none">
                {t('supplier.browseFiles')}
              </Button>
            </FileTrigger>
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              {t('supplier.maxFileSize')}
            </p>
          </DropZone>
        </div>
      </div>
    )
  }

  // ---- Step 2: Processing ----
  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-6">
        {/* Skeleton loader */}
        <div className="space-y-3 w-full max-w-md">
          <div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse" />
          <div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse w-3/4" />
          <div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse w-1/2" />
          <div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse w-5/6" />
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('supplier.aiParsing')}
        </p>
      </div>
    )
  }

  // ---- Step 3: Review ----
  if (step === 3) {
    return (
      <CatalogReview
        items={parsedItems}
        onSubmit={handleSubmitReview}
        locale={locale}
      />
    )
  }

  // ---- Step 4: Submitted ----
  return (
    <div className="flex flex-col items-center justify-center p-16 gap-6">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-[var(--color-text)]">
        {t('supplier.submitForReview')}
      </p>
      <button
        type="button"
        onClick={() => navigate({ to: '/supplier/stock' })}
        className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer"
      >
        {t('supplier.stockTitle')}
      </button>
    </div>
  )
}
