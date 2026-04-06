import type { ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { StepIndicator } from '../shared/StepIndicator'

interface GatedStepProps {
  stepNumber: number
  totalSteps: number
  title: string
  description?: string
  canAdvance: boolean
  isActive: boolean
  isCompleted: boolean
  children: ReactNode
  onAdvance: () => void
}

/**
 * Reusable gated step component for multi-step warehouse workflows.
 * Active: renders children + Next button (disabled when !canAdvance).
 * Completed: green checkmark + collapsed summary.
 * Inactive: grayed out, locked icon.
 */
export function GatedStep({
  stepNumber,
  totalSteps,
  title,
  description,
  canAdvance,
  isActive,
  isCompleted,
  children,
  onAdvance,
}: GatedStepProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? 'border-[#2563EB] bg-white'
          : isCompleted
            ? 'border-green-200 bg-green-50/50'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Step icon */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
            isCompleted
              ? 'bg-green-100 text-green-700'
              : isActive
                ? 'bg-[#2563EB] text-white'
                : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
          }`}
        >
          {isCompleted ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8.5L6.5 12L13 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : !isActive ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="1" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 6H11V12C11 12.5523 10.5523 13 10 13H4C3.44772 13 3 12.5523 3 12V6Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : (
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {stepNumber}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3
            className={`text-sm font-semibold ${
              isActive
                ? 'text-[var(--color-text-primary)]'
                : isCompleted
                  ? 'text-green-700'
                  : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {title}
          </h3>
          {description && !isActive && (
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Active step content */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={`step-${stepNumber}-content`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="mt-4"
          >
            <StepIndicator current={stepNumber} total={totalSteps} />

            <div className="mt-4">{children}</div>

            <Button
              onPress={onAdvance}
              isDisabled={!canAdvance}
              className={`mt-4 h-12 min-h-[48px] w-full rounded-lg px-6 text-sm font-medium transition-colors cursor-pointer ${
                canAdvance
                  ? 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
              }`}
            >
              Next
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
