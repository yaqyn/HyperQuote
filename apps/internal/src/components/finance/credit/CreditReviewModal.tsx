import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
  Button,
  TextField,
  Input,
  Label,
  TextArea,
} from 'react-aria-components'
import type { CreditProfile } from '../../../types/finance'
import { updateCreditLimit } from '../../../lib/server/finance-credit'
import { CurrencyCell } from '../shared/CurrencyCell'
import { CreditApprovalChain } from './CreditApprovalChain'

interface CreditReviewModalProps {
  profile: CreditProfile
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Mock Data ──────────────────────────────────────────

/** 12-month payment history: % on-time per month */
const PAYMENT_HISTORY = [
  { month: 'May', pct: 88 },
  { month: 'Jun', pct: 92 },
  { month: 'Jul', pct: 85 },
  { month: 'Aug', pct: 90 },
  { month: 'Sep', pct: 95 },
  { month: 'Oct', pct: 88 },
  { month: 'Nov', pct: 92 },
  { month: 'Dec', pct: 96 },
  { month: 'Jan', pct: 94 },
  { month: 'Feb', pct: 90 },
  { month: 'Mar', pct: 97 },
  { month: 'Apr', pct: 94 },
]

/** Quarterly order volume (EGP) */
const ORDER_VOLUME = [
  { quarter: 'Q2 25', amount: 1_200_000 },
  { quarter: 'Q3 25', amount: 1_450_000 },
  { quarter: 'Q4 25', amount: 1_680_000 },
  { quarter: 'Q1 26', amount: 2_050_000 },
]

/** 12-month payment history SVG bar chart */
function PaymentHistoryChart() {
  const barWidth = 24
  const gap = 4
  const maxHeight = 80
  const chartWidth = PAYMENT_HISTORY.length * (barWidth + gap)

  return (
    <svg width={chartWidth} height={maxHeight + 20} className="block">
      {PAYMENT_HISTORY.map((m, i) => {
        const barH = (m.pct / 100) * maxHeight
        const x = i * (barWidth + gap)
        const y = maxHeight - barH
        const isLate = m.pct < 90
        return (
          <g key={m.month}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              className={isLate ? 'fill-red-500/70' : 'fill-green-500/70'}
            />
            <text
              x={x + barWidth / 2}
              y={maxHeight + 14}
              textAnchor="middle"
              className="fill-current text-black/40 dark:text-white/40"
              style={{ fontSize: '8px', fontFamily: 'var(--font-geist-mono)' }}
            >
              {m.month.slice(0, 3)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Order volume trend SVG line chart */
function OrderVolumeTrend() {
  const maxAmount = Math.max(...ORDER_VOLUME.map((q) => q.amount))
  const chartWidth = 200
  const chartHeight = 80
  const padding = 10

  const points = ORDER_VOLUME.map((q, i) => {
    const x = padding + (i / (ORDER_VOLUME.length - 1)) * (chartWidth - padding * 2)
    const y = chartHeight - padding - ((q.amount / maxAmount) * (chartHeight - padding * 2))
    return { x, y, ...q }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg width={chartWidth} height={chartHeight + 20} className="block">
      {/* Line */}
      <path d={pathD} fill="none" stroke="#2563EB" strokeWidth={2} />
      {/* Dots + labels */}
      {points.map((p) => (
        <g key={p.quarter}>
          <circle cx={p.x} cy={p.y} r={3} className="fill-[#2563EB]" />
          <text
            x={p.x}
            y={chartHeight + 14}
            textAnchor="middle"
            className="fill-current text-black/40 dark:text-white/40"
            style={{ fontSize: '8px', fontFamily: 'var(--font-geist-mono)' }}
          >
            {p.quarter}
          </text>
        </g>
      ))}
    </svg>
  )
}

/**
 * Credit limit review modal (React Aria Dialog).
 * Shows payment history chart, order volume trend, AI recommendation.
 * Actions: Approve Requested, Approve Different, Deny, Defer + Notes.
 * On approve: calls updateCreditLimit, shows CreditApprovalChain if needed.
 */
export function CreditReviewModal({ profile, isOpen, onOpenChange }: CreditReviewModalProps) {
  const { t } = useTranslation('finance')

  const [customAmount, setCustomAmount] = useState('')
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [notes, setNotes] = useState('')
  const [approvalResult, setApprovalResult] = useState<{
    success: boolean
    approvalRequired: string | null
  } | null>(null)

  // Mock: requested limit = current + 30%
  const requestedLimit = Math.round(profile.creditLimit * 1.3)
  const increasePercent = ((requestedLimit - profile.creditLimit) / profile.creditLimit) * 100
  const aiSuggestedLimit = Math.round(profile.creditLimit * 1.3)

  const handleApprove = async (amount: number) => {
    const result = await updateCreditLimit({
      data: {
        customerId: profile.customerId,
        newLimit: amount,
        reason: notes || 'Credit review approval',
      },
    })
    setApprovalResult(result)
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-2xl">
        <Dialog className="p-6 outline-none">
          {({ close }) => (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Heading slot="title" className="text-lg font-semibold">
                  {t('credit.reviewTitle', 'Credit Review')} &mdash; {profile.customerName}
                </Heading>
                <Button
                  onPress={close}
                  className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white text-lg"
                >
                  &times;
                </Button>
              </div>

              {/* Current + Requested */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                    {t('credit.currentLimit', 'Current Limit')}
                  </div>
                  <CurrencyCell amount={profile.creditLimit} className="text-base" />
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                    {t('credit.requestedLimit', 'Requested Limit')}
                  </div>
                  <CurrencyCell amount={requestedLimit} className="text-base" />
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                    {t('credit.increasePercent', 'Increase')}
                  </div>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base">
                    +{Math.round(increasePercent)}%
                  </span>
                </div>
              </div>

              {/* Supporting Data: 2 columns */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Left: Payment History */}
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-2">
                    {t('credit.paymentHistory', '12-Month Payment History (% On-Time)')}
                  </div>
                  <div className="overflow-x-auto">
                    <PaymentHistoryChart />
                  </div>
                </div>

                {/* Right: Order Volume */}
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-2">
                    {t('credit.orderVolumeTrend', 'Order Volume Trend (QoQ)')}
                  </div>
                  <OrderVolumeTrend />
                </div>
              </div>

              {/* Current exposure + overdue */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                    {t('credit.currentExposure', 'Current Exposure')}
                  </div>
                  <CurrencyCell amount={profile.currentExposure} className="text-sm" />
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                    {t('credit.overdueHistory', 'Overdue Amount')}
                  </div>
                  <CurrencyCell
                    amount={profile.overdueAmount}
                    className={`text-sm ${profile.overdueAmount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
                  />
                </div>
              </div>

              {/* AI Recommendation (glass card) */}
              <div className="rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 backdrop-blur-sm p-4 space-y-2">
                <div className="text-xs font-medium text-[#2563EB]">
                  {t('credit.aiRecommendation', 'AI Recommendation')}
                </div>
                <div className="text-sm font-semibold">
                  {t('credit.aiSuggest', 'Suggest')}{' '}
                  <CurrencyCell amount={aiSuggestedLimit} className="text-sm font-semibold" />{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    (+{Math.round(increasePercent)}%)
                  </span>
                </div>
                <div className="text-xs text-black/60 dark:text-white/60">
                  {t(
                    'credit.aiReasoning',
                    `Based on: ${Math.round(PAYMENT_HISTORY.reduce((s, m) => s + m.pct, 0) / PAYMENT_HISTORY.length)}% on-time payment rate, ${Math.round(((ORDER_VOLUME[ORDER_VOLUME.length - 1].amount - ORDER_VOLUME[ORDER_VOLUME.length - 2].amount) / ORDER_VOLUME[ORDER_VOLUME.length - 2].amount) * 100)}% QoQ order growth, ${profile.bouncedCheques12mo} bounced cheques.`,
                  )}
                </div>
              </div>

              {/* Approval Chain (if result shows approval required) */}
              {approvalResult?.approvalRequired && (
                <CreditApprovalChain
                  increasePercent={increasePercent}
                  newLimit={requestedLimit}
                />
              )}

              {/* Notes */}
              <TextField className="space-y-1">
                <Label className="text-xs text-black/50 dark:text-white/50">
                  {t('credit.notes', 'Notes')}
                </Label>
                <TextArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-3 py-2 text-sm outline-none focus:border-[#2563EB] transition-colors"
                  placeholder={t('credit.notesPlaceholder', 'Add review notes...')}
                />
              </TextField>

              {/* Custom amount input */}
              {showCustomAmount && (
                <TextField className="space-y-1">
                  <Label className="text-xs text-black/50 dark:text-white/50">
                    {t('credit.customAmount', 'Custom Amount (EGP)')}
                  </Label>
                  <Input
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    type="number"
                    className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none focus:border-[#2563EB] transition-colors"
                  />
                </TextField>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/10 dark:border-white/10">
                <Button
                  onPress={() => handleApprove(requestedLimit)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
                >
                  {t('credit.approveRequested', 'Approve Requested Amount')}
                </Button>
                <Button
                  onPress={() => {
                    if (showCustomAmount && customAmount) {
                      handleApprove(Number(customAmount))
                    } else {
                      setShowCustomAmount(true)
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 hover:bg-black/5 dark:hover:bg-white/5 pressed:bg-black/10 dark:pressed:bg-white/10 transition-colors"
                >
                  {t('credit.approveDifferent', 'Approve Different Amount')}
                </Button>
                <Button
                  onPress={close}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/5 pressed:bg-red-500/10 transition-colors"
                >
                  {t('credit.deny', 'Deny')}
                </Button>
                <Button
                  onPress={close}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {t('credit.defer', 'Defer')}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
