import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TextField, Input, Label } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface CommunicationsTabProps {
  customerId: string
  enabled: boolean
}

const TYPE_LABELS: Record<string, string> = {
  call: 'C',
  email: 'E',
  meeting: 'M',
  whatsapp: 'W',
}

export function CommunicationsTab({ customerId, enabled }: CommunicationsTabProps) {
  const { t } = useTranslation('internal')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'communications', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.communications,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
        {t('sales.customer360.communications.noCommunications')}
      </div>
    )
  }

  const filtered = search
    ? data.filter(
        (c) =>
          c.summary.toLowerCase().includes(search.toLowerCase()) ||
          c.contactName.toLowerCase().includes(search.toLowerCase()),
      )
    : data

  return (
    <div className="p-6 space-y-4">
      {/* Search */}
      <TextField
        value={search}
        onChange={setSearch}
        aria-label={t('sales.customer360.communications.search')}
      >
        <Label className="sr-only">{t('sales.customer360.communications.search')}</Label>
        <Input
          placeholder={t('sales.customer360.communications.searchPlaceholder')}
          className="w-full px-3 py-2 text-[13px] rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border-none text-[var(--color-text)] dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
        />
      </TextField>

      {/* Chat-log style entries */}
      <div className="space-y-2">
        {filtered.map((comm) => (
          <div
            key={comm.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors"
          >
            {/* Type icon — letter in circle */}
            <div className="w-7 h-7 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-black/40 dark:text-white/40">
                {TYPE_LABELS[comm.type] ?? 'N'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Summary */}
              <p className="text-[13px] text-[var(--color-text)] dark:text-white/80 leading-snug">
                {comm.summary}
              </p>

              {/* Contact + date */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-black/30 dark:text-white/30">
                  {comm.contactName}
                </span>
                <span className="text-[11px] text-black/15 dark:text-white/15">&middot;</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/25 dark:text-white/25">
                  {new Date(comm.date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Type label */}
            <span className="text-[10px] font-medium uppercase tracking-wider text-black/20 dark:text-white/20 shrink-0">
              {comm.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-6 space-y-2 animate-pulse">
      <div className="h-9 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
      ))}
    </div>
  )
}
