import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface ProjectsTabProps {
  customerId: string
  enabled: boolean
}

const STAGE_COLORS: Record<string, string> = {
  planning: '#2563EB',
  foundation: '#eab308',
  structure: '#22c55e',
  finishing: 'var(--color-text-muted)',
}

export function ProjectsTab({ customerId, enabled }: ProjectsTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'projects', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.projects,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
        {t('sales.customer360.projects.noProjects')}
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Timeline-style vertical list */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute start-[7px] top-2 bottom-2 w-px bg-black/[0.06] dark:bg-white/[0.06]" />

        <div className="space-y-6">
          {data.map((project) => {
            const stageColor = STAGE_COLORS[project.stage] ?? STAGE_COLORS.planning

            return (
              <div key={project.id} className="relative flex items-start gap-4 ps-6">
                {/* Timeline dot */}
                <div
                  className="absolute start-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-white dark:bg-[var(--color-bg)]"
                  style={{ borderColor: stageColor }}
                />

                <div className="flex-1 min-w-0">
                  {/* Name + stage pill */}
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-[13px] font-semibold text-[var(--color-text)] dark:text-white">
                      {project.name}
                    </h4>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ color: stageColor, backgroundColor: `color-mix(in srgb, ${stageColor} 10%, transparent)` }}
                    >
                      {project.stage}
                    </span>
                  </div>

                  {/* Materials as tiny tags */}
                  <div className="flex flex-wrap gap-1">
                    {project.materialRequirements.map((mat) => (
                      <span
                        key={mat}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.05] text-black/40 dark:text-white/40"
                      >
                        {mat.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  {/* AI Cross-sell placeholder */}
                  <p className="text-[11px] text-black/20 dark:text-white/20 italic mt-2">
                    {t('sales.customer360.projects.aiCrossSell')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 ps-6">
          <div className="w-3 h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
            <div className="h-3 w-60 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  )
}
