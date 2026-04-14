import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Select,
  Label,
  Button as AriaButton,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { X, ChevronDown } from 'lucide-react'
import { CurrencyDisplay } from '@hyperquote/ui'
import type { QuoteVersion, QuoteItem } from '../../types/quote'

interface VersionComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  versions: QuoteVersion[]
}

interface ItemDiff {
  productId: string
  productName: string
  productNameAr: string
  changeType: 'added' | 'removed' | 'modified' | 'unchanged'
  priceA?: number
  priceB?: number
  qtyA?: number
  qtyB?: number
}

function buildDiff(vA: QuoteVersion, vB: QuoteVersion): ItemDiff[] {
  const mapA = new Map(vA.items.map((i) => [i.productId, i]))
  const mapB = new Map(vB.items.map((i) => [i.productId, i]))
  const diffs: ItemDiff[] = []

  for (const item of vB.items) {
    const oldItem = mapA.get(item.productId)
    if (!oldItem) {
      diffs.push({
        productId: item.productId,
        productName: item.productName,
        productNameAr: item.productNameAr,
        changeType: 'added',
        priceB: item.unitPrice,
        qtyB: item.quantity,
      })
    } else if (oldItem.unitPrice !== item.unitPrice || oldItem.quantity !== item.quantity) {
      diffs.push({
        productId: item.productId,
        productName: item.productName,
        productNameAr: item.productNameAr,
        changeType: 'modified',
        priceA: oldItem.unitPrice,
        priceB: item.unitPrice,
        qtyA: oldItem.quantity,
        qtyB: item.quantity,
      })
    } else {
      diffs.push({
        productId: item.productId,
        productName: item.productName,
        productNameAr: item.productNameAr,
        changeType: 'unchanged',
        priceA: oldItem.unitPrice,
        priceB: item.unitPrice,
        qtyA: oldItem.quantity,
        qtyB: item.quantity,
      })
    }
  }

  for (const item of vA.items) {
    if (!mapB.has(item.productId)) {
      diffs.push({
        productId: item.productId,
        productName: item.productName,
        productNameAr: item.productNameAr,
        changeType: 'removed',
        priceA: item.unitPrice,
        qtyA: item.quantity,
      })
    }
  }

  return diffs
}

export function VersionComparisonModal({
  isOpen,
  onClose,
  versions,
}: VersionComparisonModalProps) {
  const { t, i18n } = useTranslation('portal')
  const isArabic = i18n.language === 'ar'

  const defaultA = versions.length >= 2 ? versions[versions.length - 2].id : versions[0]?.id
  const defaultB = versions[versions.length - 1]?.id

  const [versionAId, setVersionAId] = useState<string>(defaultA ?? '')
  const [versionBId, setVersionBId] = useState<string>(defaultB ?? '')

  const vA = versions.find((v) => v.id === versionAId)
  const vB = versions.find((v) => v.id === versionBId)

  const diffs = vA && vB ? buildDiff(vA, vB) : []

  const percentChange =
    vA && vB && vA.total > 0
      ? (((vB.total - vA.total) / vA.total) * 100).toFixed(1)
      : '0'
  const isIncrease = vA && vB ? vB.total > vA.total : false
  const isDecrease = vA && vB ? vB.total < vA.total : false

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    >
      <Modal className="max-w-[960px] w-[95vw] max-h-[80vh] overflow-auto mx-4">
        <Dialog isKeyboardDismissDisabled className="outline-none">
          <div className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)]">
                {t('quoteDetail.compareVersions')}
              </Heading>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-[var(--color-surface)] cursor-pointer"
              >
                <X size={18} className="text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* Summary bar */}
            {vA && vB && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-surface)] text-sm">
                <span className="text-[var(--color-text)]">
                  {t('quoteDetail.totalChanged', {
                    from: '',
                    to: '',
                    percent: `${percentChange}%`,
                  })}
                </span>{' '}
                <span className="font-mono text-[var(--color-text-muted)] line-through">
                  <CurrencyDisplay value={vA.total} />
                </span>{' '}
                <span className="font-mono font-semibold">
                  <CurrencyDisplay value={vB.total} />
                </span>{' '}
                <span
                  className={[
                    'font-mono font-semibold',
                    isDecrease ? 'text-[var(--color-success)]' : '',
                    isIncrease ? 'text-[var(--color-error)]' : '',
                  ].join(' ')}
                >
                  ({isDecrease ? '-' : '+'}
                  {percentChange}%)
                </span>
              </div>
            )}

            {/* Version selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <VersionSelect
                label={t('quoteDetail.versionA')}
                versions={versions}
                selectedId={versionAId}
                onSelect={setVersionAId}
                isArabic={isArabic}
                t={t}
              />
              <VersionSelect
                label={t('quoteDetail.versionB')}
                versions={versions}
                selectedId={versionBId}
                onSelect={setVersionBId}
                isArabic={isArabic}
                t={t}
              />
            </div>

            <p className="text-[13px] text-[var(--color-text-muted)] mb-3 md:hidden">
              Scroll to compare
            </p>

            {/* Diff table */}
            <div className="flex flex-col gap-1">
              {diffs.map((diff) => (
                <div
                  key={diff.productId}
                  className={[
                    'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
                    diff.changeType === 'added'
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : diff.changeType === 'removed'
                        ? 'bg-red-50 dark:bg-red-950/20'
                        : diff.changeType === 'modified'
                          ? 'bg-amber-50 dark:bg-amber-950/20'
                          : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'text-[var(--color-text)]',
                        diff.changeType === 'removed' ? 'line-through' : '',
                      ].join(' ')}
                    >
                      {isArabic ? diff.productNameAr : diff.productName}
                    </span>
                    {diff.changeType === 'added' && (
                      <span className="bg-[var(--color-success)] text-white text-[13px] px-2 py-0.5 rounded">
                        {t('quoteDetail.newItem')}
                      </span>
                    )}
                    {diff.changeType === 'removed' && (
                      <span className="bg-[var(--color-error)] text-white text-[13px] px-2 py-0.5 rounded">
                        {t('quoteDetail.removedItem')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {diff.changeType === 'modified' && diff.priceA !== undefined && (
                      <span className="font-mono text-[var(--color-text-muted)] line-through">
                        <CurrencyDisplay value={diff.priceA} />
                      </span>
                    )}
                    {diff.priceB !== undefined && (
                      <span className="font-mono font-semibold">
                        <CurrencyDisplay value={diff.priceB} />
                      </span>
                    )}
                    {diff.priceA !== undefined && diff.priceB === undefined && (
                      <span className="font-mono text-[var(--color-text-muted)] line-through">
                        <CurrencyDisplay value={diff.priceA} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function VersionSelect({
  label,
  versions,
  selectedId,
  onSelect,
  isArabic,
  t,
}: {
  label: string
  versions: QuoteVersion[]
  selectedId: string
  onSelect: (id: string) => void
  isArabic: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <Select
      selectedKey={selectedId}
      onSelectionChange={(key) => onSelect(key as string)}
      className="flex flex-col gap-1"
    >
      <Label className="text-sm text-[var(--color-text-muted)]">{label}</Label>
      <AriaButton className="flex items-center justify-between border border-[var(--color-border)] rounded-lg h-10 px-3 text-sm text-[var(--color-text)] bg-[var(--color-card)] cursor-pointer">
        <SelectValue className="truncate" />
        <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
      </AriaButton>
      <Popover className="w-[var(--trigger-width)] bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
        <ListBox className="outline-none p-1">
          {versions.map((v) => (
            <ListBoxItem
              key={v.id}
              id={v.id}
              className="px-3 py-2 text-sm cursor-pointer rounded-md text-[var(--color-text)] hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] outline-none"
            >
              {t('quoteDetail.version', { number: v.versionNumber })}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}
