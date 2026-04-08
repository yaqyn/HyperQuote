interface StepIndicatorProps {
  current: number
  total: number
  label?: 'task' | 'step' | 'count'
  /** Optional step name shown alongside "Step X/Y" */
  stepName?: string
}

/**
 * Horizontal dots connected by line.
 * Current = blue + larger. Completed = filled black. Pending = outline only.
 * Numbers in Geist Mono. Optional step name for clarity.
 */
export function StepIndicator({
  current,
  total,
  label = 'step',
  stepName,
}: StepIndicatorProps) {
  const labelText =
    label === 'task' ? 'Task' : label === 'count' ? 'Count' : 'Step'

  return (
    <div className="flex flex-col gap-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          {labelText}{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-black/90 dark:text-white/90">
            {current}
          </span>
          <span className="text-black/30 dark:text-white/30"> / </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-black/90 dark:text-white/90">
            {total}
          </span>
        </span>
        {stepName && (
          <span className="text-[13px] font-semibold text-black/60 dark:text-white/60">
            {stepName}
          </span>
        )}
      </div>

      {/* Dots connected by line */}
      <div className="flex items-center gap-0">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < current
          const isCurrent = stepNum === current
          const isPending = stepNum > current

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Dot */}
              <div
                className={`
                  shrink-0 rounded-full transition-all
                  ${isCurrent ? 'h-4 w-4 bg-[#2563EB]' : ''}
                  ${isCompleted ? 'h-2.5 w-2.5 bg-black/80 dark:bg-white/80' : ''}
                  ${isPending ? 'h-2.5 w-2.5 border-2 border-black/20 dark:border-white/20' : ''}
                `}
              />
              {/* Connecting line */}
              {stepNum < total && (
                <div
                  className={`
                    h-0.5 flex-1 mx-1
                    ${isCompleted ? 'bg-black/40 dark:bg-white/40' : 'bg-black/10 dark:bg-white/10'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
