import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TextField, Input, Label } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface CommunicationsTabProps {
  customerId: string
  enabled: boolean
}

const TYPE_ICONS: Record<string, string> = {
  call: '\u{1F4DE}',
  email: '\u{2709}\u{FE0F}',
  meeting: '\u{1F91D}',
  whatsapp: '\u{1F4AC}',
}

export function CommunicationsTab({ customerId, enabled }: CommunicationsTabProps) {
  const { t } = useTranslation('internal')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'communications', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.communications,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
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
    <div className="p-4 space-y-4">
      {/* Search */}
      <TextField
        value={search}
        onChange={setSearch}
        aria-label={t('sales.customer360.communications.search')}
      >
        <Label className="sr-only">{t('sales.customer360.communications.search')}</Label>
        <Input
          placeholder={t('sales.customer360.communications.searchPlaceholder')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
        />
      </TextField>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.map((comm) => (
          <div
            key={comm.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/30"
          >
            <span className="text-sm w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 shrink-0">
              {TYPE_ICONS[comm.type] ?? '\u{1F4CB}'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-black/50 dark:text-white/50 capitalize">
                  {comm.type}
                </span>
                <span className="text-xs font-[family-name:var(--font-geist-mono)] text-black/40 dark:text-white/40">
                  {new Date(comm.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-black/80 dark:text-white/80">
                {comm.summary}
              </p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                {comm.contactName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-black/5 dark:bg-white/5" />
      ))}
    </div>
  )
}
