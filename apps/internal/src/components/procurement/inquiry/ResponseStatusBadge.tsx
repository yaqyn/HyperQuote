import { useTranslation } from 'react-i18next'
import type { InquiryStatus } from '../../../types/procurement'

interface ResponseStatusBadgeProps {
  status: InquiryStatus
}

const STATUS_STYLES: Record<InquiryStatus, string> = {
  sent: 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60',
  opened: 'bg-[#2563EB]/10 text-[#2563EB]',
  responded: 'bg-green-500/10 text-green-600 dark:text-green-400',
  overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
  closed: 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40',
}

export function ResponseStatusBadge({ status }: ResponseStatusBadgeProps) {
  const { t } = useTranslation('internal')

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {t(`procurement.status.${status}`)}
    </span>
  )
}
