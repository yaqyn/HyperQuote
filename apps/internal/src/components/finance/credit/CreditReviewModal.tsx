import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
  Button,
  TextField,
  Input,
  Label,
  TextArea,
} from 'react-aria-components'
import { motion } from 'motion/react'
import type { CreditProfile } from '../../../types/finance'
import { updateCreditLimit } from '../../../lib/server/finance-credit'
import { CurrencyCell } from '../shared/CurrencyCell'
import { CreditApprovalChain } from './CreditApprovalChain'

interface CreditReviewModalProps {
  profile: CreditProfile
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

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

/** CSS-only bar chart for payment history */
function PaymentHistoryChart() {
  return (
    <div className="flex items-end gap-px h-14">
      {PAYMENT_HISTORY.map((m) => {
        const height = `${((m.pct - 60) / 40) * 100}%`
        const isLate = m.pct < 90
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full relative" style={{ height: '56px' }}>
              <div
                className={`absolute bottom-0 w-full rounded-sm ${isLate ? 'bg-red-500/50' : 'bg-green-500/40'}`}
                style={{ height }}
              />
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-[7px] text-black/20 dark:text-white/20">
              {m.month.slice(0, 1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** CSS-only line-like chart for order volume trend */
function OrderVolumeTrend() {
  const max = Math.max(...ORDER_VOLUME.map((q) => q.amount))
  return (
    <div className="flex items-end gap-3 h-14">
      {ORDER_VOLUME.map((q) => {
        const height = `${(q.amount / max) * 100}%`
        return (
          <div key={q.quarter} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full relative" style={{ height: '56px' }}>
              <div
                className="absolute bottom-0 w-full rounded-sm bg-[#2563EB]/30"
                style={{ height }}
              />
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-[7px] text-black/20 dark:text-white/20">
              {q.quarter}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Credit review modal — clean form with limit adjustment,
 * supporting data (payment history, order volume, AI recommendation),
 * justification textarea, approval routing preview.
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

  const requestedLimit = Math.round(profile.creditLimit * 1.3)
  const increasePercent = ((requestedLimit - profile.creditLimit) / profile.creditLimit) * 100
  const aiSuggestedLimit = Math.round(profile.creditLimit * 1.3)
  const avgOnTime = Math.round(PAYMENT_HISTORY.reduce((s, m) => s + m.pct, 0) / PAYMENT_HISTORY.length)
  const qoqGrowth = Math.round(
    ((ORDER_VOLUME[ORDER_VOLUME.length - 1].amount - ORDER_VOLUME[ORDER_VOLUME.length - 2].amount) /
      ORDER_VOLUME[ORDER_VOLUME.length - 2].amount) * 100,
  )

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
      <Modal className="w-full max-w-3xl max-h-[90vh] overflow-auto">
        <Dialog className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-0 outline-none">
          {({ close }) => (
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* ─── Header ─────────────────────────────── */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <Heading slot="title" className="text-sm font-medium">
                    {t('credit.reviewTitle', 'Credit Review')}
                  </Heading>
                  <div className="text-xs text-black/30 dark:text-white/30 mt-0.5">
                    {profile.customerName}
                  </div>
                </div>
                <Button
                  onPress={close}
                  className="text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white text-sm transition-colors"
                >
                  &times;
                </Button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* ─── Limits comparison ─────────────────── */}
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                      {t('credit.currentLimit', 'Current')}
                    </div>
                    <CurrencyCell amount={profile.creditLimit} className="text-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                      {t('credit.requestedLimit', 'Requested')}
                    </div>
                    <CurrencyCell amount={requestedLimit} className="text-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                      {t('credit.increasePercent', 'Increase')}
                    </div>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[#2563EB]">
                      +{Math.round(increasePercent)}%
                    </span>
                  </div>
                </div>

                {/* ─── Supporting data ───────────────────── */}
                <div className="grid grid-cols-2 gap-6 py-4 border-y border-black/[0.06] dark:border-white/[0.06]">
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-2">
                      {t('credit.paymentHistory', 'Payment History (% On-Time)')}
                    </div>
                    <PaymentHistoryChart />
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-2">
                      {t('credit.orderVolumeTrend', 'Order Volume (QoQ)')}
                    </div>
                    <OrderVolumeTrend />
                  </div>
                </div>

                {/* ─── Exposure + overdue ────────────────── */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                      {t('credit.currentExposure', 'Exposure')}
                    </div>
                    <CurrencyCell amount={profile.currentExposure} className="text-xs" />
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                      {t('credit.overdueHistory', 'Overdue')}
                    </div>
                    <CurrencyCell
                      amount={profile.overdueAmount}
                      className={`text-xs ${profile.overdueAmount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
                    />
                  </div>
                </div>

                {/* ─── AI recommendation ────────────────── */}
                <div className="py-3 px-4 rounded-md border border-[#2563EB]/10 bg-[#2563EB]/[0.02]">
                  <div className="text-[10px] tracking-widest uppercase text-[#2563EB]/50 mb-1">
                    {t('credit.aiRecommendation', 'AI Recommendation')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-black/70 dark:text-white/70">
                      {t('credit.aiSuggest', 'Suggest')}
                    </span>
                    <CurrencyCell amount={aiSuggestedLimit} className="text-xs font-medium" />
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[#2563EB]">
                      (+{Math.round(increasePercent)}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-black/30 dark:text-white/30 mt-1">
                    {avgOnTime}% on-time rate, +{qoqGrowth}% QoQ growth, {profile.bouncedCheques12mo} bounced cheques
                  </div>
                </div>

                {/* ─── Approval chain preview ───────────── */}
                {approvalResult?.approvalRequired && (
                  <CreditApprovalChain
                    increasePercent={increasePercent}
                    newLimit={requestedLimit}
                  />
                )}

                {/* ─── Notes ────────────────────────────── */}
                <TextField className="space-y-1">
                  <Label className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
                    {t('credit.notes', 'Notes')}
                  </Label>
                  <TextArea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#2563EB]/30 transition-colors"
                    placeholder={t('credit.notesPlaceholder', 'Review notes...')}
                  />
                </TextField>

                {/* ─── Custom amount ────────────────────── */}
                {showCustomAmount && (
                  <TextField className="space-y-1">
                    <Label className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
                      {t('credit.customAmount', 'Custom Amount (EGP)')}
                    </Label>
                    <Input
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      type="number"
                      className="w-full bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-xs font-[family-name:var(--font-geist-mono)] tabular-nums outline-none focus:border-[#2563EB]/30 transition-colors"
                    />
                  </TextField>
                )}

                {/* ─── Actions ──────────────────────────── */}
                <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <Button
                    onPress={() => handleApprove(requestedLimit)}
                    className="rounded-md bg-[#2563EB] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
                  >
                    {t('credit.approveRequested', 'Approve Requested')}
                  </Button>
                  <Button
                    onPress={() => {
                      if (showCustomAmount && customAmount) {
                        handleApprove(Number(customAmount))
                      } else {
                        setShowCustomAmount(true)
                      }
                    }}
                    className="rounded-md border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {t('credit.approveDifferent', 'Different Amount')}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    onPress={close}
                    className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/[0.05] transition-colors"
                  >
                    {t('credit.deny', 'Deny')}
                  </Button>
                  <Button
                    onPress={close}
                    className="rounded-md px-3 py-1.5 text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {t('credit.defer', 'Defer')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
