import type { ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'

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
 * Sequential gate component — must complete current step before next unlocks.
 * Active: full content + Next button.
 * Completed: checkmark + collapsed title.
 * Locked: lock icon, muted. Visual lock on future steps, checkmark on completed.
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
      className={`rounded-xl border transition-all ${
        isActive
          ? 'border-[#2563EB] bg-white'
          : isCompleted
            ? 'border-green-200 bg-white'
            : 'border-[var(--color-border)] bg-white opacity-50'
      }`}
    >
      {/* ─── Header — tablet: larger touch target ─────────── */}
      <div className="flex items-center gap-4 p-5 min-h-[64px]">
        {/* Step icon */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
            isCompleted
              ? 'text-green-600'
              : isActive
                ? 'bg-[#2563EB] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
          }`}
          style={isCompleted ? { background: 'rgba(22, 163, 74, 0.08)' } : undefined}
        >
          {isCompleted ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : !isActive ? (
            /* Lock icon */
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="1" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 6H11V12C11 12.5523 10.5523 13 10 13H4C3.44772 13 3 12.5523 3 12V6Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : (
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-bold">
              {stepNumber}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`text-[15px] font-bold ${
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
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] truncate">
              {description}
            </p>
          )}
        </div>

        {/* Step counter (compact) */}
        {isActive && (
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)]">
            {stepNumber}/{totalSteps}
          </span>
        )}
      </div>

      {/* ─── Active Step Content ─────────────────────────── */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={`step-${stepNumber}-content`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border)] px-5 pb-5 pt-5">
              <div>{children}</div>

              <Button
                onPress={onAdvance}
                isDisabled={!canAdvance}
                className={`mt-5 h-16 min-h-[48px] w-full rounded-xl text-[16px] font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  canAdvance
                    ? 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]'
                    : 'border-2 border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
                }`}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
