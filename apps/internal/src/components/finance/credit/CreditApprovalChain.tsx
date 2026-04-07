import { useTranslation } from 'react-i18next'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'

interface Approver {
  role: string
  name: string
  status: ApprovalStatus
}

interface CreditApprovalChainProps {
  increasePercent: number
  newLimit: number
  approvers?: Approver[]
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

  if (increasePercent > 50 || newLimit > 50_000_000) return [fm, cfo, ceo]
  if (increasePercent >= 20) return [fm, cfo]
  return [fm]
}

const STATUS_DOT: Record<ApprovalStatus, string> = {
  pending: 'bg-black/15 dark:bg-white/15',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
}

const STATUS_RING: Record<ApprovalStatus, string> = {
  pending: 'border-black/10 dark:border-white/10',
  approved: 'border-green-500/40',
  rejected: 'border-red-500/40',
}

/**
 * Horizontal approval flow: dots connected by line, each approver as initials circle + status.
 * Minimal, Swiss typography.
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
          {t('credit.approvalChain', 'Approval Chain')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-yellow-500" />
          <span className="text-[10px] text-black/30 dark:text-white/30">
            {t('credit.approvalRequired', 'Required')}
          </span>
        </div>
      </div>

      {/* Threshold info */}
      <div className="text-[11px] text-black/30 dark:text-white/30">
        {increasePercent < 20 && t('credit.thresholdFM', 'Increase <20%: Finance Manager only')}
        {increasePercent >= 20 && increasePercent <= 50 && newLimit <= 50_000_000 &&
          t('credit.thresholdFMCFO', 'Increase 20-50%: Finance Manager + CFO')}
        {(increasePercent > 50 || newLimit > 50_000_000) &&
          t('credit.thresholdFMCFOCEO', 'Increase >50% or >EGP 50M: FM + CFO + CEO')}
      </div>

      {/* Horizontal chain */}
      <div className="flex items-start justify-center gap-0 py-2">
        {approvers.map((approver, i) => (
          <div key={approver.role} className="flex items-start">
            {/* Approver node */}
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div
                className={`size-10 rounded-full border-2 ${STATUS_RING[approver.status]} flex items-center justify-center`}
              >
                <span className="text-xs font-medium text-black/50 dark:text-white/50">
                  {approver.role.split(' ').map((w) => w[0]).join('')}
                </span>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-black/60 dark:text-white/60">
                  {approver.role}
                </div>
                <div className="text-[9px] text-black/25 dark:text-white/25">
                  {approver.name}
                </div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`size-1 rounded-full ${STATUS_DOT[approver.status]}`} />
                  <span className={`text-[9px] ${
                    approver.status === 'approved'
                      ? 'text-green-600 dark:text-green-400'
                      : approver.status === 'rejected'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-black/25 dark:text-white/25'
                  }`}>
                    {approver.status.charAt(0).toUpperCase() + approver.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Connector */}
            {i < approvers.length - 1 && (
              <div className="w-8 h-px bg-black/[0.08] dark:bg-white/[0.08] mt-5" />
            )}
          </div>
        ))}
      </div>

      {/* All approved */}
      {allApproved && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-green-500/[0.05] border border-green-500/10">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-[11px] text-green-700 dark:text-green-400">
            {t(
              'credit.allApproved',
              'All approvals received. Record updated, held orders released.',
            )}
          </span>
        </div>
      )}
    </div>
  )
}
