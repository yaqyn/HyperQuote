import { AnimatePresence, motion } from 'motion/react'
import type { BottleneckStage } from '../../../types/operations'
import { useOperationsStore } from '../../../stores/operations'

interface BottleneckPipelineProps {
  stages: BottleneckStage[]
}

function formatDwell(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m avg`
  return `${h}h ${m}m avg`
}

/**
 * Horizontal flow visualization — each stage is a segment whose WIDTH
 * reflects order count. Bottleneck stage pulses subtly (opacity animation).
 * Stage name above, count + avg time below.
 */
export function BottleneckPipeline({ stages }: BottleneckPipelineProps) {
  const selectedStage = useOperationsStore((s) => s.selectedBottleneckStage)
  const setSelectedStage = useOperationsStore((s) => s.setSelectedBottleneckStage)

  const totalCount = stages.reduce((sum, s) => sum + s.count, 0)
  const maxStuck = Math.max(...stages.map((s) => s.stuckCount))

  const handleClick = (stage: string) => {
    setSelectedStage(selectedStage === stage ? null : stage)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Stage labels above */}
      <div className="flex gap-px">
        {stages.map((stage) => {
          const widthPct = totalCount > 0 ? Math.max((stage.count / totalCount) * 100, 8) : 100 / stages.length
          const isBottleneck = stage.stuckCount === maxStuck && stage.stuckCount > 0
          const isSelected = selectedStage === stage.stage

          return (
            <button
              key={stage.stage}
              type="button"
              onClick={() => handleClick(stage.stage)}
              className="flex flex-col gap-2 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 rounded-lg px-1"
              style={{ width: `${widthPct}%` }}
            >
              {/* Stage name */}
              <span className={`text-[10px] font-medium uppercase tracking-wider truncate transition-colors ${
                isSelected ? 'text-[#2563EB]' : 'text-black/40 dark:text-white/40'
              }`}>
                {stage.label}
              </span>

              {/* Bar segment */}
              <motion.div
                className={`h-8 rounded-md transition-colors ${
                  isSelected
                    ? 'bg-[#2563EB]'
                    : isBottleneck
                      ? 'bg-black/10 dark:bg-white/10'
                      : 'bg-black/[0.05] dark:bg-white/[0.05]'
                } group-hover:bg-black/[0.08] dark:group-hover:bg-white/[0.08] ${
                  isSelected ? 'group-hover:bg-[#2563EB]' : ''
                }`}
                animate={isBottleneck && !isSelected ? {
                  opacity: [1, 0.6, 1],
                } : {}}
                transition={isBottleneck ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                } : {}}
              />

              {/* Count + dwell time below */}
              <div className="flex items-baseline gap-1.5">
                <span className={`font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold ${
                  isSelected ? 'text-[#2563EB]' : ''
                }`}>
                  {stage.count}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/30 dark:text-white/30">
                  {formatDwell(stage.avgDwellMinutes)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
