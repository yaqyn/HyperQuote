interface StepIndicatorProps {
  current: number
  total: number
  label?: 'task' | 'step' | 'count'
}

/**
 * "Task X of Y" or "Step X of Y" with progress bar.
 * Uses Geist Mono for numbers.
 */
export function StepIndicator({
  current,
  total,
  label = 'step',
}: StepIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0
  const labelText =
    label === 'task' ? 'Task' : label === 'count' ? 'Count' : 'Step'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {labelText}{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-[var(--color-text-primary)]">
            {current}
          </span>{' '}
          of{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-[var(--color-text-primary)]">
            {total}
          </span>
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)]">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
