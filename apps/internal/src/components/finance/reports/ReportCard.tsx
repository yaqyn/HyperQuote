import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'

interface ReportCardProps {
  name: string
  description: string
  icon: string
  lastGenerated: string | null
  onGenerate: () => void
  onExportCSV: () => void
  onExportPDF: () => void
  onEmail: () => void
  onClick?: () => void
}

/**
 * Individual report card with glass panel, actions, and last-generated timestamp.
 * Used in ReportsDashboard grid.
 */
export function ReportCard({
  name,
  description,
  icon,
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
      className={`rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 flex flex-col gap-3 ${
        onClick ? 'cursor-pointer hover:border-[#2563EB]/30 hover:bg-[#2563EB]/3 transition-colors' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-black/90 dark:text-white/90 truncate">{name}</h4>
          <p className="text-xs text-black/50 dark:text-white/50 mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      {/* Last generated */}
      <div className="text-xs text-black/40 dark:text-white/40">
        {lastGenerated ? (
          <>
            {t('reports.lastGenerated', 'Last generated')}: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{lastGenerated}</span>
          </>
        ) : (
          t('reports.neverGenerated', 'Never generated')
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <Button
          onPress={onGenerate}
          className="rounded-md bg-[#2563EB] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('reports.generate', 'Generate')}
        </Button>
        <Button
          onPress={onExportCSV}
          className="rounded-md border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          CSV
        </Button>
        <Button
          onPress={onExportPDF}
          className="rounded-md border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          PDF
        </Button>
        <Button
          onPress={onEmail}
          className="rounded-md border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('reports.email', 'Email')}
        </Button>
      </div>
    </div>
  )
}
