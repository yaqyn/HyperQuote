import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ApprovalItem } from '../../types/approval'
import { ApprovalActions } from './ApprovalActions'

// ============================================================================
// Type labels
// ============================================================================

const TYPE_LABELS: Record<ApprovalItem['type'], string> = {
  credit_limit: 'Credit Limit Increase',
  margin_override: 'Margin Override',
  write_off: 'Write-Off Approval',
  supplier_onboard: 'Supplier Onboarding',
  expense: 'Expense Approval',
}

// ============================================================================
// Supporting data formatting
// ============================================================================

function isNumericValue(value: unknown): value is number {
  return typeof value === 'number'
}

function formatSupportingKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/(\d+)/g, ' $1')
    .trim()
}

function formatSupportingValue(value: unknown): { text: string; isNumeric: boolean } {
  if (isNumericValue(value)) {
    if (value > 1000) {
      return {
        text: `EGP ${new Intl.NumberFormat('en-US').format(value)}`,
        isNumeric: true,
      }
    }
    return { text: String(value), isNumeric: true }
  }
  if (typeof value === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return {
        text: new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        isNumeric: false,
      }
    }
    return { text: value, isNumeric: false }
  }
  return { text: String(value), isNumeric: false }
}

// ============================================================================
// Component
// ============================================================================

interface ApprovalDetailProps {
  approval: ApprovalItem
  onBack: () => void
}

export function ApprovalDetail({ approval, onBack }: ApprovalDetailProps) {
  const hasValueComparison =
    approval.currentValue != null && approval.proposedValue != null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-6">
        {/* Back + header */}
        <div className="mb-6 flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 flex-shrink-0 rounded-md p-1 text-[var(--color-text)] outline-none transition-colors hover:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)]"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {TYPE_LABELS[approval.type]}
            </h1>
            <p className="text-[var(--color-text-muted)]">
              Requested by{' '}
              <span className="text-[var(--color-text)]">
                {approval.requestedBy}
              </span>
            </p>
            <p className="font-mono text-sm text-[var(--color-text-muted)]">
              {new Date(approval.requestedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Entity */}
        <div className="mb-6">
          <p className="text-lg font-medium text-[var(--color-text)]">
            {approval.entityName}
          </p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            {approval.description}
          </p>
        </div>

        {/* Amount / value comparison */}
        {hasValueComparison && (
          <div className="mb-6 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Current
              </span>
              <span className="font-mono text-lg font-medium text-[var(--color-text)]">
                EGP{' '}
                {new Intl.NumberFormat('en-US').format(approval.currentValue!)}
              </span>
            </div>
            <ArrowRight
              size={16}
              className="mt-4 text-[var(--color-text-muted)]"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Proposed
              </span>
              <span className="font-mono text-lg font-medium text-[var(--color-text)]">
                EGP{' '}
                {new Intl.NumberFormat('en-US').format(approval.proposedValue!)}
              </span>
            </div>
          </div>
        )}

        {approval.amount != null && !hasValueComparison && (
          <div className="mb-6">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Amount
            </span>
            <p className="font-mono text-xl font-medium text-[var(--color-text)]">
              EGP {new Intl.NumberFormat('en-US').format(approval.amount)}
            </p>
          </div>
        )}

        {/* Warning indicators */}
        {approval.warningIndicators.length > 0 && (
          <div className="mb-6 flex flex-col gap-2">
            {approval.warningIndicators.map((warning) => (
              <p
                key={warning}
                className="text-sm font-medium text-[var(--color-error)]"
              >
                {warning}
              </p>
            ))}
          </div>
        )}

        {/* Supporting data */}
        {Object.keys(approval.supportingData).length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Supporting Data
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(approval.supportingData).map(([key, value]) => {
                const formatted = formatSupportingValue(value)
                return (
                  <div
                    key={key}
                    className="flex items-baseline justify-between"
                  >
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">
                      {formatSupportingKey(key)}
                    </span>
                    <span
                      className={
                        formatted.isNumeric
                          ? 'font-mono font-medium text-[var(--color-text)]'
                          : 'text-[var(--color-text)]'
                      }
                    >
                      {formatted.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <ApprovalActions approvalId={approval.id} />
      </div>
    </div>
  )
}
