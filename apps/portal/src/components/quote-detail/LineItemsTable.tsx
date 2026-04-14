import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components'
import { CurrencyDisplay } from '@hyperquote/ui'
import type { QuoteItem } from '../../types/quote'

interface LineItemsTableProps {
  items: QuoteItem[]
  editable?: boolean
  onPriceChange?: (itemId: string, price: number) => void
  partialMode?: boolean
  renderPartialControls?: (item: QuoteItem) => ReactNode
}

export function LineItemsTable({
  items,
  editable,
  onPriceChange,
  partialMode,
  renderPartialControls,
}: LineItemsTableProps) {
  const { t, i18n } = useTranslation('portal')
  const isArabic = i18n.language === 'ar'
  const numberFormatter = new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en')

  return (
    <div>
      {/* Desktop: React Aria Table */}
      <div className="hidden md:block">
        <Table
          aria-label={t('quoteDetail.lineItems')}
          className="w-full text-sm"
        >
          <TableHeader>
            <Column isRowHeader className="text-start py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              #
            </Column>
            <Column className="text-start py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('quoteDetail.product')}
            </Column>
            <Column className="text-end py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('quoteDetail.qty')}
            </Column>
            <Column className="text-start py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('quoteDetail.uom')}
            </Column>
            <Column className="text-end py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('quoteDetail.unitPrice')}
            </Column>
            <Column className="text-end py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('quoteDetail.lineTotal')}
            </Column>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <Row
                key={item.id}
                className="border-t border-[var(--color-border)]"
              >
                <Cell className="py-3 px-3 font-mono text-[var(--color-text-muted)]">
                  {numberFormatter.format(index + 1)}
                </Cell>
                <Cell className="py-3 px-3">
                  <div className="flex flex-col">
                    <span className="text-[var(--color-text)]">
                      {isArabic ? item.productNameAr : item.productName}
                    </span>
                    <span className="text-[13px] text-[var(--color-text-muted)]">
                      {isArabic ? item.productName : item.productNameAr}
                    </span>
                  </div>
                </Cell>
                <Cell className="py-3 px-3 text-end font-mono">
                  {numberFormatter.format(item.quantity)}
                </Cell>
                <Cell className="py-3 px-3 text-[var(--color-text-muted)]">
                  {t(`units.${item.unitOfMeasure}`)}
                </Cell>
                <Cell className="py-3 px-3 text-end">
                  {editable ? (
                    <EditablePrice
                      item={item}
                      onPriceChange={onPriceChange}
                    />
                  ) : (
                    <CurrencyDisplay value={item.unitPrice} />
                  )}
                </Cell>
                <Cell className="py-3 px-3 text-end">
                  <CurrencyDisplay value={item.lineTotal} />
                </Cell>
              </Row>
            ))}
          </TableBody>
        </Table>

        {/* Partial mode controls below table rows */}
        {partialMode &&
          renderPartialControls &&
          items.map((item) => (
            <div
              key={`partial-${item.id}`}
              className="border-t border-[var(--color-border)] px-3 py-2"
            >
              {renderPartialControls(item)}
            </div>
          ))}
      </div>

      {/* Mobile: Card layout */}
      <div className="flex md:hidden flex-col gap-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--color-border)] p-4"
          >
            {/* Card title */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {isArabic ? item.productNameAr : item.productName}
                </span>
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  {isArabic ? item.productName : item.productNameAr}
                </span>
              </div>
              <span className="font-mono text-[13px] text-[var(--color-text-muted)]">
                #{numberFormatter.format(index + 1)}
              </span>
            </div>

            {/* Stacked label:value pairs */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  {t('quoteDetail.qty')}
                </span>
                <span className="font-mono text-sm">
                  {numberFormatter.format(item.quantity)}{' '}
                  <span className="text-[13px] text-[var(--color-text-muted)]">
                    {t(`units.${item.unitOfMeasure}`)}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  {t('quoteDetail.unitPrice')}
                </span>
                <span className="text-sm">
                  {editable ? (
                    <EditablePrice
                      item={item}
                      onPriceChange={onPriceChange}
                    />
                  ) : (
                    <CurrencyDisplay value={item.unitPrice} />
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-border)] pt-2">
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  {t('quoteDetail.lineTotal')}
                </span>
                <span className="font-mono text-sm font-semibold">
                  <CurrencyDisplay value={item.lineTotal} />
                </span>
              </div>
            </div>

            {/* Partial controls */}
            {partialMode && renderPartialControls && (
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                {renderPartialControls(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Editable price cell (used in counter-offer mode, wired by Plan 03)
// ============================================================================

function EditablePrice({
  item,
  onPriceChange,
}: {
  item: QuoteItem
  onPriceChange?: (itemId: string, price: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [localPrice, setLocalPrice] = useState(item.unitPrice)
  const isModified = localPrice !== item.unitPrice

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={[
          'font-mono text-sm text-end cursor-pointer px-2 py-1 rounded transition-colors',
          isModified
            ? 'bg-amber-50 dark:bg-amber-950/20'
            : 'hover:bg-[var(--color-surface)]',
        ].join(' ')}
      >
        {isModified && (
          <span className="block text-[13px] line-through text-[var(--color-text-muted)] font-mono">
            <CurrencyDisplay value={item.unitPrice} />
          </span>
        )}
        <CurrencyDisplay value={localPrice} />
      </button>
    )
  }

  return (
    <input
      type="number"
      value={localPrice}
      onChange={(e) => setLocalPrice(Number(e.target.value))}
      onBlur={() => {
        setEditing(false)
        if (localPrice !== item.unitPrice && onPriceChange) {
          onPriceChange(item.id, localPrice)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setEditing(false)
          if (localPrice !== item.unitPrice && onPriceChange) {
            onPriceChange(item.id, localPrice)
          }
        }
        if (e.key === 'Escape') {
          setLocalPrice(item.unitPrice)
          setEditing(false)
        }
      }}
      className={[
        'font-mono text-sm text-end w-28 px-2 py-1 rounded border',
        'border-[var(--color-primary)] bg-[var(--color-card)] outline-none',
        'focus:ring-2 focus:ring-[var(--color-primary)]/20',
      ].join(' ')}
      autoFocus
    />
  )
}
