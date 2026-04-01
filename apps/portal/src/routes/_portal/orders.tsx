/**
 * Orders window with 4 tabs: Active, Quotes, History, Drafts.
 * Approvers see pending approval cards above tabs.
 * "New Quote Request" button at top navigates to builder.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from 'react-aria-components'
import { Trash2 } from 'lucide-react'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { ApprovalBanner } from '../../components/quote-builder/ApprovalBanner'
import { useIsApprover } from '../../hooks/useApproval'
import { getPendingApprovals } from '../../lib/server/approvals'
import { getDrafts } from '../../lib/server/quote-requests'
import { useState } from 'react'

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersWindow,
})

function OrdersWindow() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const isApprover = useIsApprover()

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
              <StyledTab id="active">Active</StyledTab>
              <StyledTab id="quotes">Quotes</StyledTab>
              <StyledTab id="history">History</StyledTab>
              <StyledTab id="drafts">Drafts</StyledTab>
            </TabList>

            <TabPanel id="active">
              <EmptyState
                title={t('quoteBuilder.emptyActiveTitle')}
                body={t('quoteBuilder.emptyActiveBody')}
              />
            </TabPanel>

            <TabPanel id="quotes">
              <EmptyState
                title="No quotes yet"
                body="Your quote responses will appear here."
              />
            </TabPanel>

            <TabPanel id="history">
              <EmptyState
                title="No history"
                body="Completed and cancelled orders will appear here."
              />
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

function StyledTab({ id, children }: { id: string; children: React.ReactNode }) {
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
// Pending Approvals Section
// ============================================================================

function PendingApprovalsSection() {
  const { data: approvals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => getPendingApprovals(),
    staleTime: 60_000, // 1 minute
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
// Drafts Tab
// ============================================================================

function DraftsTab() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: drafts, isLoading } = useQuery({
    queryKey: ['quote-drafts'],
    queryFn: () => getDrafts(),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  if (!drafts || drafts.length === 0) {
    return (
      <EmptyState
        title={t('quoteBuilder.emptyDraftsTitle')}
        body={t('quoteBuilder.emptyDraftsBody')}
      />
    )
  }

  return (
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

  const formattedDate = new Date(draft.updatedAt).toLocaleDateString()

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
          <span className="font-mono">{formattedDate}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Continue button */}
        <Button
          onPress={onResume}
          className="h-9 px-4 rounded-lg border border-[var(--color-primary)] text-xs text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/5 cursor-pointer transition-colors"
        >
          {t('quoteBuilder.continue')}
        </Button>

        {/* Delete button */}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              onPress={() => {
                deleteMutation.mutate()
                setConfirmDelete(false)
              }}
              className="h-9 px-3 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
            >
              Confirm
            </Button>
            <Button
              onPress={() => setConfirmDelete(false)}
              className="h-9 px-2 rounded-lg text-xs text-[var(--color-text-muted)] cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            onPress={() => setConfirmDelete(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 cursor-pointer transition-colors"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <p className="text-lg font-semibold text-[var(--color-text)]">{title}</p>
      <p className="text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  )
}
