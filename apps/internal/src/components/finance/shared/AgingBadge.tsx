import type { ARAgingBucket } from '../../../types/finance'
import { getAgingSeverity } from '../../../lib/finance/aging'

interface AgingBadgeProps {
  bucket: ARAgingBucket
}

const SEVERITY_COLORS: Record<ReturnType<typeof getAgingSeverity>, string> = {
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  orange: 'text-orange-600 dark:text-orange-400',
  red: 'text-red-600 dark:text-red-400',
  dark_red: 'text-red-700 dark:text-red-300 font-bold',
}

const BUCKET_LABELS: Record<ARAgingBucket, string> = {
  current: 'Current',
  '1-30': '1-30',
  '31-60': '31-60',
  '61-90': '61-90',
  '90+': '90+',
}

/**
 * Colored text label for AR/AP aging buckets.
 * No background pill — text color only as data indicator.
 */
export function AgingBadge({ bucket }: AgingBadgeProps) {
  const severity = getAgingSeverity(bucket)

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-medium ${SEVERITY_COLORS[severity]}`}
    >
      {BUCKET_LABELS[bucket]}
    </span>
  )
}
