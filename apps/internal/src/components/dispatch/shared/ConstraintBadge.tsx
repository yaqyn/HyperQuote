import type { ConstraintViolation } from '../../../types/dispatch'

const CONSTRAINT_ICONS: Record<string, string> = {
  cairo_ban: '\u{1F6AB}',     // prohibited
  prayer_time: '\u{1F54C}',   // mosque
  jumuah: '\u{1F54C}',        // mosque
  khamsin: '\u{1F32C}',       // wind
  equipment: '\u{1F527}',     // wrench
  cdl: '\u{1F4CB}',           // clipboard
  capacity: '\u{2696}',       // scales
}

/**
 * Small badge showing a constraint violation.
 * Red for errors, amber for warnings.
 * Icon + short message.
 */
export function ConstraintBadge({
  violation,
}: {
  violation: ConstraintViolation
}) {
  const isError = violation.severity === 'error'

  const bgColor = isError
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'

  const textColor = isError
    ? 'text-red-700 dark:text-red-400'
    : 'text-amber-700 dark:text-amber-400'

  const icon = CONSTRAINT_ICONS[violation.type] ?? '\u{26A0}'

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${bgColor}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className={textColor}>{violation.message}</span>
    </div>
  )
}
