import type { OrderLineItem } from '../../../types/operations'

interface OrderProgressBarProps {
  items: OrderLineItem[]
}

const LIFECYCLE_STEPS = ['Confirmed', 'Picking', 'Staging', 'Dispatched', 'Delivered']

/**
 * Horizontal dot chain showing order lifecycle.
 * Current step blue, completed filled, pending outline.
 * Derives current step from line item fulfillment percentage.
 */
export function OrderProgressBar({ items }: OrderProgressBarProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const fulfilledQuantity = items.reduce((sum, item) => sum + item.fulfilledQuantity, 0)
  const percentage = totalQuantity > 0 ? Math.round((fulfilledQuantity / totalQuantity) * 100) : 0

  // Map percentage to lifecycle step index
  const currentStep = percentage >= 100 ? 4
    : percentage >= 75 ? 3
    : percentage >= 50 ? 2
    : percentage >= 25 ? 1
    : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Percentage + label */}
      <div className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold">
          {percentage}%
        </span>
        <span className="text-[11px] text-black/35 dark:text-white/35">
          <span className="font-[family-name:var(--font-geist-mono)]">{fulfilledQuantity}</span>
          {' of '}
          <span className="font-[family-name:var(--font-geist-mono)]">{totalQuantity}</span>
          {' items fulfilled'}
        </span>
      </div>

      {/* Dot chain */}
      <div className="flex items-center">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep
          const isPending = idx > currentStep

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                {/* Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    isCompleted
                      ? 'bg-[#2563EB]'
                      : isCurrent
                        ? 'bg-[#2563EB] ring-4 ring-[#2563EB]/10'
                        : 'border-[1.5px] border-black/15 dark:border-white/15'
                  }`}
                />
                {/* Label */}
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    isCurrent
                      ? 'text-[#2563EB]'
                      : isCompleted
                        ? 'text-black/50 dark:text-white/50'
                        : 'text-black/25 dark:text-white/25'
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connecting line */}
              {idx < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-2 ${
                    isCompleted
                      ? 'bg-[#2563EB]'
                      : 'bg-black/8 dark:bg-white/8'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
