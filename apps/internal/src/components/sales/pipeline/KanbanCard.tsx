import type { PipelineDeal } from '../../../types/sales'
import { TierBadge } from '../shared/TierBadge'

interface KanbanCardProps {
  deal: PipelineDeal
  onSelect: (deal: PipelineDeal) => void
}

function getDaysColor(days: number): string {
  if (days < 5) return 'text-green-600'
  if (days <= 15) return 'text-yellow-600'
  return 'text-red-600'
}

function getBorderColor(color: PipelineDeal['color']): string {
  switch (color) {
    case 'green':
      return 'border-s-green-500'
    case 'yellow':
      return 'border-s-yellow-500'
    case 'red':
      return 'border-s-red-500'
    default:
      return 'border-s-black/20'
  }
}

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function KanbanCard({ deal, onSelect }: KanbanCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(deal)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(deal)
        }
      }}
      className={`cursor-pointer rounded-lg border border-s-4 border-black/10 bg-white p-3 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-black/40 ${getBorderColor(deal.color)}`}
    >
      {/* Customer + tier */}
      <div className="mb-1 flex items-center gap-2">
        <span className="truncate text-sm font-medium">{deal.customerName}</span>
        <TierBadge tier={deal.customerTier} />
      </div>

      {/* Deal value */}
      <div className="mb-2 font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
        {formatValue(deal.dealValue)}
      </div>

      {/* Status text */}
      <p className="mb-2 text-xs text-black/50 dark:text-white/50">{deal.statusText}</p>

      {/* Bottom row: days in stage, win probability, rep avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`font-[family-name:var(--font-geist-mono)] text-xs ${getDaysColor(deal.daysInStage)}`}
          >
            {deal.daysInStage}d
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40">
            {deal.winProbability}%
          </span>
        </div>

        {/* Rep avatar (initials) */}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB]/10 text-[10px] font-medium text-[#2563EB]"
          title={deal.assignedRep}
        >
          {deal.assignedRep
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </div>
      </div>
    </div>
  )
}
