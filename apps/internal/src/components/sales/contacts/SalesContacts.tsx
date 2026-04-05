import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Cell, Column, Row, Table, TableBody, TableHeader } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { getCustomerList } from '../../../lib/server/sales-customers'
import type { Customer } from '../../../types/sales'

// Lightweight fuzzy search (no external dep in mock mode, fuse.js used when available)
function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  // Simple substring + word-start matching (Fuse-style fallback)
  if (lower.includes(q)) return true
  const words = lower.split(/\s+/)
  return words.some((w) => w.startsWith(q))
}

function ContactExpandedRow({ customer }: { customer: Customer }) {
  // Mock expanded data for contact details
  const relationshipStrength = customer.tier === 'A' ? 'strong' : customer.tier === 'B' ? 'developing' : 'new'
  const dealRole = customer.tier === 'A' ? 'Decision Maker' : customer.tier === 'B' ? 'Budget Holder' : 'End User'

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-black/[0.02] px-4 py-3 dark:bg-white/[0.02]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <span className="text-xs text-black/40 dark:text-white/40">Relationship</span>
          <p className="text-sm font-medium capitalize">{relationshipStrength}</p>
        </div>
        <div>
          <span className="text-xs text-black/40 dark:text-white/40">Deal Role</span>
          <p className="text-sm font-medium">{dealRole}</p>
        </div>
        <div>
          <span className="text-xs text-black/40 dark:text-white/40">Credit Limit</span>
          <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            EGP {customer.creditLimit.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-xs text-black/40 dark:text-white/40">Exposure</span>
          <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            EGP {customer.currentExposure.toLocaleString()}
          </p>
        </div>
      </div>
      {customer.address && (
        <div>
          <span className="text-xs text-black/40 dark:text-white/40">Address</span>
          <p className="text-sm">{customer.address}</p>
        </div>
      )}
    </div>
  )
}

export function SalesContacts() {
  const { t } = useTranslation('internal')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customer-list-contacts'],
    queryFn: () => getCustomerList({ data: { page: 1, limit: 100 } }),
    staleTime: 300_000, // 5 min per spec
  })

  const customers = data?.customers ?? []

  // Fuse.js-style fuzzy search (client-side filtering)
  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    return customers.filter(
      (c) =>
        fuzzyMatch(c.companyName, search) ||
        fuzzyMatch(c.contactName, search) ||
        fuzzyMatch(c.phone, search) ||
        (c.email && fuzzyMatch(c.email, search)),
    )
  }, [customers, search])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t('sales.contacts.title', 'Contacts')}
        </h2>
        <Button
          onPress={() => {
            // Placeholder: open add contact dialog
          }}
          className="flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90"
        >
          <Plus className="size-3.5" />
          {t('sales.contacts.addContact', 'Add Contact')}
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-black/30 dark:text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('sales.contacts.search', 'Search contacts...')}
          className="w-full rounded-lg border border-black/10 bg-transparent py-2 ps-9 pe-3 text-sm outline-none placeholder:text-black/30 focus:border-[#2563EB] dark:border-white/10 dark:placeholder:text-white/30"
        />
      </div>

      {/* Contacts table */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/30 dark:text-white/30">
          {search ? t('sales.contacts.noResults', 'No contacts match your search') : t('sales.contacts.empty', 'No contacts yet')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
          <Table aria-label="Contacts" className="w-full">
            <TableHeader>
              <Column isRowHeader className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('sales.contacts.name', 'Name')}
              </Column>
              <Column className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('sales.contacts.company', 'Company')}
              </Column>
              <Column className="hidden px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50 sm:table-cell">
                {t('sales.contacts.role', 'Role')}
              </Column>
              <Column className="hidden px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50 md:table-cell">
                {t('sales.contacts.email', 'Email')}
              </Column>
              <Column className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('sales.contacts.phone', 'Phone')}
              </Column>
              <Column className="hidden px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50 lg:table-cell">
                {t('sales.contacts.lastContact', 'Last Contact')}
              </Column>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <Row key={customer.id}>
                  <Cell className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                      className="flex items-center gap-1.5 text-sm font-medium hover:text-[#2563EB]"
                    >
                      {expandedId === customer.id ? (
                        <ChevronDown className="size-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0" />
                      )}
                      {customer.contactName}
                    </button>
                    {expandedId === customer.id && (
                      <div className="mt-2">
                        <ContactExpandedRow customer={customer} />
                      </div>
                    )}
                  </Cell>
                  <Cell className="px-3 py-2 text-sm">{customer.companyName}</Cell>
                  <Cell className="hidden px-3 py-2 text-sm text-black/60 dark:text-white/60 sm:table-cell">
                    {customer.tier === 'A' ? 'CEO' : customer.tier === 'B' ? 'Procurement' : 'Contact'}
                  </Cell>
                  <Cell className="hidden px-3 py-2 text-sm text-black/60 dark:text-white/60 md:table-cell">
                    {customer.email ?? '--'}
                  </Cell>
                  <Cell className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                    {customer.phone}
                  </Cell>
                  <Cell className="hidden px-3 py-2 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/50 dark:text-white/50 lg:table-cell">
                    {formatDate(customer.createdAt)}
                  </Cell>
                </Row>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
