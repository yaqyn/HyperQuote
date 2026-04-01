/**
 * Step indicator for 3-step quote builder flow.
 * Shows active/completed/upcoming states with connecting lines.
 * Mobile: numbers only, no labels.
 */
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { key: 'quoteBuilder.step1', number: 1 },
  { key: 'quoteBuilder.step2', number: 2 },
  { key: 'quoteBuilder.step3', number: 3 },
] as const

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useTranslation('portal')

  return (
    <nav
      role="navigation"
      aria-label={t('quoteBuilder.stepsLabel')}
      className="flex items-center justify-center gap-0 py-4 px-6"
    >
      {STEPS.map((step, index) => {
        const isCompleted = step.number < currentStep
        const isActive = step.number === currentStep
        const isUpcoming = step.number > currentStep

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle + label */}
            <div
              className="flex flex-col items-center gap-1"
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Circle */}
              <div
                className={[
                  'flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-colors',
                  isCompleted
                    ? 'bg-[var(--color-success)]'
                    : isActive
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-[var(--color-border)]',
                ].join(' ')}
              >
                {isCompleted ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <span
                    className={[
                      'font-mono text-xs leading-none',
                      isActive
                        ? 'text-white'
                        : 'text-[var(--color-text-muted)]',
                    ].join(' ')}
                  >
                    {step.number}
                  </span>
                )}
              </div>

              {/* Label -- hidden on mobile */}
              <span
                className={[
                  'text-xs hidden sm:block transition-colors',
                  isActive
                    ? 'text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {t(step.key)}
              </span>
            </div>

            {/* Connecting line */}
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'h-0.5 w-12 sm:w-20 mx-2 sm:mx-3 transition-colors',
                  step.number < currentStep
                    ? 'bg-[var(--color-primary)]'
                    : 'bg-[var(--color-border)]',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
