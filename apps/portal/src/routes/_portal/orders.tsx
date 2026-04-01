/**
 * Orders window with 4 tabs: Active, Quotes, History, Drafts.
 * Each tab loads data independently via TanStack Query.
 * Approvers see pending approval cards above tabs.
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
import { AlertTriangle, Package, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'

import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
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

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersWindow,
})

function OrdersWindow() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const isApprover = useIsApprover()

  // Queries for tab count badges
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
    <>
      <WindowShell title={t('nav.orders')}>
        <div className="flex flex-col gap-4 p-6">
          {/* New Quote Request button */}
          <Button
            onPress={() => navigate({ to: '/orders/new' })}
            className="flex items-center justify-center h-11 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold px-6 cursor-pointer hover:opacity-90 transition-opacity self-start"
          >
            {t('quoteBuilder.newQuoteRequest')}
          </Button>

          {/* Pending Approvals section (approver only) */}
          {isApprover && <PendingApprovalsSection />}

          {/* Tabs */}
          <Tabs className="flex flex-col gap-4">
            <TabList className="flex gap-1 border-b border-[var(--color-border)]">
              <StyledTab id="active">
                {t('orders.tabActive')}{' '}
                {activeCount > 0 && (
                  <span className="font-mono text-xs">({activeCount})</span>
                )}
              </StyledTab>
              <StyledTab id="quotes">
                {t('orders.tabQuotes')}{' '}
                {quotesCount > 0 && (
                  <span className="font-mono text-xs">({quotesCount})</span>
                )}
              </StyledTab>
              <StyledTab id="history">{t('orders.tabHistory')}</StyledTab>
              <StyledTab id="drafts">
                {t('orders.tabDrafts')}{' '}
                {draftsCount > 0 && (
                  <span className="font-mono text-xs">({draftsCount})</span>
                )}
              </StyledTab>
            </TabList>

            <TabPanel id="active">
              <ActiveTab />
            </TabPanel>

            <TabPanel id="quotes">
              <QuotesTab />
            </TabPanel>

            <TabPanel id="history">
              <HistoryTab />
            </TabPanel>

            <TabPanel id="drafts">
              <DraftsTab />
            </TabPanel>
          </Tabs>
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}

// ============================================================================
// Styled Tab
// ============================================================================

function StyledTab({
  id,
  children,
}: { id: string; children: React.ReactNode }) {
  return (
    <Tab
      id={id}
      className={({ isSelected }) =>
        [
          'px-4 py-2 text-sm cursor-pointer outline-none transition-colors -mb-px',
          isSelected
            ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-semibold'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        ].join(' ')
      }
    >
      {children}
    </Tab>
  )
}

// ============================================================================
// Active Tab
// ============================================================================

function ActiveTab() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => getCustomerOrders({ data: { page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  if (isLoading) return <SkeletonCards />

  if (isError) {
    return <ErrorState message={t('orders.errorLoading')} onRetry={refetch} />
  }

  if (!data?.orders?.length) {
    return (
      <TabEmptyState
        icon={<Package size={48} className="text-[var(--color-text-subtle)]" />}
        title={t('orders.emptyActiveTitle')}
        body={t('orders.emptyActiveBody')}
        action={
          <Button
            onPress={() => navigate({ to: '/orders/new' })}
            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            {t('quoteBuilder.newQuoteRequest')}
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col">
      {data.orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onPress={() =>
            navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
          }
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
    queryFn: () =>
      getCustomerQuotes({
        data: { status: filter, page: 1, limit: 20 },
      }),
    staleTime: 60_000,
  })

  return (
    <div>
      <FilterChips selected={filter} onChange={setFilter} />

      {isLoading && <SkeletonCards />}

      {isError && (
        <ErrorState message={t('orders.errorLoading')} onRetry={refetch} />
      )}

      {!isLoading && !isError && !data?.quotes?.length && (
        <TabEmptyState
          title={t('orders.emptyQuotesTitle')}
          body={t('orders.emptyQuotesBody')}
          action={
            <Button
              onPress={() => navigate({ to: '/orders/new' })}
              className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
            >
              {t('quoteBuilder.newQuoteRequest')}
            </Button>
          }
        />
      )}

      {data?.quotes?.map((quote) => (
        <OrderCard
          key={quote.id}
          order={quote}
          onPress={() =>
            navigate({
              to: '/orders/$orderId',
              params: { orderId: quote.id },
            })
          }
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
        data: {
          page: 1,
          limit: 20,
          dateFrom: dateFrom.toString(),
          dateTo: dateTo.toString(),
        },
      }),
    staleTime: 60_000,
  })

  return (
    <div>
      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <DatePicker value={dateFrom} onChange={(v) => v && setDateFrom(v)}>
          <Label className="text-xs text-[var(--color-text-muted)] mb-1 block">
            {t('orders.dateFrom')}
          </Label>
          <Group className="flex items-center h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
            <DateInput className="flex font-mono text-sm">
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
          <Label className="text-xs text-[var(--color-text-muted)] mb-1 block">
            {t('orders.dateTo')}
          </Label>
          <Group className="flex items-center h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
            <DateInput className="flex font-mono text-sm">
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

      {isLoading && <SkeletonCards />}

      {isError && (
        <ErrorState message={t('orders.errorLoading')} onRetry={refetch} />
      )}

      {!isLoading && !isError && !data?.orders?.length && (
        <TabEmptyState
          title={t('orders.emptyHistoryTitle')}
          body={t('orders.emptyHistoryBody')}
        />
      )}

      {data?.orders?.map((order) => (
        <div key={order.id} className="flex items-center gap-2">
          <div className="flex-1">
            <OrderCard
              order={order}
              onPress={() => {}}
            />
          </div>
          {order.status === 'delivered' && (
            <Button
              onPress={() => setReorderTarget(order)}
              className="shrink-0 h-8 px-4 rounded-lg border border-[var(--color-primary)] text-xs text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/5 cursor-pointer transition-colors"
            >
              {t('orders.reorder')}
            </Button>
          )}
        </div>
      ))}

      {reorderTarget && (
        <ReorderDialog
          orderId={reorderTarget.id}
          orderRef={reorderTarget.reference}
          itemCount={reorderTarget.itemCount}
          isOpen={!!reorderTarget}
          onOpenChange={(open) => {
            if (!open) setReorderTarget(null)
          }}
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

  const [reorderList, setReorderList] = useState<{
    id: string
    name: string
    itemCount: number
  } | null>(null)

  const deleteListMutation = useMutation({
    mutationFn: (listId: string) =>
      deleteSavedList({ data: { listId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lists'] })
    },
  })

  const isLoading = draftsLoading || listsLoading
  const hasDrafts = drafts && drafts.length > 0
  const hasSavedLists =
    savedListsData?.lists && savedListsData.lists.length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  if (!hasDrafts && !hasSavedLists) {
    return (
      <TabEmptyState
        title={t('orders.emptyDraftsTitle')}
        body={t('orders.emptyDraftsBody')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Quote Drafts */}
      {hasDrafts && (
        <div className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onResume={() =>
                navigate({ to: '/orders/new', search: { draft: draft.id } })
              }
              onDeleted={() =>
                queryClient.invalidateQueries({ queryKey: ['quote-drafts'] })
              }
            />
          ))}
        </div>
      )}

      {/* Saved Lists sub-section (PORT-14) */}
      {hasSavedLists && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            {t('orders.savedLists')}
          </h3>
          {savedListsData.lists.map((list) => (
            <SavedListCard
              key={list.id}
              list={list}
              onReorder={() =>
                setReorderList({
                  id: list.id,
                  name: list.name,
                  itemCount: list.items.length,
                })
              }
              onEdit={() => {
                // Navigate to edit list (future)
              }}
              onDelete={() => deleteListMutation.mutate(list.id)}
            />
          ))}
        </div>
      )}

      {!hasSavedLists && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            {t('orders.savedLists')}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('orders.savedListEmpty')}
          </p>
        </div>
      )}

      {reorderList && (
        <ReorderDialog
          orderId={reorderList.id}
          orderRef={reorderList.name}
          itemCount={reorderList.itemCount}
          isOpen={!!reorderList}
          onOpenChange={(open) => {
            if (!open) setReorderList(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Pending Approvals Section
// ============================================================================

function PendingApprovalsSection() {
  const { data: approvals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => getPendingApprovals(),
    staleTime: 60_000,
  })

  if (!approvals || approvals.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">
        Pending Approvals
      </h3>
      {approvals.map((approval) => (
        <ApprovalBanner key={approval.approvalId} approval={approval} />
      ))}
    </div>
  )
}

// ============================================================================
// Draft Card
// ============================================================================

interface DraftData {
  id: string
  requestNumber: string
  notes: string | null
  updatedAt: string
  itemCount: number
}

function DraftCard({
  draft,
  onResume,
  onDeleted,
}: {
  draft: DraftData
  onResume: () => void
  onDeleted: () => void
}) {
  const { t } = useTranslation('portal')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Dev mode: just succeed
      return { success: true }
    },
    onSuccess: onDeleted,
  })

  const formattedDate = new Date(draft.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-border)]">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--color-text)]">
          {draft.requestNumber || draft.notes || 'Draft'}
        </span>
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span>
            <span className="font-mono">{draft.itemCount}</span> items
          </span>
          <span className="font-mono">
            {t('orders.lastEdited', { date: formattedDate })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onPress={onResume}
          className="h-9 px-4 rounded-lg border border-[var(--color-primary)] text-xs text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/5 cursor-pointer transition-colors"
        >
          {t('orders.continue')}
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              onPress={() => {
                deleteMutation.mutate()
                setConfirmDelete(false)
              }}
              className="h-9 px-3 rounded-lg text-xs text-[var(--color-error)] hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
            >
              {t('orders.confirmDelete')}
            </Button>
            <Button
              onPress={() => setConfirmDelete(false)}
              className="h-9 px-2 rounded-lg text-xs text-[var(--color-text-muted)] cursor-pointer"
            >
              {t('orders.cancel')}
            </Button>
          </div>
        ) : (
          <Button
            onPress={() => setConfirmDelete(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] cursor-pointer transition-colors"
            aria-label={`Delete draft ${draft.requestNumber}`}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Skeleton Cards (loading state)
// ============================================================================

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--color-border)] p-4 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-28 bg-[var(--color-surface)] rounded" />
            <div className="h-5 w-16 bg-[var(--color-surface)] rounded-sm" />
          </div>
          <div className="h-3 w-48 bg-[var(--color-surface)] rounded mb-2" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 bg-[var(--color-surface)] rounded" />
            <div className="h-4 w-24 bg-[var(--color-surface)] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({
  message,
  onRetry,
}: { message: string; onRetry: () => void }) {
  const { t } = useTranslation('portal')

  return (
    <div className="flex flex-col items-center gap-3 py-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <AlertTriangle size={32} className="text-[var(--color-warning)]" />
      <p className="text-sm text-[var(--color-text-muted)] text-center">
        {message}
      </p>
      <Button
        onPress={() => onRetry()}
        className="h-9 px-4 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] font-medium hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
      >
        {t('orders.retry')}
      </Button>
    </div>
  )
}

// ============================================================================
// Tab Empty State
// ============================================================================

function TabEmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      {icon}
      <p className="text-lg font-semibold text-[var(--color-text)]">{title}</p>
      <p className="text-sm text-[var(--color-text-muted)]">{body}</p>
      {action}
    </div>
  )
}
