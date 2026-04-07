/**
 * Tiny pill — constraint type + value.
 * Red for errors, amber for warnings. No emojis — dots only.
 */
import type { ConstraintViolation } from '../../../types/dispatch'

export function ConstraintBadge({
  violation,
}: {
  violation: ConstraintViolation
}) {
  const isError = violation.severity === 'error'

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] ${
        isError
          ? 'border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-900/20'
          : 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20'
      }`}
    >
      <span
        className={`h-1 w-1 rounded-full ${isError ? 'bg-red-500' : 'bg-amber-500'}`}
      />
      <span
        className={
          isError
            ? 'text-red-700 dark:text-red-400'
            : 'text-amber-700 dark:text-amber-400'
        }
      >
        {violation.message}
      </span>
    </div>
  )
}
