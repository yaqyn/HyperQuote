import type { ARAgingBucket } from '../../../types/finance'
import { getAgingSeverity } from '../../../lib/finance/aging'

interface AgingBadgeProps {
  bucket: ARAgingBucket
}

const SEVERITY_STYLES: Record<ReturnType<typeof getAgingSeverity>, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  dark_red: 'bg-red-200 text-red-900 font-bold dark:bg-red-900/50 dark:text-red-300',
}

const BUCKET_LABELS: Record<ARAgingBucket, string> = {
  current: 'Current',
  '1-30': '1-30',
  '31-60': '31-60',
  '61-90': '61-90',
  '90+': '90+',
}

/**
 * Color-coded badge for AR/AP aging buckets.
 * Maps bucket to severity color per finance spec.
 */
export function AgingBadge({ bucket }: AgingBadgeProps) {
  const severity = getAgingSeverity(bucket)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-[family-name:var(--font-geist-mono)] tabular-nums ${SEVERITY_STYLES[severity]}`}
    >
      {BUCKET_LABELS[bucket]}
    </span>
  )
}
