/**
 * Orders — minimal, inviting, optimized for desktop.
 * Data creates the rhythm. Cairo placeholder for empty states.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  DateInput,
  DateSegment,
  Group,
  Label,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from 'react-aria-components'
import { X } from 'lucide-react'
import { useState } from 'react'
import { today, getLocalTimeZone } from '@internationalized/date'

import { WindowShell } from '../../components/windows/WindowShell'
import { ApprovalBanner } from '../../components/quote-builder/ApprovalBanner'
import { useIsApprover } from '../../hooks/useApproval'
import { getPendingApprovals } from '../../lib/server/approvals'
import { getDrafts } from '../../lib/server/quote-requests'
import {
  getCustomerOrders,
  getCustomerQuotes,
  getCustomerOrderHistory,
  getSavedLists,
  deleteSavedList,
} from '../../lib/server/orders'
import { OrderCard } from '../../components/orders/OrderCard'
import { FilterChips, type QuoteFilterValue } from '../../components/orders/FilterChips'
import { ReorderDialog } from '../../components/orders/ReorderDialog'
import { SavedListCard } from '../../components/orders/SavedListCard'
import type { Order } from '../../types/order'

const CAIRO_PLACEHOLDER = 'https://websiteassets.hyperquote.net/Images/cairo.webp'

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersWindow,
})

function OrdersWindow() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const isApprover = useIsApprover()

  const { data: activeData } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => getCustomerOrders({ data: { page: 1, limit: 20 } }),
    staleTime: 60_000,
  })
  const { data: quotesData } = useQuery({
    queryKey: ['customer-quotes', 'all'],
    queryFn: () => getCustomerQuotes({ data: { page: 1, limit: 20 } }),
    staleTime: 60_000,
  })
  const { data: draftsResult } = useQuery({
    queryKey: ['quote-drafts'],
    queryFn: () => getDrafts(),
    staleTime: 30_000,
  })
  const { data: savedListsData } = useQuery({
    queryKey: ['saved-lists'],
    queryFn: () => getSavedLists({ data: {} }),
    staleTime: 60_000,
  })

  const activeCount = activeData?.orders?.length ?? 0
  const quotesCount = quotesData?.quotes?.length ?? 0
  const draftsCount =
    (draftsResult?.length ?? 0) + (savedListsData?.lists?.length ?? 0)

  return (
    <WindowShell title={t('nav.orders')} maxWidth="800px">
      <div className="flex flex-col py-8 max-md:py-5">
        {/* New Quote button — top right */}
        <div className="flex items-center justify-end mb-8">
          <Button
            onPress={() => navigate({ to: '/orders/new' })}
            className="h-9 px-5 rounded-lg bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            {t('quoteBuilder.newQuoteRequest')}
          </Button>
        </div>

        {isApprover && <PendingApprovalsSection />}

        {/* Tabs */}
        <Tabs className="flex flex-col">
          <TabList className="flex gap-8 border-b border-[var(--color-border)]">
            <StyledTab id="active">
              {t('orders.tabActive')}
              <TabCount count={activeCount} />
            </StyledTab>
            <StyledTab id="quotes">
              {t('orders.tabQuotes')}
              <TabCount count={quotesCount} />
            </StyledTab>
            <StyledTab id="history">{t('orders.tabHistory')}</StyledTab>
            <StyledTab id="drafts">
              {t('orders.tabDrafts')}
              <TabCount count={draftsCount} />
            </StyledTab>
          </TabList>

          <TabPanel id="active" className="pt-6">
            <ActiveTab />
          </TabPanel>
          <TabPanel id="quotes" className="pt-6">
            <QuotesTab />
          </TabPanel>
          <TabPanel id="history" className="pt-6">
            <HistoryTab />
          </TabPanel>
          <TabPanel id="drafts" className="pt-6">
            <DraftsTab />
          </TabPanel>
        </Tabs>
      </div>
    </WindowShell>
  )
}

// ============================================================================
// Tab components
// ============================================================================

function StyledTab({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Tab
      id={id}
      className={({ isSelected }) =>
        [
          'pb-3 text-sm cursor-pointer outline-none transition-colors -mb-px flex items-center',
          isSelected
            ? 'text-[var(--color-text)] border-b-2 border-[var(--color-text)] font-medium'
            : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]',
        ].join(' ')
      }
    >
      {children}
    </Tab>
  )
}

function TabCount({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="font-mono text-[11px] ms-1.5 text-[var(--color-text-subtle)]">
      {count}
    </span>
  )
}

// ============================================================================
// Active Tab
// ============================================================================

function ActiveTab() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => getCustomerOrders({ data: { page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState message={t('orders.errorLoading')} onRetry={refetch} />

  if (!data?.orders?.length) {
    return (
      <EmptyState
        heading={t('orders.emptyActiveTitle')}
        body={t('orders.emptyActiveBody')}
        actionLabel={t('quoteBuilder.newQuoteRequest')}
        onAction={() => navigate({ to: '/orders/new' })}
      />
    )
  }

  return (
    <div className="flex flex-col">
      {data.orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onPress={() => navigate({ to: '/orders/$orderId', params: { orderId: order.id } })}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Quotes Tab
// ============================================================================

function QuotesTab() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const [filter, setFilter] = useState<QuoteFilterValue>('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer-quotes', filter],
    queryFn: () => getCustomerQuotes({ data: { status: filter, page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  return (
    <div>
      <FilterChips selected={filter} onChange={setFilter} />

      {isLoading && <SkeletonRows />}
      {isError && <ErrorState message={t('orders.errorLoading')} onRetry={refetch} />}

      {!isLoading && !isError && !data?.quotes?.length && (
        <EmptyState
          heading={t('orders.emptyQuotesTitle')}
          body={t('orders.emptyQuotesBody')}
          actionLabel={t('quoteBuilder.newQuoteRequest')}
          onAction={() => navigate({ to: '/orders/new' })}
        />
      )}

      {data?.quotes?.map((quote) => (
        <OrderCard
          key={quote.id}
          order={quote}
          onPress={() => navigate({ to: '/orders/$orderId', params: { orderId: quote.id } })}
        />
      ))}
    </div>
  )
}

// ============================================================================
// History Tab
// ============================================================================

function HistoryTab() {
  const { t } = useTranslation('portal')
  const tz = getLocalTimeZone()
  const defaultTo = today(tz)
  const defaultFrom = defaultTo.subtract({ days: 90 })

  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)
  const [reorderTarget, setReorderTarget] = useState<Order | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer-order-history', dateFrom.toString(), dateTo.toString()],
    queryFn: () =>
      getCustomerOrderHistory({
        data: { page: 1, limit: 20, dateFrom: dateFrom.toString(), dateTo: dateTo.toString() },
      }),
    staleTime: 60_000,
  })

  return (
    <div>
      <div className="flex flex-wrap items-end gap-6 mb-8">
        <DatePicker value={dateFrom} onChange={(v) => v && setDateFrom(v)}>
          <Label className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-1.5 block">
            {t('orders.dateFrom')}
          </Label>
          <Group className="flex items-center h-9 border-b border-[var(--color-border)] focus-within:border-[var(--color-primary)] transition-colors">
            <DateInput className="flex font-mono text-sm text-[var(--color-text)]">
              {(segment) => (
                <DateSegment
                  segment={segment}
                  className="px-0.5 outline-none focus:bg-[var(--color-primary)]/10 rounded"
                />
              )}
            </DateInput>
          </Group>
        </DatePicker>

        <DatePicker value={dateTo} onChange={(v) => v && setDateTo(v)}>
          <Label className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-1.5 block">
            {t('orders.dateTo')}
          </Label>
          <Group className="flex items-center h-9 border-b border-[var(--color-border)] focus-within:border-[var(--color-primary)] transition-colors">
            <DateInput className="flex font-mono text-sm text-[var(--color-text)]">
              {(segment) => (
                <DateSegment
                  segment={segment}
                  className="px-0.5 outline-none focus:bg-[var(--color-primary)]/10 rounded"
                />
              )}
            </DateInput>
          </Group>
        </DatePicker>
      </div>

      {isLoading && <SkeletonRows />}
      {isError && <ErrorState message={t('orders.errorLoading')} onRetry={refetch} />}

      {!isLoading && !isError && !data?.orders?.length && (
        <EmptyState heading={t('orders.emptyHistoryTitle')} body={t('orders.emptyHistoryBody')} />
      )}

      {data?.orders?.map((order) => (
        <div key={order.id} className="flex items-center">
          <div className="flex-1">
            <OrderCard order={order} onPress={() => {}} />
          </div>
          {order.status === 'delivered' && (
            <button
              type="button"
              onClick={() => setReorderTarget(order)}
              className="shrink-0 text-[11px] text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors ms-4"
            >
              {t('orders.reorder')}
            </button>
          )}
        </div>
      ))}

      {reorderTarget && (
        <ReorderDialog
          orderId={reorderTarget.id}
          orderRef={reorderTarget.reference}
          itemCount={reorderTarget.itemCount}
          isOpen={!!reorderTarget}
          onOpenChange={(open) => { if (!open) setReorderTarget(null) }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Drafts Tab
// ============================================================================

function DraftsTab() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: drafts, isLoading: draftsLoading } = useQuery({
    queryKey: ['quote-drafts'],
    queryFn: () => getDrafts(),
    staleTime: 30_000,
  })

  const { data: savedListsData, isLoading: listsLoading } = useQuery({
    queryKey: ['saved-lists'],
    queryFn: () => getSavedLists({ data: {} }),
    staleTime: 60_000,
  })

  const [reorderList, setReorderList] = useState<{ id: string; name: string; itemCount: number } | null>(null)

  const deleteListMutation = useMutation({
    mutationFn: (listId: string) => deleteSavedList({ data: { listId } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['saved-lists'] }) },
  })

  const isLoading = draftsLoading || listsLoading
  const hasDrafts = drafts && drafts.length > 0
  const hasSavedLists = savedListsData?.lists && savedListsData.lists.length > 0

  if (isLoading) return <SkeletonRows />

  if (!hasDrafts && !hasSavedLists) {
    return <EmptyState heading={t('orders.emptyDraftsTitle')} body={t('orders.emptyDraftsBody')} />
  }

  return (
    <div className="flex flex-col gap-10">
      {hasDrafts && (
        <div className="flex flex-col">
          {drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              onResume={() => navigate({ to: '/orders/new', search: { draft: draft.id } })}
              onDeleted={() => queryClient.invalidateQueries({ queryKey: ['quote-drafts'] })}
            />
          ))}
        </div>
      )}

      {hasSavedLists && (
        <div className="flex flex-col gap-4">
          <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
            {t('orders.savedLists')}
          </span>
          {savedListsData.lists.map((list) => (
            <SavedListCard
              key={list.id}
              list={list}
              onReorder={() => setReorderList({ id: list.id, name: list.name, itemCount: list.items.length })}
              onEdit={() => {}}
              onDelete={() => deleteListMutation.mutate(list.id)}
            />
          ))}
        </div>
      )}

      {reorderList && (
        <ReorderDialog
          orderId={reorderList.id}
          orderRef={reorderList.name}
          itemCount={reorderList.itemCount}
          isOpen={!!reorderList}
          onOpenChange={(open) => { if (!open) setReorderList(null) }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Pending Approvals
// ============================================================================

function PendingApprovalsSection() {
  const { data: approvals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => getPendingApprovals(),
    staleTime: 60_000,
  })

  if (!approvals || approvals.length === 0) return null

  return (
    <div className="flex flex-col gap-3 mb-8">
      <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
        Pending Approvals
      </span>
      {approvals.map((approval) => (
        <ApprovalBanner key={approval.approvalId} approval={approval} />
      ))}
    </div>
  )
}

// ============================================================================
// Draft Row
// ============================================================================

interface DraftData {
  id: string
  requestNumber: string
  notes: string | null
  updatedAt: string
  itemCount: number
}

function DraftRow({ draft, onResume, onDeleted }: { draft: DraftData; onResume: () => void; onDeleted: () => void }) {
  const { t } = useTranslation('portal')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => ({ success: true }),
    onSuccess: onDeleted,
  })

  const formattedDate = new Date(draft.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--color-border)]">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm text-[var(--color-text)]">
          {draft.requestNumber || draft.notes || 'Draft'}
        </span>
        <span className="text-xs text-[var(--color-text-subtle)]">
          <span className="font-mono">{draft.itemCount}</span> items · <span className="font-mono">{formattedDate}</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" onClick={onResume} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          {t('orders.continue')}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { deleteMutation.mutate(); setConfirmDelete(false) }} className="text-[11px] text-[var(--color-error)]">
              {t('orders.confirmDelete')}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-[11px] text-[var(--color-text-subtle)]">
              {t('orders.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[var(--color-text-subtle)]/40 hover:text-[var(--color-text-muted)] transition-colors"
            aria-label={`Delete draft ${draft.requestNumber}`}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function SkeletonRows() {
  return (
    <div className="flex flex-col">
      {[1, 2, 3].map((i) => (
        <div key={i} className="py-5 border-b border-[var(--color-border)] animate-pulse">
          <div className="h-3.5 w-28 bg-[var(--color-surface)] rounded-sm mb-2.5" />
          <div className="h-3 w-44 bg-[var(--color-surface)] rounded-sm mb-2" />
          <div className="h-2.5 w-32 bg-[var(--color-surface)] rounded-sm" />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation('portal')
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      <button type="button" onClick={() => onRetry()} className="text-sm text-[var(--color-text)] mt-2 underline underline-offset-2">
        {t('orders.retry')}
      </button>
    </div>
  )
}

// ============================================================================
// Empty State — inviting, with Cairo skyline
// ============================================================================

function EmptyState({
  heading,
  body,
  actionLabel,
  onAction,
}: {
  heading: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center py-20">
      {/* Cairo skyline — soft, atmospheric, part of the surface */}
      <div className="w-full max-w-[320px] h-[120px] rounded-xl overflow-hidden mb-8 opacity-40">
        <img
          src={CAIRO_PLACEHOLDER}
          alt=""
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      </div>

      <p className="text-sm font-normal text-[var(--color-text)]">{heading}</p>
      <p className="text-sm text-[var(--color-text-subtle)] mt-1">{body}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 h-9 px-5 rounded-lg bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-xs font-medium transition-opacity hover:opacity-80"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
