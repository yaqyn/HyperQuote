import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import type { CustomerContact } from '../../../types/sales'

interface ContactsTabProps {
  customerId: string
  enabled: boolean
}

export function ContactsTab({ customerId, enabled }: ContactsTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'contacts', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.contacts,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
        {t('sales.customer360.contacts.noContacts')}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Mini profile cards — 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {data.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>

      {/* Add Contact */}
      <Button
        className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#2563EB] outline-none
          data-[hovered]:bg-[#2563EB]/[0.04] rounded-lg transition-colors
          data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
        onPress={() => {
          // TODO: Open add contact dialog
        }}
      >
        + {t('sales.customer360.contacts.addContact')}
      </Button>
    </div>
  )
}

function ContactCard({ contact }: { contact: CustomerContact }) {
  const initials = contact.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] group">
      {/* Initials circle */}
      <div className="w-9 h-9 rounded-full bg-[#2563EB]/[0.08] flex items-center justify-center shrink-0">
        <span className="text-[12px] font-semibold text-[#2563EB]">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + role */}
        <p className="text-[13px] font-semibold text-[var(--color-text)] dark:text-white leading-tight">
          {contact.name}
        </p>
        <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">
          {contact.role}
        </p>

        {/* Phone + email */}
        <div className="mt-2 space-y-0.5">
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/45 dark:text-white/45">
            {contact.phone}
          </p>
          {contact.email && (
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/45 dark:text-white/45 truncate">
              {contact.email}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-6 grid grid-cols-2 gap-1 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
      ))}
    </div>
  )
}
