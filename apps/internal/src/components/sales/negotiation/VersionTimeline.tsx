import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuoteVersion } from '../../../types/sales'

// ─── Mock Version Chain ──────────────────────────────────────

function getMockVersionChain(quoteId: string): QuoteVersion[] {
  // Simulate traversing previous_version_id chain
  return [
    {
      id: `${quoteId}-v1`,
      quoteNumber: 'QT-2026-00523',
      version: 1,
      status: 'sent',
      total: 863_422,
      marginPercent: 18.2,
      createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      changes: 'Original quote',
    },
    {
      id: `${quoteId}-v2`,
      quoteNumber: 'QT-2026-00523',
      version: 2,
      status: 'revised',
      total: 841_900,
      marginPercent: 16.5,
      createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      changes: 'Adjusted steel pricing per counter',
    },
    {
      id: quoteId,
      quoteNumber: 'QT-2026-00523',
      version: 3,
      status: 'negotiating',
      total: 835_200,
      marginPercent: 15.8,
      createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      changes: 'Final revision with volume discount',
    },
  ]
}

function getVersionLabel(index: number, total: number): string {
  if (index === 0) return 'Original'
  if (index === total - 1) return 'Current'
  return 'Revised'
}

// ─── Component ───────────────────────────────────────────────

interface VersionTimelineProps {
  quoteId: string
  selectedVersions: [string, string]
  onSelectVersion: (versionId: string) => void
}

export function VersionTimeline({
  quoteId,
  selectedVersions,
  onSelectVersion,
}: VersionTimelineProps) {
  const { t } = useTranslation('internal')
  const [versions] = useState(() => getMockVersionChain(quoteId))

  return (
    <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 border-b border-black/10 dark:border-white/10">
      <span className="text-xs text-black/50 dark:text-white/50 shrink-0">
        {t('sales.negotiation.versionTimeline', 'Version Timeline')}
      </span>
      <div className="flex items-center gap-2">
        {versions.map((version, idx) => {
          const isSelected = selectedVersions.includes(version.id)
          const label = getVersionLabel(idx, versions.length)

          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onSelectVersion(version.id)}
              className={[
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                'hover:bg-black/5 dark:hover:bg-white/5',
                isSelected
                  ? 'border-b-2 border-[#2563EB] bg-black/5 dark:bg-white/5'
                  : 'border-b-2 border-transparent',
              ].join(' ')}
            >
              <span className="font-mono text-sm font-semibold">
                v{version.version}
              </span>
              <span className="text-[11px] text-black/50 dark:text-white/50">
                {label}
              </span>
              <span className="font-mono text-[11px] text-black/40 dark:text-white/40">
                {new Date(version.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
              <span className="font-mono text-xs">
                EGP {version.total.toLocaleString('en-EG')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
