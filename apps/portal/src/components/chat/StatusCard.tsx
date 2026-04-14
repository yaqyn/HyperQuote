/**
 * StatusCard -- Inline order/quote status card in AI chat responses.
 *
 * Entity number in Geist Mono, semantic color status badge, timeline progress dots.
 * Arabic-Indic numerals when locale is AR.
 */
import { useTranslation } from 'react-i18next'
import type { StatusCardData } from '../../lib/chat-types'

/** Convert Western digits to Arabic-Indic */
function toArabicIndic(str: string): string {
  return str.replace(
    /[0-9]/g,
    (d) =>
      ({
        '0': '\u0660',
        '1': '\u0661',
        '2': '\u0662',
        '3': '\u0663',
        '4': '\u0664',
        '5': '\u0665',
        '6': '\u0666',
        '7': '\u0667',
        '8': '\u0668',
        '9': '\u0669',
      })[d] ?? d,
  )
}

const STATUS_COLORS = {
  green: {
    bg: 'bg-[var(--color-success)]/10',
    text: 'text-[var(--color-success)]',
  },
  yellow: {
    bg: 'bg-[var(--color-warning)]/10',
    text: 'text-[var(--color-warning)]',
  },
  red: {
    bg: 'bg-[var(--color-error)]/10',
    text: 'text-[var(--color-error)]',
  },
} as const

interface StatusCardProps {
  data: StatusCardData
}

export function StatusCard({ data }: StatusCardProps) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const colors = STATUS_COLORS[data.statusColor]

  const displayNumber = isArabic
    ? toArabicIndic(data.displayNumber)
    : data.displayNumber

  const entityLabel =
    data.entityType === 'order'
      ? isArabic
        ? `\u0637\u0644\u0628 #${displayNumber}`
        : `Order #${displayNumber}`
      : isArabic
        ? `\u0639\u0631\u0636 \u0633\u0639\u0631 #${displayNumber}`
        : `Quote #${displayNumber}`

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-3 mt-2">
      {/* Header row: entity number + status badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--color-text)]">
          {entityLabel}
        </span>
        <span
          className={`${colors.bg} ${colors.text} text-[13px] font-semibold rounded-full px-2 py-0.5`}
        >
          {data.status}
        </span>
      </div>

      {/* Key dates */}
      {data.timeline.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {data.timeline
            .filter((t) => t.done)
            .slice(-2)
            .map((step) => (
              <div key={step.label} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  {step.label}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--color-text-muted)]">
                  {isArabic ? toArabicIndic(step.date) : step.date}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Mini progress dots (5 stages) */}
      {data.timeline.length > 0 && (
        <div className="flex items-center gap-1.5">
          {data.timeline.map((step, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                step.done
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-border)]'
              }`}
              title={step.label}
            />
          ))}
        </div>
      )}
    </div>
  )
}
