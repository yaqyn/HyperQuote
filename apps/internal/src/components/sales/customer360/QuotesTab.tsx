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
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
} from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface QuotesTabProps {
  customerId: string
  enabled: boolean
}

type StatusFilter = 'all' | 'won' | 'lost' | 'pending' | 'draft' | 'sent'

export function QuotesTab({ customerId, enabled }: QuotesTabProps) {
  const { t } = useTranslation('internal')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'quotes', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.quotes,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
        {t('sales.customer360.quotes.noQuotes')}
      </div>
    )
  }

  const filtered = statusFilter === 'all'
    ? data
    : data.filter((q) => {
        if (statusFilter === 'won') return q.outcome === 'won'
        if (statusFilter === 'lost') return q.outcome === 'lost'
        if (statusFilter === 'pending') return q.outcome === 'pending'
        return q.status === statusFilter
      })

  const wonCount = data.filter((q) => q.outcome === 'won').length
  const lostCount = data.filter((q) => q.outcome === 'lost').length
  const winRate = data.length > 0 ? Math.round((wonCount / data.length) * 100) : 0

  return (
    <div className="p-4 space-y-4">
      {/* Win/Loss Summary */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.customer360.quotes.winRate')}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-black dark:text-white">
            {winRate}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.customer360.quotes.won')}: {wonCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.customer360.quotes.lost')}: {lostCount}
          </span>
        </div>

        <div className="ms-auto">
          <Select
            selectedKey={statusFilter}
            onSelectionChange={(key) => setStatusFilter(key as StatusFilter)}
            aria-label={t('sales.customer360.quotes.filterStatus')}
          >
            <Label className="sr-only">{t('sales.customer360.quotes.filterStatus')}</Label>
            <Button className="flex items-center gap-2 px-3 py-1.5 text-xs border border-black/10 dark:border-white/10 rounded-lg text-black/60 dark:text-white/60 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50">
              <SelectValue />
            </Button>
            <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg p-1">
              <ListBox className="outline-none">
                <ListBoxItem id="all" className="px-3 py-1.5 text-xs rounded cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[focused]:text-[#2563EB]">
                  {t('sales.customer360.quotes.all')}
                </ListBoxItem>
                <ListBoxItem id="won" className="px-3 py-1.5 text-xs rounded cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[focused]:text-[#2563EB]">
                  {t('sales.customer360.quotes.won')}
                </ListBoxItem>
                <ListBoxItem id="lost" className="px-3 py-1.5 text-xs rounded cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[focused]:text-[#2563EB]">
                  {t('sales.customer360.quotes.lost')}
                </ListBoxItem>
                <ListBoxItem id="pending" className="px-3 py-1.5 text-xs rounded cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[focused]:text-[#2563EB]">
                  {t('sales.customer360.quotes.pending')}
                </ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </div>
      </div>

      {/* Quotes Table */}
      <Table
        aria-label={t('sales.customer360.quotes.title')}
        className="w-full"
        selectionMode="none"
      >
        <TableHeader>
          <Column isRowHeader className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.quotes.quoteNumber')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.quotes.date')}
          </Column>
          <Column className="text-end text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.quotes.value')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.quotes.status')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2">
            {t('sales.customer360.quotes.outcome')}
          </Column>
        </TableHeader>
        <TableBody>
          {filtered.map((quote) => (
            <Row
              key={quote.id}
              className="border-t border-black/5 dark:border-white/5 hover:bg-black/3 dark:hover:bg-white/3"
            >
              <Cell className="py-2.5 pe-4 text-sm font-[family-name:var(--font-geist-mono)] font-medium text-[#2563EB]">
                {quote.quoteNumber}
              </Cell>
              <Cell className="py-2.5 pe-4 text-sm font-[family-name:var(--font-geist-mono)] text-black/60 dark:text-white/60">
                {new Date(quote.createdAt).toLocaleDateString()}
              </Cell>
              <Cell className="py-2.5 pe-4 text-end text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
                {formatCurrency(quote.total)}
              </Cell>
              <Cell className="py-2.5 pe-4">
                <StatusPill status={quote.status} />
              </Cell>
              <Cell className="py-2.5">
                <OutcomeBadge outcome={quote.outcome} />
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 capitalize">
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome || outcome === 'pending') {
    return (
      <span className="text-xs text-black/40 dark:text-white/40">—</span>
    )
  }

  const isWon = outcome === 'won'
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
        isWon
          ? 'bg-[#22c55e]/10 text-[#22c55e]'
          : 'bg-[#ef4444]/10 text-[#ef4444]'
      }`}
    >
      {outcome.toUpperCase()}
    </span>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
