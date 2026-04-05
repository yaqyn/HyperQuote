import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface ProjectsTabProps {
  customerId: string
  enabled: boolean
}

const STAGE_STYLES: Record<string, string> = {
  planning: 'bg-[#2563EB]/10 text-[#2563EB]',
  foundation: 'bg-[#eab308]/10 text-[#eab308]',
  structure: 'bg-[#22c55e]/10 text-[#22c55e]',
  finishing: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
}

export function ProjectsTab({ customerId, enabled }: ProjectsTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'projects', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.projects,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
        {t('sales.customer360.projects.noProjects')}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {data.map((project) => (
        <div
          key={project.id}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-black dark:text-white">
              {project.name}
            </h4>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                STAGE_STYLES[project.stage] ?? STAGE_STYLES.planning
              }`}
            >
              {project.stage}
            </span>
          </div>

          <div>
            <p className="text-xs text-black/40 dark:text-white/40 mb-2">
              {t('sales.customer360.projects.materialRequirements')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {project.materialRequirements.map((mat) => (
                <span
                  key={mat}
                  className="text-xs px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60"
                >
                  {mat.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* AI Cross-sell Placeholder */}
          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
            <p className="text-xs text-black/30 dark:text-white/30 italic">
              {t('sales.customer360.projects.aiCrossSell')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-32 rounded-xl bg-black/5 dark:bg-white/5" />
      ))}
    </div>
  )
}
