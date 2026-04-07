import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuoteVersion } from '../../../types/sales'

// ─── Mock Version Chain ─────────────────────────────────────

function getMockVersionChain(quoteId: string): QuoteVersion[] {
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

// ─── Component ──────────────────────────────────────────────

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
    <div className="flex w-full flex-col py-4 ps-6 pe-4">
      <span className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
        {t('sales.negotiation.versionTimeline', 'Version Timeline')}
      </span>

      <div className="relative flex flex-col">
        {/* Vertical connecting line */}
        <div className="absolute start-[5px] top-2 bottom-2 w-px bg-black/[0.08] dark:bg-white/[0.08]" />

        {versions.map((version, idx) => {
          const isSelected = selectedVersions.includes(version.id)
          const isLast = idx === versions.length - 1

          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onSelectVersion(version.id)}
              className={[
                'relative flex items-start gap-3 rounded-lg py-2.5 ps-0 pe-3 text-start transition-colors',
                'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]',
              ].join(' ')}
            >
              {/* Dot on the line */}
              <div className="relative z-10 mt-1 flex size-[11px] shrink-0 items-center justify-center">
                <span
                  className={[
                    'block rounded-full transition-all',
                    isSelected
                      ? 'size-[11px] bg-[var(--color-primary)]'
                      : 'size-[7px] bg-black/[0.15] dark:bg-white/[0.15]',
                  ].join(' ')}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
                    v{version.version}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                    {new Date(version.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                  {version.changes}
                </p>
                <span className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                  EGP {version.total.toLocaleString('en-EG')}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
