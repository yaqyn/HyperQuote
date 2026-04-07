import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Checkbox } from 'react-aria-components'
import type { ChequeRecord, ChequeStatus } from '../../../types/finance'
import { getValidTransitions } from '../../../lib/finance/cheque-state-machine'
import { updateChequeStatus, batchUpdateChequeStatus } from '../../../lib/server/finance-cheques'
import { CurrencyCell } from '../shared/CurrencyCell'
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

/** Status dot colors — semantic for DATA only */
const STATUS_DOTS: Record<ChequeStatus, string> = {
  received: 'bg-[#2563EB]',
  deposited: 'bg-[#2563EB]/50',
  cleared: 'bg-green-500',
  bounced: 'bg-red-500',
  re_presented: 'bg-yellow-500',
  written_off: 'bg-black/20 dark:bg-white/20',
  replaced: 'bg-black/20 dark:bg-white/20',
}

/**
 * Dense grid — cheque # (mono) + customer/vendor + amount (mono) + bank + due date + status dot.
 * Sortable columns but no heavy table borders. Bloomberg terminal density.
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
    const map: Partial<Record<ChequeStatus, { count: number; amount: number }>> = {}
    for (const c of cheques) {
      const entry = map[c.status] ?? { count: 0, amount: 0 }
      entry.count += 1
      entry.amount += c.amount
      map[c.status] = entry
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
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  }

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  // Batch actions valid for current selection
  const batchableStatuses = useMemo(() => {
    if (selectedIds.size === 0) return []
    const selectedCheques = cheques.filter((c) => selectedIds.has(c.id))
    const commonTransitions = selectedCheques.reduce<ChequeStatus[]>((acc, c, idx) => {
      const transitions = getValidTransitions(c.status)
      if (idx === 0) return transitions
      return acc.filter((t) => transitions.includes(t))
    }, [])
    return commonTransitions
  }, [selectedIds, cheques])

  return (
    <div className="flex flex-col">
      {/* Toolbar: filter + batch actions */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-black/10 dark:border-white/10">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ChequeStatus | 'all')}
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs text-black dark:text-white outline-none focus:border-[#2563EB]"
        >
          <option value="all">{t('pdc.allStatuses', 'All')}</option>
          <option value="received">{t('pdc.received', 'Received')}</option>
          <option value="deposited">{t('pdc.deposited', 'Deposited')}</option>
          <option value="cleared">{t('pdc.cleared', 'Cleared')}</option>
          <option value="bounced">{t('pdc.bounced', 'Bounced')}</option>
          <option value="re_presented">{t('pdc.rePres', 'Re-presented')}</option>
        </select>

        {/* Batch actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ms-2">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/30 dark:text-white/30">
              {selectedIds.size}
            </span>
            {batchableStatuses.includes('deposited') && (
              <Button
                onPress={() => handleBatchAction('deposited')}
                className="rounded-md bg-[#2563EB] px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[#2563EB]/90 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
              >
                {t('pdc.batchDeposit', 'Deposit All')}
              </Button>
            )}
            {batchableStatuses.includes('cleared') && (
              <Button
                onPress={() => handleBatchAction('cleared')}
                className="rounded-md bg-green-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-green-700 outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
              >
                {t('pdc.batchClear', 'Clear All')}
              </Button>
            )}
          </div>
        )}

        {/* Status summary — right side */}
        <div className="ms-auto flex items-center gap-3">
          {(
            [
              ['received', 'Pending'],
              ['deposited', 'Deposited'],
              ['bounced', 'Bounced'],
            ] as const
          ).map(([status, label]) => {
            const data = totals[status]
            if (!data) return null
            return (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`size-[5px] rounded-full ${STATUS_DOTS[status]}`} />
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/40 dark:text-white/40">
                  {data.count}
                </span>
                <CurrencyCell amount={data.amount} className="text-[10px] text-black/30 dark:text-white/30" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Table — dense, no heavy borders */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-black/40 dark:text-white/40">
              <th className="w-8 px-3 py-2.5 text-start">
                <Checkbox
                  isSelected={selectedIds.size === sorted.length && sorted.length > 0}
                  isIndeterminate={selectedIds.size > 0 && selectedIds.size < sorted.length}
                  onChange={toggleSelectAll}
                  className="group"
                >
                  <div className="size-3.5 rounded-sm border border-black/20 dark:border-white/20 flex items-center justify-center group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB] group-data-[indeterminate]:bg-[#2563EB] group-data-[indeterminate]:border-[#2563EB] transition-colors">
                    <svg className="size-2.5 text-white hidden group-data-[selected]:block" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <svg className="size-2.5 text-white hidden group-data-[indeterminate]:block" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </Checkbox>
              </th>
              <th className="px-3 py-2.5 text-start font-medium">
                {t('pdc.chequeNo', 'Cheque #')}
              </th>
              <th
                className="px-3 py-2.5 text-start font-medium cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                onClick={() => toggleSort('customerName')}
              >
                {t('pdc.customer', 'Customer/Vendor')}{sortArrow('customerName')}
              </th>
              <th className="px-3 py-2.5 text-start font-medium">
                {t('pdc.bank', 'Bank')}
              </th>
              <th
                className="px-3 py-2.5 text-start font-medium cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                onClick={() => toggleSort('maturityDate')}
              >
                {t('pdc.maturityDate', 'Due')}{sortArrow('maturityDate')}
              </th>
              <th
                className="px-3 py-2.5 text-end font-medium cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                onClick={() => toggleSort('amount')}
              >
                {t('pdc.amount', 'Amount')}{sortArrow('amount')}
              </th>
              <th className="px-3 py-2.5 text-center font-medium w-8" />
              <th className="px-3 py-2.5 text-start font-medium">
                {t('pdc.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cheque) => {
              const transitions = getValidTransitions(cheque.status)
              return (
                <tr
                  key={cheque.id}
                  className="border-t border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      isSelected={selectedIds.has(cheque.id)}
                      onChange={() => toggleSelect(cheque.id)}
                      className="group"
                    >
                      <div className="size-3.5 rounded-sm border border-black/20 dark:border-white/20 flex items-center justify-center group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB] transition-colors">
                        <svg className="size-2.5 text-white hidden group-data-[selected]:block" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </Checkbox>
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black dark:text-white">
                    {cheque.chequeNumber}
                  </td>
                  <td className="px-3 py-2 text-xs text-black dark:text-white">
                    {cheque.customerName}
                  </td>
                  <td className="px-3 py-2 text-xs text-black/40 dark:text-white/40">
                    {cheque.bankName}
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/60 dark:text-white/60">
                    {formatDate(cheque.maturityDate)}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <CurrencyCell amount={cheque.amount} className="text-xs" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className={`size-2 rounded-full mx-auto ${STATUS_DOTS[cheque.status]}`} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {transitions.map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          onPress={() => handleAction(cheque, nextStatus)}
                          isDisabled={actionLoading === cheque.id}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors ${
                            nextStatus === 'bounced'
                              ? 'text-red-600 hover:bg-red-500/5'
                              : nextStatus === 'cleared'
                                ? 'text-green-600 hover:bg-green-500/5'
                                : nextStatus === 'deposited'
                                  ? 'text-[#2563EB] hover:bg-[#2563EB]/5'
                                  : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'
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
                <td colSpan={8} className="px-3 py-16 text-center text-xs text-black/30 dark:text-white/30">
                  {t('pdc.noCheques', 'No cheques found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
