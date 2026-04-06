import { ChevronRight } from 'lucide-react'
import type { BottleneckStage } from '../../../types/operations'
import { useOperationsStore } from '../../../stores/operations'

interface BottleneckPipelineProps {
  stages: BottleneckStage[]
}

function formatDwell(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `Avg ${m}m`
  return `Avg ${h}h ${m}m`
}

export function BottleneckPipeline({ stages }: BottleneckPipelineProps) {
  const selectedStage = useOperationsStore((s) => s.selectedBottleneckStage)
  const setSelectedStage = useOperationsStore((s) => s.setSelectedBottleneckStage)

  const handleClick = (stage: string) => {
    setSelectedStage(selectedStage === stage ? null : stage)
  }

  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, idx) => (
        <div key={stage.stage} className="contents">
          <button
            type="button"
            onClick={() => handleClick(stage.stage)}
            className={`flex-1 min-w-[180px] rounded-lg border p-4 cursor-pointer transition-colors ${
              selectedStage === stage.stage
                ? 'border-[#2563EB] bg-[#2563EB]/5'
                : 'border-[var(--color-border)] hover:border-[#2563EB]'
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{stage.label}</span>
              <span className="font-geist-mono text-base font-medium">{stage.count}</span>
              <span className="font-geist-mono text-xs font-normal text-black/40 dark:text-white/40">
                {formatDwell(stage.avgDwellMinutes)}
              </span>
              <span
                className={`font-geist-mono text-xs font-normal ${
                  stage.stuckCount > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {stage.stuckCount} stuck
              </span>
            </div>
          </button>
          {idx < stages.length - 1 && (
            <ChevronRight size={16} className="text-black/30 dark:text-white/30 shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}
