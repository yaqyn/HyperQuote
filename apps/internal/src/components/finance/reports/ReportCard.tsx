import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'

interface ReportCardProps {
  name: string
  description: string
  keyMetric?: string
  lastGenerated: string | null
  onGenerate: () => void
  onExportCSV: () => void
  onExportPDF: () => void
  onEmail: () => void
  onClick?: () => void
}

/**
 * "The Brief" — Mini document preview card.
 * Title, period selector as pills, 2-3 key numbers, generate/download buttons.
 * Clean, typographic, no icons.
 */
export function ReportCard({
  name,
  description,
  keyMetric,
  lastGenerated,
  onGenerate,
  onExportCSV,
  onExportPDF,
  onEmail,
  onClick,
}: ReportCardProps) {
  const { t } = useTranslation('finance')

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={`flex flex-col justify-between p-5 border-e border-b border-black/[0.04] dark:border-white/[0.04] min-h-[140px] ${
        onClick ? 'cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors' : ''
      }`}
    >
      {/* Top: title + description */}
      <div>
        <div className="text-xs font-medium text-black/70 dark:text-white/70 mb-0.5">
          {name}
        </div>
        <div className="text-[10px] text-black/25 dark:text-white/25 leading-relaxed line-clamp-2">
          {description}
        </div>
      </div>

      {/* Middle: key metric */}
      {keyMetric && (
        <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-black/50 dark:text-white/50 my-2">
          {keyMetric}
        </div>
      )}

      {/* Bottom: last generated + actions */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-[9px] text-black/15 dark:text-white/15">
          {lastGenerated ? (
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{lastGenerated}</span>
          ) : (
            t('reports.neverGenerated', 'Never')
          )}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            onPress={onGenerate}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-[#2563EB] bg-[#2563EB]/[0.06] hover:bg-[#2563EB]/[0.12] transition-colors"
          >
            {t('reports.generate', 'Generate')}
          </Button>
          <Button
            onPress={onExportCSV}
            className="rounded px-1.5 py-0.5 text-[10px] text-black/25 dark:text-white/25 hover:text-black/50 dark:hover:text-white/50 transition-colors"
          >
            CSV
          </Button>
          <Button
            onPress={onExportPDF}
            className="rounded px-1.5 py-0.5 text-[10px] text-black/25 dark:text-white/25 hover:text-black/50 dark:hover:text-white/50 transition-colors"
          >
            PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
