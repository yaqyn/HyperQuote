import { useTranslation } from 'react-i18next'
import {
  Select,
  Label,
  Button as AriaButton,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  NumberField,
  Input,
} from 'react-aria-components'
import { ChevronDown, Check } from 'lucide-react'
import { useQuoteActionsStore } from '../../stores/quote-actions'
import type { QuoteItem, RejectReason } from '../../types/quote'

interface PartialAcceptControlsProps {
  item: QuoteItem
}

const REJECT_REASONS: RejectReason[] = [
  'too_expensive',
  'not_needed',
  'found_alternative',
  'other',
]

const REASON_KEYS: Record<RejectReason, string> = {
  too_expensive: 'quoteDetail.rejectReasonTooExpensive',
  not_needed: 'quoteDetail.rejectReasonNotNeeded',
  found_alternative: 'quoteDetail.rejectReasonFoundAlternative',
  other: 'quoteDetail.rejectReasonOther',
}

export function PartialAcceptControls({ item }: PartialAcceptControlsProps) {
  const { t } = useTranslation('portal')
  const decision = useQuoteActionsStore((s) => s.lineDecisions[item.id])
  const setLineDecision = useQuoteActionsStore((s) => s.setLineDecision)
  const rejectReason = useQuoteActionsStore((s) => s.rejectReasons[item.id])
  const setRejectReason = useQuoteActionsStore((s) => s.setRejectReason)
  const negotiatedPrice = useQuoteActionsStore((s) => s.negotiatedPrices[item.id])
  const setNegotiatedPrice = useQuoteActionsStore((s) => s.setNegotiatedPrice)

  return (
    <div className="flex flex-col gap-2">
      {/* Decision buttons */}
      <div className="flex flex-row gap-2">
        <button
          type="button"
          onClick={() => setLineDecision(item.id, 'accepted')}
          className={[
            'text-xs px-3 py-1 rounded cursor-pointer flex items-center gap-1 transition-colors',
            decision === 'accepted'
              ? 'bg-[var(--color-success)] text-white'
              : 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
          ].join(' ')}
        >
          {decision === 'accepted' && <Check size={12} />}
          {t('quoteDetail.partialAcceptLine')}
        </button>
        <button
          type="button"
          onClick={() => setLineDecision(item.id, 'rejected')}
          className={[
            'text-xs px-3 py-1 rounded cursor-pointer transition-colors',
            decision === 'rejected'
              ? 'bg-[var(--color-error)] text-white'
              : 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
          ].join(' ')}
        >
          {t('quoteDetail.partialRejectLine')}
        </button>
        <button
          type="button"
          onClick={() => setLineDecision(item.id, 'negotiate')}
          className={[
            'text-xs px-3 py-1 rounded cursor-pointer transition-colors',
            decision === 'negotiate'
              ? 'bg-[var(--color-warning)] text-white'
              : 'bg-amber-50 text-[var(--color-warning)]',
          ].join(' ')}
        >
          {t('quoteDetail.partialNegotiateLine')}
        </button>
      </div>

      {/* Reject reason */}
      {decision === 'rejected' && (
        <Select
          selectedKey={rejectReason ?? null}
          onSelectionChange={(key) => setRejectReason(item.id, key as string)}
          className="flex flex-col gap-1"
        >
          <Label className="text-xs text-[var(--color-text-muted)]">
            {t('quoteDetail.declineReason')}
          </Label>
          <AriaButton className="flex items-center justify-between border border-[var(--color-border)] rounded-lg h-8 px-2 text-xs text-[var(--color-text)] bg-[var(--color-card)] cursor-pointer">
            <SelectValue className="truncate" />
            <ChevronDown size={12} className="text-[var(--color-text-muted)]" />
          </AriaButton>
          <Popover className="w-[var(--trigger-width)] bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
            <ListBox className="outline-none p-1">
              {REJECT_REASONS.map((r) => (
                <ListBoxItem
                  key={r}
                  id={r}
                  className="px-2 py-1.5 text-xs cursor-pointer rounded-md text-[var(--color-text)] hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] outline-none"
                >
                  {t(REASON_KEYS[r])}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      )}

      {/* Negotiate price */}
      {decision === 'negotiate' && (
        <NumberField
          value={negotiatedPrice ?? item.unitPrice}
          onChange={(val) => setNegotiatedPrice(item.id, val)}
          minValue={0}
          formatOptions={{ style: 'currency', currency: 'EGP' }}
          className="flex flex-col gap-1"
        >
          <Label className="text-xs text-[var(--color-text-muted)]">
            {t('quoteDetail.unitPrice')}
          </Label>
          <Input className="border border-[var(--color-border)] rounded-lg h-8 px-2 text-xs font-mono text-[var(--color-text)] bg-[var(--color-card)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 w-32" />
        </NumberField>
      )}

      {/* Accepted indicator */}
      {decision === 'accepted' && (
        <span className="text-xs text-[var(--color-success)] opacity-60">
          <Check size={12} className="inline" /> {t('quoteDetail.partialAcceptLine')}
        </span>
      )}
    </div>
  )
}
