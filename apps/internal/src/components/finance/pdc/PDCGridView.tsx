import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Cell,
  Checkbox,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
  Collection,
} from 'react-aria-components'
import type { ChequeRecord, ChequeStatus } from '../../../types/finance'
import { getValidTransitions } from '../../../lib/finance/cheque-state-machine'
import { updateChequeStatus, batchUpdateChequeStatus } from '../../../lib/server/finance-cheques'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import { BounceHandlingModal } from './BounceHandlingModal'

interface PDCGridViewProps {
  cheques: ChequeRecord[]
  onRefresh: () => void
}

type SortField = 'maturityDate' | 'amount' | 'customerName'
type SortDir = 'asc' | 'desc'

const ACTION_LABELS: Record<ChequeStatus, string> = {
  received: '',
  deposited: 'Deposit',
  cleared: 'Clear',
  bounced: 'Bounce',
  re_presented: 'Re-present',
  written_off: 'Write Off',
  replaced: 'Replace',
}

/**
 * PDC Grid View — cheque table with status badges, context-dependent action buttons,
 * batch operations, sorting, filtering, and summary footer.
 */
export function PDCGridView({ cheques, onRefresh }: PDCGridViewProps) {
  const { t, i18n } = useTranslation('finance')
  const isArabic = i18n.language === 'ar'

  const [sortField, setSortField] = useState<SortField>('maturityDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bounceTarget, setBounceTarget] = useState<ChequeRecord | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filter
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return cheques
    return cheques.filter((c) => c.status === statusFilter)
  }, [cheques, statusFilter])

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'maturityDate':
          cmp = a.maturityDate.localeCompare(b.maturityDate)
          break
        case 'amount':
          cmp = a.amount - b.amount
          break
        case 'customerName':
          cmp = a.customerName.localeCompare(b.customerName)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sortField, sortDir])

  // Summary totals by status
  const totals = useMemo(() => {
    const map: Partial<Record<ChequeStatus, number>> = {}
    for (const c of cheques) {
      map[c.status] = (map[c.status] ?? 0) + c.amount
    }
    return map
  }, [cheques])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleAction = async (cheque: ChequeRecord, newStatus: ChequeStatus) => {
    if (newStatus === 'bounced') {
      setBounceTarget(cheque)
      return
    }
    setActionLoading(cheque.id)
    try {
      await updateChequeStatus({
        data: { chequeId: cheque.id, status: newStatus },
      })
      onRefresh()
    } finally {
      setActionLoading(null)
    }
  }

  const handleBatchAction = async (status: ChequeStatus) => {
    if (selectedIds.size === 0) return
    const updates = Array.from(selectedIds).map((chequeId) => ({
      chequeId,
      status,
    }))
    await batchUpdateChequeStatus({ data: { updates } })
    setSelectedIds(new Set())
    onRefresh()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map((c) => c.id)))
    }
  }

  const formatDate = (iso: string) => {
    return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  }

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  }

  // Determine which batch actions are valid for current selection
  const batchableStatuses = useMemo(() => {
    if (selectedIds.size === 0) return []
    const selectedCheques = cheques.filter((c) => selectedIds.has(c.id))
    // Only show batch actions if all selected share a common valid transition
    const commonTransitions = selectedCheques.reduce<ChequeStatus[]>((acc, c, idx) => {
      const transitions = getValidTransitions(c.status)
      if (idx === 0) return transitions
      return acc.filter((t) => transitions.includes(t))
    }, [])
    return commonTransitions
  }, [selectedIds, cheques])

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: filter + batch actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ChequeStatus | 'all')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-1.5 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="all">{t('pdc.allStatuses', 'All Statuses')}</option>
          <option value="received">{t('pdc.received', 'Received')}</option>
          <option value="deposited">{t('pdc.deposited', 'Deposited')}</option>
          <option value="cleared">{t('pdc.cleared', 'Cleared')}</option>
          <option value="bounced">{t('pdc.bounced', 'Bounced')}</option>
          <option value="re_presented">{t('pdc.rePres', 'Re-presented')}</option>
          <option value="written_off">{t('pdc.writtenOff', 'Written Off')}</option>
          <option value="replaced">{t('pdc.replaced', 'Replaced')}</option>
        </select>

        {/* Batch actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-black/50 dark:text-white/50">
              {selectedIds.size} {t('pdc.selected', 'selected')}
            </span>
            {batchableStatuses.includes('deposited') && (
              <Button
                onPress={() => handleBatchAction('deposited')}
                className="rounded-md bg-[#2563EB] px-3 py-1 text-xs font-medium text-white hover:bg-[#2563EB]/90 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                {t('pdc.batchDeposit', 'Batch Deposit')}
              </Button>
            )}
            {batchableStatuses.includes('cleared') && (
              <Button
                onPress={() => handleBatchAction('cleared')}
                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                {t('pdc.batchClear', 'Batch Clear')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="w-10 px-3 py-2.5 text-start">
                <Checkbox
                  isSelected={selectedIds.size === sorted.length && sorted.length > 0}
                  isIndeterminate={selectedIds.size > 0 && selectedIds.size < sorted.length}
                  onChange={toggleSelectAll}
                  className="group"
                >
                  <div className="size-4 rounded border border-black/20 dark:border-white/20 flex items-center justify-center group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB] group-data-[indeterminate]:bg-[#2563EB] group-data-[indeterminate]:border-[#2563EB]">
                    <svg className="size-3 text-white hidden group-data-[selected]:block" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <svg className="size-3 text-white hidden group-data-[indeterminate]:block" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </Checkbox>
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50 w-10">
                #
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('pdc.chequeNo', 'Cheque No')}
              </th>
              <th
                className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50 cursor-pointer select-none hover:text-black dark:hover:text-white"
                onClick={() => toggleSort('customerName')}
              >
                {t('pdc.customer', 'Customer')}{sortIndicator('customerName')}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('pdc.bank', 'Bank')}
              </th>
              <th
                className="px-3 py-2.5 text-end text-xs font-medium text-black/50 dark:text-white/50 cursor-pointer select-none hover:text-black dark:hover:text-white"
                onClick={() => toggleSort('amount')}
              >
                {t('pdc.amount', 'Amount')}{sortIndicator('amount')}
              </th>
              <th
                className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50 cursor-pointer select-none hover:text-black dark:hover:text-white"
                onClick={() => toggleSort('maturityDate')}
              >
                {t('pdc.maturityDate', 'Maturity Date')}{sortIndicator('maturityDate')}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('pdc.status', 'Status')}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('pdc.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cheque, idx) => {
              const transitions = getValidTransitions(cheque.status)
              return (
                <tr
                  key={cheque.id}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      isSelected={selectedIds.has(cheque.id)}
                      onChange={() => toggleSelect(cheque.id)}
                      className="group"
                    >
                      <div className="size-4 rounded border border-black/20 dark:border-white/20 flex items-center justify-center group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB]">
                        <svg className="size-3 text-white hidden group-data-[selected]:block" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </Checkbox>
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-black/40 dark:text-white/40">
                    {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(idx + 1)}
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
                    {cheque.chequeNumber}
                  </td>
                  <td className="px-3 py-2 text-black dark:text-white">
                    {cheque.customerName}
                  </td>
                  <td className="px-3 py-2 text-black/70 dark:text-white/70">
                    {cheque.bankName}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <CurrencyCell amount={cheque.amount} />
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
                    {formatDate(cheque.maturityDate)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={cheque.status} variant="cheque" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {transitions.map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          onPress={() => handleAction(cheque, nextStatus)}
                          isDisabled={actionLoading === cheque.id}
                          className={`rounded-md px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                            nextStatus === 'bounced'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                              : nextStatus === 'cleared'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                : nextStatus === 'deposited'
                                  ? 'bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20'
                                  : 'bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
                          }`}
                        >
                          {ACTION_LABELS[nextStatus] || nextStatus.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-black/40 dark:text-white/40">
                  {t('pdc.noCheques', 'No cheques found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ['received', 'Received'],
            ['deposited', 'Deposited'],
            ['cleared', 'Cleared'],
            ['bounced', 'Bounced'],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <StatusBadge status={status} variant="cheque" />
            <CurrencyCell amount={totals[status] ?? 0} />
          </div>
        ))}
      </div>

      {/* Bounce handling modal */}
      {bounceTarget && (
        <BounceHandlingModal
          cheque={bounceTarget}
          isOpen={!!bounceTarget}
          onOpenChange={(open) => {
            if (!open) setBounceTarget(null)
          }}
          onBounced={() => {
            setBounceTarget(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
