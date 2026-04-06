import { useTranslation } from 'react-i18next'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'

interface Approver {
  role: string
  name: string
  status: ApprovalStatus
}

interface CreditApprovalChainProps {
  /** Percentage increase of credit limit */
  increasePercent: number
  /** Absolute new limit amount */
  newLimit: number
  /** Override approvers for display (mock defaults used otherwise) */
  approvers?: Approver[]
}

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50',
  approved: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400',
}

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

/**
 * Determine required approvers based on % increase and absolute limit.
 * <20%: Finance Manager only
 * 20-50%: Finance Manager + CFO
 * >50% or >EGP 50M: Finance Manager + CFO + CEO
 */
function getRequiredApprovers(increasePercent: number, newLimit: number): Approver[] {
  const fm: Approver = { role: 'Finance Manager', name: 'Ahmed Hassan', status: 'pending' }
  const cfo: Approver = { role: 'CFO', name: 'Omar Farouk', status: 'pending' }
  const ceo: Approver = { role: 'CEO', name: 'Tarek El-Said', status: 'pending' }

  if (increasePercent > 50 || newLimit > 50_000_000) {
    return [fm, cfo, ceo]
  }
  if (increasePercent >= 20) {
    return [fm, cfo]
  }
  return [fm]
}

/**
 * Approval chain display: horizontal chain of approver circles connected by lines.
 * Shows required approvers based on % increase thresholds.
 * Status: pending=gray, approved=green, rejected=red.
 */
export function CreditApprovalChain({
  increasePercent,
  newLimit,
  approvers: overrideApprovers,
}: CreditApprovalChainProps) {
  const { t } = useTranslation('finance')
  const approvers = overrideApprovers ?? getRequiredApprovers(increasePercent, newLimit)

  const allApproved = approvers.every((a) => a.status === 'approved')

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          {t('credit.approvalChain', 'Approval Chain')}
        </h4>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
          {t('credit.approvalRequired', 'Approval Required')}
        </span>
      </div>

      {/* Threshold info */}
      <div className="text-xs text-black/50 dark:text-white/50">
        {increasePercent < 20 && t('credit.thresholdFM', 'Increase <20%: Finance Manager only')}
        {increasePercent >= 20 && increasePercent <= 50 && newLimit <= 50_000_000 &&
          t('credit.thresholdFMCFO', 'Increase 20-50%: Finance Manager + CFO')}
        {(increasePercent > 50 || newLimit > 50_000_000) &&
          t('credit.thresholdFMCFOCEO', 'Increase >50% or >EGP 50M: Finance Manager + CFO + CEO')}
      </div>

      {/* Horizontal chain */}
      <div className="flex items-center justify-center gap-0">
        {approvers.map((approver, i) => (
          <div key={approver.role} className="flex items-center">
            {/* Approver circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-semibold ${STATUS_COLORS[approver.status]}`}
              >
                {approver.role
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </div>
              <div className="text-center">
                <div className="text-xs font-medium">{approver.role}</div>
                <div className="text-[10px] text-black/40 dark:text-white/40">{approver.name}</div>
                <div
                  className={`text-[10px] font-medium ${
                    approver.status === 'approved'
                      ? 'text-green-600 dark:text-green-400'
                      : approver.status === 'rejected'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-black/40 dark:text-white/40'
                  }`}
                >
                  {t(`credit.status.${approver.status}`, STATUS_LABELS[approver.status])}
                </div>
              </div>
            </div>

            {/* Connector line */}
            {i < approvers.length - 1 && (
              <div className="w-8 h-0.5 bg-black/10 dark:bg-white/10 mx-2 mt-[-24px]" />
            )}
          </div>
        ))}
      </div>

      {/* All approved message */}
      {allApproved && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-700 dark:text-green-400 text-center">
          {t(
            'credit.allApproved',
            'All approvals received. Customer record updated and held orders released.',
          )}
        </div>
      )}
    </div>
  )
}
