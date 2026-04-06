import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Tab, TabList, Tabs, Button } from 'react-aria-components'
import { getReturnsClaims } from '../../../lib/server/customer-service'
import type { ClaimTier, ClaimStatus, ReturnStatus } from '../../../types/customer-service'

type ActiveTab = 'claims' | 'returns'

const TIER_BADGE: Record<ClaimTier, string> = {
  minor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  major: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const CLAIM_STATUS_BADGE: Record<ClaimStatus, string> = {
  reported: 'bg-[#2563EB]/10 text-[#2563EB]',
  under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  inspection_scheduled: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  resolution_proposed: 'bg-[#2563EB]/10 text-[#2563EB]',
  settled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

const RETURN_STATUS_BADGE: Record<ReturnStatus, string> = {
  requested: 'bg-[#2563EB]/10 text-[#2563EB]',
  rma_issued: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  received: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  inspected: 'bg-[#2563EB]/10 text-[#2563EB]',
  credit_issued: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

const CLAIM_FLOW_STEPS = ['step1', 'step2', 'step3', 'step4', 'step5'] as const

function claimStatusToI18nKey(status: ClaimStatus): string {
  const map: Record<ClaimStatus, string> = {
    reported: 'reported',
    under_review: 'underReview',
    inspection_scheduled: 'inspectionScheduled',
    resolution_proposed: 'resolutionProposed',
    settled: 'settled',
  }
  return map[status]
}

function returnStatusToI18nKey(status: ReturnStatus): string {
  const map: Record<ReturnStatus, string> = {
    requested: 'requested',
    rma_issued: 'rmaIssued',
    received: 'received',
    inspected: 'inspected',
    credit_issued: 'creditIssued',
  }
  return map[status]
}

/**
 * Returns & Claims view — two tabs: Damage Claims and Return Requests.
 * Damage claims show tier classification (Minor/Moderate/Major).
 * Return requests show RMA tracking.
 */
export function ReturnsClaims() {
  const { t } = useTranslation('customer-service')
  const [activeTab, setActiveTab] = useState<ActiveTab>('claims')
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['cs', 'returns-claims'],
    queryFn: () => getReturnsClaims(),
    staleTime: 15_000,
  })

  if (!data) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onPress={() => console.log('[CS] New damage claim')}
          className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 cursor-pointer"
        >
          {t('returns.newClaim', 'New Damage Claim')}
        </Button>
        <Button
          onPress={() => console.log('[CS] New RMA')}
          className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
        >
          {t('returns.newRma', 'New RMA')}
        </Button>
      </div>

      {/* Tab selection */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as ActiveTab)}
      >
        <TabList
          aria-label={t('returns.title', 'Returns & Claims')}
          className="flex border-b border-black/10 dark:border-white/10 gap-1"
        >
          <Tab
            id="claims"
            className="shrink-0 cursor-pointer whitespace-nowrap px-3 py-2.5 text-sm font-medium text-black/60 dark:text-white/60 outline-none transition-colors
              data-[selected]:text-[#2563EB] data-[selected]:border-b-2 data-[selected]:border-[#2563EB]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded-t"
          >
            {t('returns.damageClaims', 'Damage Claims')}
          </Tab>
          <Tab
            id="returns"
            className="shrink-0 cursor-pointer whitespace-nowrap px-3 py-2.5 text-sm font-medium text-black/60 dark:text-white/60 outline-none transition-colors
              data-[selected]:text-[#2563EB] data-[selected]:border-b-2 data-[selected]:border-[#2563EB]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded-t"
          >
            {t('returns.returnRequests', 'Return Requests')}
          </Tab>
        </TabList>
      </Tabs>

      {/* Damage Claims table */}
      {activeTab === 'claims' && (
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.claimId', 'Claim ID')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.customer', 'Customer')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.delivery', 'Delivery')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.order', 'Order')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.tier', 'Tier')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.damagePercent', 'Damage %')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.status', 'Status')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.photos', 'Photos')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.created', 'Created')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.claims.map((claim) => (
                <>
                  <tr
                    key={claim.id}
                    onClick={() => setExpandedClaimId(expandedClaimId === claim.id ? null : claim.id)}
                    className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    role="row"
                  >
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                      {claim.id}
                    </td>
                    <td className="px-4 py-3 text-sm">{claim.customerName}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                      {claim.deliveryId}
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                      {claim.orderId}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[claim.claimTier]}`}>
                        {t(`tierLabel.${claim.claimTier}`, claim.claimTier)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                      {claim.damagePercent}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CLAIM_STATUS_BADGE[claim.status]}`}>
                        {t(`claimStatus.${claimStatusToI18nKey(claim.status)}`, claim.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                      {claim.photos.length}
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
                      {formatRelativeTime(claim.createdAt)}
                    </td>
                  </tr>
                  {/* Expanded claim detail */}
                  {expandedClaimId === claim.id && (
                    <tr key={`${claim.id}-detail`}>
                      <td colSpan={9} className="px-4 py-4 bg-black/[0.01] dark:bg-white/[0.01]">
                        <div className="space-y-3">
                          {/* Claim flow stepper */}
                          <h5 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase">
                            {t('returns.claimFlow', 'Claim Flow')}
                          </h5>
                          <div className="flex items-center gap-1">
                            {CLAIM_FLOW_STEPS.map((step, idx) => {
                              const stepIdx = claimStatusToStep(claim.status)
                              const isComplete = idx <= stepIdx
                              const isCurrent = idx === stepIdx

                              return (
                                <div key={step} className="flex items-center">
                                  <div
                                    className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
                                      isCurrent
                                        ? 'bg-[#2563EB] text-white'
                                        : isComplete
                                          ? 'bg-[#2563EB]/10 text-[#2563EB]'
                                          : 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40'
                                    }`}
                                  >
                                    {t(`returns.${step}`, step)}
                                  </div>
                                  {idx < CLAIM_FLOW_STEPS.length - 1 && (
                                    <div className={`w-4 h-px mx-0.5 ${isComplete ? 'bg-[#2563EB]' : 'bg-black/10 dark:bg-white/10'}`} />
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Resolution info */}
                          {claim.resolution && (
                            <div className="text-sm">
                              <span className="text-black/50 dark:text-white/50">{t('returns.resolution', 'Resolution')}:</span>{' '}
                              <span className="font-medium">
                                {t(`resolutionType.${camelCase(claim.resolution)}`, claim.resolution)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Return Requests table */}
      {activeTab === 'returns' && (
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.rmaNumber', 'RMA Number')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.customer', 'Customer')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.order', 'Order')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.items', 'Items')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.status', 'Status')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                  {t('returns.created', 'Created')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.returns.map((ret) => (
                <tr
                  key={ret.id}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  role="row"
                >
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {ret.rmaNumber}
                  </td>
                  <td className="px-4 py-3 text-sm">{ret.customerName}</td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {ret.orderId}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{ret.items.length}</span> items
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RETURN_STATUS_BADGE[ret.status]}`}>
                      {t(`returnStatus.${returnStatusToI18nKey(ret.status)}`, ret.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
                    {formatRelativeTime(ret.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function claimStatusToStep(status: ClaimStatus): number {
  const map: Record<ClaimStatus, number> = {
    reported: 0,
    under_review: 1,
    inspection_scheduled: 2,
    resolution_proposed: 3,
    settled: 4,
  }
  return map[status]
}

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
