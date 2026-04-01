/**
 * Quick Pad -- spreadsheet-style rapid entry grid for quote builder Step 1.
 * 3 columns: SKU/name (ComboBox), Quantity (NumberField), UOM (read-only).
 * Tab key flow: SKU -> Qty -> next row. Enter adds item. Ctrl+Enter adds all.
 * Multi-SKU paste support: newline/tab-separated values fill subsequent rows.
 */
import { useState, useCallback, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react'
import {
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  NumberField,
  Popover,
  Group,
  Text,
  Button,
} from 'react-aria-components'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useProductSearch } from '../../../hooks/useProductSearch'
import { useQuoteBuilderStore, type QuoteItem } from '../../../stores/quote-builder'

// ============================================================================
// Types
// ============================================================================

interface PadRow {
  id: string
  skuQuery: string
  productId?: string
  productName?: string
  quantity: number | null
  uom: string
  isValid: boolean
  error?: string
}

const INITIAL_ROWS = 10
const BUFFER_ROWS = 3

function createEmptyRow(): PadRow {
  return {
    id: crypto.randomUUID(),
    skuQuery: '',
    productId: undefined,
    productName: undefined,
    quantity: null,
    uom: '',
    isValid: false,
    error: undefined,
  }
}

// ============================================================================
// Single row component
// ============================================================================

function PadRowInput({
  row,
  index,
  onUpdate,
  onEnter,
  skuRef,
  qtyRef,
}: {
  row: PadRow
  index: number
  onUpdate: (index: number, updates: Partial<PadRow>) => void
  onEnter: (index: number) => void
  skuRef: React.RefObject<HTMLInputElement | null>
  qtyRef: React.RefObject<HTMLInputElement | null>
}) {
  const { t } = useTranslation('portal')
  const [query, setQuery] = useState(row.skuQuery)
  const { results, isLoading } = useProductSearch(query)

  const handleProductSelect = useCallback(
    (key: React.Key | null) => {
      if (!key) return
      const product = results.find((r) => r.id === key)
      if (product) {
        onUpdate(index, {
          productId: product.id,
          productName: product.name,
          skuQuery: product.name,
          uom: product.defaultUom || 'piece',
          isValid: true,
          error: undefined,
        })
        setQuery(product.name)
        // Focus quantity field
        qtyRef.current?.focus()
      }
    },
    [results, index, onUpdate, qtyRef],
  )

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value)
      onUpdate(index, {
        skuQuery: value,
        productId: undefined,
        productName: undefined,
        isValid: false,
        error: value.length > 0 ? t('quoteBuilder.quickPadInvalidSku', 'Product not found') : undefined,
      })
    },
    [index, onUpdate, t],
  )

  const handleQuantityChange = useCallback(
    (value: number) => {
      onUpdate(index, { quantity: value })
    },
    [index, onUpdate],
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text/plain')
      if (text.includes('\n') || text.includes('\t')) {
        e.preventDefault()
        const lines = text.split(/[\n\t]+/).filter((l) => l.trim())
        // First line goes to current row
        if (lines[0]) {
          setQuery(lines[0].trim())
          onUpdate(index, { skuQuery: lines[0].trim() })
        }
        // Remaining lines trigger paste fill on parent
        if (lines.length > 1) {
          // Dispatch custom event for parent to handle multi-row paste
          const event = new CustomEvent('quickpad-paste', {
            detail: { startIndex: index + 1, values: lines.slice(1).map((l) => l.trim()) },
          })
          document.dispatchEvent(event)
        }
      }
    },
    [index, onUpdate],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onEnter(index)
      }
    },
    [index, onEnter],
  )

  return (
    <div
      className="flex h-11 items-center border-b border-[var(--color-border)]"
      onKeyDown={handleKeyDown}
    >
      {/* SKU/Name ComboBox - 60% */}
      <div className="w-[60%] px-xs">
        <ComboBox
          inputValue={query}
          onInputChange={handleInputChange}
          onSelectionChange={handleProductSelect}
          className="w-full"
        >
          <Input
            ref={skuRef}
            placeholder={t('quoteBuilder.quickPadSku', 'SKU or product name')}
            onPaste={handlePaste}
            className={`h-8 w-full rounded border px-sm text-xs outline-none ${
              row.error
                ? 'border-[var(--color-error)]'
                : 'border-transparent focus:border-[var(--color-primary)]'
            }`}
          />
          <Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg">
            <ListBox className="max-h-48 overflow-auto p-xs">
              {isLoading ? (
                <ListBoxItem id="loading" className="px-sm py-xs text-xs text-[var(--color-text-subtle)]">
                  Loading...
                </ListBoxItem>
              ) : results.length === 0 && query.length >= 2 ? (
                <ListBoxItem id="empty" className="px-sm py-xs text-xs text-[var(--color-text-subtle)]">
                  No products found
                </ListBoxItem>
              ) : (
                results.map((product) => (
                  <ListBoxItem
                    key={product.id}
                    id={product.id}
                    className="cursor-pointer rounded-lg px-sm py-xs text-xs hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
                  >
                    {product.name} {product.sku ? `(${product.sku})` : ''}
                  </ListBoxItem>
                ))
              )}
            </ListBox>
          </Popover>
        </ComboBox>
        {row.error && row.skuQuery.length > 0 && (
          <Text className="px-sm text-[10px] text-[var(--color-error)]">{row.error}</Text>
        )}
      </div>

      {/* Quantity NumberField - 20% */}
      <div className="w-[20%] px-xs">
        <NumberField
          value={row.quantity ?? undefined}
          onChange={handleQuantityChange}
          minValue={1}
          className="w-full"
        >
          <Group>
            <Input
              ref={qtyRef}
              placeholder={t('quoteBuilder.quickPadQty', 'Qty')}
              className="h-8 w-full rounded border border-transparent px-sm font-[family-name:var(--font-geist-mono)] text-xs outline-none focus:border-[var(--color-primary)]"
            />
          </Group>
        </NumberField>
      </div>

      {/* UOM display - 20% */}
      <div className="w-[20%] px-xs">
        <span className="text-xs text-[var(--color-text-subtle)]">
          {row.uom || t('quoteBuilder.quickPadUom', 'UOM')}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Mobile single-row mode
// ============================================================================

function MobilePadRow({
  row,
  index,
  total,
  onUpdate,
  onEnter,
  onNavigate,
}: {
  row: PadRow
  index: number
  total: number
  onUpdate: (index: number, updates: Partial<PadRow>) => void
  onEnter: (index: number) => void
  onNavigate: (direction: 'prev' | 'next') => void
}) {
  const { t } = useTranslation('portal')
  const skuRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-sm rounded-xl border border-[var(--color-border)] p-md">
      <Text className="text-xs text-[var(--color-text-subtle)]">
        Row <span className="font-[family-name:var(--font-geist-mono)]">{index + 1}</span> of{' '}
        <span className="font-[family-name:var(--font-geist-mono)]">{total}</span>
      </Text>
      <PadRowInput
        row={row}
        index={index}
        onUpdate={onUpdate}
        onEnter={onEnter}
        skuRef={skuRef}
        qtyRef={qtyRef}
      />
      <div className="flex gap-sm">
        <Button
          isDisabled={index === 0}
          onPress={() => onNavigate('prev')}
          className="h-9 flex-1 rounded-xl border border-[var(--color-border)] text-xs font-semibold outline-none hover:bg-[var(--color-surface)] disabled:opacity-40"
        >
          {t('quoteBuilder.quickPadPrevious', 'Previous')}
        </Button>
        <Button
          onPress={() => onNavigate('next')}
          className="h-9 flex-1 rounded-xl border border-[var(--color-border)] text-xs font-semibold outline-none hover:bg-[var(--color-surface)]"
        >
          {t('quoteBuilder.quickPadNext', 'Next')}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main QuickPad component
// ============================================================================

export function QuickPad() {
  const { t } = useTranslation('portal')
  const addItem = useQuoteBuilderStore((s) => s.addItem)
  const items = useQuoteBuilderStore((s) => s.items)

  const [rows, setRows] = useState<PadRow[]>(() =>
    Array.from({ length: INITIAL_ROWS }, () => createEmptyRow()),
  )
  const [mobileIndex, setMobileIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const skuRefs = useRef<Map<number, HTMLInputElement>>(new Map())
  const qtyRefs = useRef<Map<number, HTMLInputElement>>(new Map())

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Ensure buffer rows at bottom
  useEffect(() => {
    const lastFilledIndex = rows.findLastIndex((r) => r.skuQuery.length > 0 || r.quantity !== null)
    const emptyAfter = rows.length - 1 - lastFilledIndex
    if (emptyAfter < BUFFER_ROWS) {
      const needed = BUFFER_ROWS - emptyAfter
      setRows((prev) => [...prev, ...Array.from({ length: needed }, () => createEmptyRow())])
    }
  }, [rows])

  // Listen for paste events from child rows
  useEffect(() => {
    const handler = (e: Event) => {
      const { startIndex, values } = (e as CustomEvent).detail as {
        startIndex: number
        values: string[]
      }
      setRows((prev) => {
        const updated = [...prev]
        for (let i = 0; i < values.length; i++) {
          const rowIndex = startIndex + i
          if (rowIndex >= updated.length) {
            updated.push(createEmptyRow())
          }
          updated[rowIndex] = { ...updated[rowIndex], skuQuery: values[i] }
        }
        return updated
      })
    }
    document.addEventListener('quickpad-paste', handler)
    return () => document.removeEventListener('quickpad-paste', handler)
  }, [])

  const handleUpdate = useCallback((index: number, updates: Partial<PadRow>) => {
    setRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
  }, [])

  const handleEnter = useCallback(
    (index: number) => {
      const row = rows[index]
      if (row.isValid && row.quantity && row.quantity > 0) {
        const newItem: QuoteItem = {
          id: crypto.randomUUID(),
          productId: row.productId,
          customerDescription: row.productName || row.skuQuery,
          quantity: row.quantity,
          unitOfMeasure: row.uom || 'piece',
          notes: undefined,
          matchConfidence: row.productId ? 1 : undefined,
          sortOrder: items.length,
          isUnmatched: !row.productId,
        }
        addItem(newItem)

        // Clear the row
        setRows((prev) => {
          const updated = [...prev]
          updated[index] = createEmptyRow()
          return updated
        })
      }
    },
    [rows, addItem, items.length],
  )

  const handleAddAll = useCallback(() => {
    const validRows = rows.filter(
      (r) => r.isValid && r.quantity && r.quantity > 0,
    )
    for (const row of validRows) {
      const newItem: QuoteItem = {
        id: crypto.randomUUID(),
        productId: row.productId,
        customerDescription: row.productName || row.skuQuery,
        quantity: row.quantity!,
        unitOfMeasure: row.uom || 'piece',
        notes: undefined,
        matchConfidence: row.productId ? 1 : undefined,
        sortOrder: items.length,
        isUnmatched: !row.productId,
      }
      addItem(newItem)
    }

    // Clear all rows
    setRows(Array.from({ length: INITIAL_ROWS }, () => createEmptyRow()))
  }, [rows, addItem, items.length])

  // Ctrl+Enter handler for adding all
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleAddAll()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleAddAll])

  const validCount = rows.filter(
    (r) => r.isValid && r.quantity && r.quantity > 0,
  ).length

  // ---- Mobile mode ----
  if (isMobile) {
    const currentRow = rows[mobileIndex] || createEmptyRow()
    return (
      <div className="flex flex-col gap-md">
        <MobilePadRow
          row={currentRow}
          index={mobileIndex}
          total={rows.length}
          onUpdate={handleUpdate}
          onEnter={handleEnter}
          onNavigate={(dir) => {
            if (dir === 'prev' && mobileIndex > 0) setMobileIndex(mobileIndex - 1)
            if (dir === 'next') setMobileIndex(Math.min(mobileIndex + 1, rows.length - 1))
          }}
        />
        {validCount > 0 && (
          <Button
            onPress={handleAddAll}
            className="h-11 rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-white outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {t('quoteBuilder.quickPadAddAll', 'Add All')} ({validCount})
          </Button>
        )}
      </div>
    )
  }

  // ---- Desktop mode ----
  return (
    <div className="flex flex-col gap-sm">
      {/* Header */}
      <div className="flex h-9 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="w-[60%] px-sm text-xs font-semibold">
          {t('quoteBuilder.quickPadSku', 'SKU or product name')}
        </div>
        <div className="w-[20%] px-sm text-xs font-semibold">
          {t('quoteBuilder.quickPadQty', 'Qty')}
        </div>
        <div className="w-[20%] px-sm text-xs font-semibold">
          {t('quoteBuilder.quickPadUom', 'UOM')}
        </div>
      </div>

      {/* Rows */}
      <div className="max-h-[440px] overflow-y-auto">
        {rows.map((row, index) => (
          <PadRowInput
            key={row.id}
            row={row}
            index={index}
            onUpdate={handleUpdate}
            onEnter={handleEnter}
            skuRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
            qtyRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
          />
        ))}
      </div>

      {/* Footer actions */}
      {validCount > 0 && (
        <div className="flex items-center gap-sm pt-sm">
          <Button
            onPress={handleAddAll}
            className="flex h-11 items-center gap-xs rounded-xl bg-[var(--color-primary)] px-md text-sm font-semibold text-white outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <Plus size={16} />
            {t('quoteBuilder.quickPadAddAll', 'Add All')} (
            <span className="font-[family-name:var(--font-geist-mono)]">{validCount}</span>)
          </Button>
          <Text className="text-xs text-[var(--color-text-subtle)]">
            Ctrl+Enter
          </Text>
        </div>
      )}
    </div>
  )
}
