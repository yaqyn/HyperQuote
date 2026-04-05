import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
  Button,
} from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import type { CustomerContact } from '../../../types/sales'

interface ContactsTabProps {
  customerId: string
  enabled: boolean
}

const DEAL_ROLE_STYLES: Record<string, string> = {
  decision_maker: 'bg-[#2563EB]/10 text-[#2563EB]',
  budget_holder: 'bg-[#22c55e]/10 text-[#22c55e]',
  influencer: 'bg-[#eab308]/10 text-[#eab308]',
  end_user: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
  gatekeeper: 'bg-[#ef4444]/10 text-[#ef4444]',
}

export function ContactsTab({ customerId, enabled }: ContactsTabProps) {
  const { t } = useTranslation('internal')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'contacts', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.contacts,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
        {t('sales.customer360.contacts.noContacts')}
      </div>
    )
  }

  // Build org tree from reportsTo
  const roots = data.filter((c) => !c.reportsTo)
  const children = (parentId: string) => data.filter((c) => c.reportsTo === parentId)

  return (
    <div className="p-4 space-y-6">
      {/* Contacts Table */}
      <Table
        aria-label={t('sales.customer360.contacts.title')}
        className="w-full"
        selectionMode="none"
      >
        <TableHeader>
          <Column isRowHeader className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.contacts.name')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.contacts.role')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.contacts.email')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.contacts.phone')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.contacts.lastContact')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2">
            {t('sales.customer360.contacts.preference')}
          </Column>
        </TableHeader>
        <TableBody>
          {data.map((contact) => (
            <Row
              key={contact.id}
              className="border-t border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/3 dark:hover:bg-white/3"
              onAction={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
            >
              <Cell className="py-2.5 pe-4 text-sm font-medium text-black dark:text-white">
                {contact.name}
              </Cell>
              <Cell className="py-2.5 pe-4 text-sm text-black/60 dark:text-white/60">
                {contact.role}
              </Cell>
              <Cell className="py-2.5 pe-4 text-sm text-black/60 dark:text-white/60">
                {contact.email ?? '—'}
              </Cell>
              <Cell className="py-2.5 pe-4 text-sm font-[family-name:var(--font-geist-mono)] text-black/60 dark:text-white/60">
                {contact.phone}
              </Cell>
              <Cell className="py-2.5 pe-4 text-sm font-[family-name:var(--font-geist-mono)] text-black/50 dark:text-white/50">
                {contact.lastContactDate
                  ? new Date(contact.lastContactDate).toLocaleDateString()
                  : '—'}
              </Cell>
              <Cell className="py-2.5 text-sm text-black/50 dark:text-white/50">
                {contact.commPreference}
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>

      {/* Expanded Contact Details */}
      {expandedId && <ContactDetails contact={data.find((c) => c.id === expandedId)!} />}

      {/* Org Chart */}
      {roots.length > 0 && (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
          <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
            {t('sales.customer360.contacts.orgChart')}
          </h3>
          <div className="space-y-2">
            {roots.map((root) => (
              <OrgNode key={root.id} contact={root} getChildren={children} depth={0} />
            ))}
          </div>
        </div>
      )}

      {/* Add Contact Button */}
      <Button
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#2563EB] border border-[#2563EB]/30 rounded-lg hover:bg-[#2563EB]/5 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
        onPress={() => {
          // TODO: Open add contact dialog
        }}
      >
        + {t('sales.customer360.contacts.addContact')}
      </Button>
    </div>
  )
}

function ContactDetails({ contact }: { contact: CustomerContact }) {
  const { t } = useTranslation('internal')
  const roleStyle = DEAL_ROLE_STYLES[contact.dealRole] ?? DEAL_ROLE_STYLES.end_user

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-semibold text-black dark:text-white">{contact.name}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleStyle}`}>
          {t(`sales.customer360.contacts.dealRoles.${contact.dealRole}`)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-black/40 dark:text-white/40 mb-0.5">
            {t('sales.customer360.contacts.relationshipStrength')}
          </p>
          <p className="text-black/70 dark:text-white/70 capitalize">
            {contact.relationshipStrength}
          </p>
        </div>
        <div>
          <p className="text-xs text-black/40 dark:text-white/40 mb-0.5">
            {t('sales.customer360.contacts.dealRole')}
          </p>
          <p className="text-black/70 dark:text-white/70 capitalize">
            {contact.dealRole.replace(/_/g, ' ')}
          </p>
        </div>
        <div>
          <p className="text-xs text-black/40 dark:text-white/40 mb-0.5">
            {t('sales.customer360.contacts.preference')}
          </p>
          <p className="text-black/70 dark:text-white/70 capitalize">
            {contact.commPreference}
          </p>
        </div>
      </div>
    </div>
  )
}

function OrgNode({
  contact,
  getChildren,
  depth,
}: {
  contact: CustomerContact
  getChildren: (id: string) => CustomerContact[]
  depth: number
}) {
  const kids = getChildren(contact.id)

  return (
    <div style={{ marginInlineStart: depth * 24 }}>
      <div className="flex items-center gap-2 py-1">
        {depth > 0 && (
          <span className="text-black/20 dark:text-white/20 text-xs">└</span>
        )}
        <span className="text-sm font-medium text-black dark:text-white">
          {contact.name}
        </span>
        <span className="text-xs text-black/40 dark:text-white/40">
          {contact.role}
        </span>
      </div>
      {kids.map((child) => (
        <OrgNode key={child.id} contact={child} getChildren={getChildren} depth={depth + 1} />
      ))}
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-black/5 dark:bg-white/5" />
      ))}
    </div>
  )
}
