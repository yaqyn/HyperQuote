import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getCEOWeeklyInsight } from '../../lib/server/digest'

const insightSearchSchema = z.object({
  weekOf: z.string().optional(),
})

export const Route = createFileRoute('/_ceo/insight')({
  validateSearch: insightSearchSchema,
  loaderDeps: ({ search }) => ({ weekOf: search.weekOf }),
  loader: ({ deps }) => {
    const weekOf = deps.weekOf || new Date().toISOString().slice(0, 10)
    return getCEOWeeklyInsight({ data: { weekOf } })
  },
  component: InsightPage,
})

function InsightPage() {
  const insight = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          aria-label="Go back"
        >
          &larr;
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Weekly Insight
          </h1>
          <p className="font-mono text-sm text-[var(--color-text-muted)]">
            Week of {insight.weekOf}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {/* Performance Summary */}
          <div>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Performance Summary
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text)]">
              {insight.performanceSummary}
            </p>
          </div>

          {/* Key Observations */}
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Key Observations
            </h2>
            <ol className="space-y-3">
              {insight.keyObservations.map((observation, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 font-mono text-sm font-medium text-[var(--color-text)]">
                    {i + 1}.
                  </span>
                  <p className="text-sm leading-relaxed text-[var(--color-text)]">
                    {observation}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Recommended Actions */}
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Recommended Actions
            </h2>
            <div className="space-y-3">
              {insight.recommendedActions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] px-4 py-3"
                >
                  <p className="text-sm text-[var(--color-text)]">
                    {action.action}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/entity/$entityType/$entityId',
                        params: {
                          entityType: action.entityType,
                          entityId: action.entityId,
                        },
                      })
                    }
                    className="shrink-0 text-sm font-medium text-[var(--color-text)] transition-opacity hover:opacity-70"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generated note */}
          <p className="text-xs text-[var(--color-text-muted)]">
            Generated Sunday 8:00 PM
          </p>
        </div>
      </div>
    </div>
  )
}
