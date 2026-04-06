import type { CEOOrder } from '../../types/entity'
import { DetailView } from './DetailView'
import { DetailSection } from './DetailSection'

interface OrderDetailProps {
  data: CEOOrder
  onBack: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'delivered':
      return 'var(--color-success)'
    case 'partial':
      return 'var(--color-warning)'
    case 'overdue':
    case 'failed':
      return 'var(--color-error)'
    default:
      return 'var(--color-text-muted)'
  }
}

export function OrderDetail({ data, onBack }: OrderDetailProps) {
  return (
    <DetailView
      title={`Order ${data.reference}`}
      subtitle={data.customer}
      onBack={onBack}
      deepLinkUrl={`https://app.hyperquote.net/orders/order/${data.id}`}
      deepLinkLabel="View full details in Orders"
      actions={
        <>
          <button
            type="button"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Route to Finance
          </button>
          <button
            type="button"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Route to Operations
          </button>
        </>
      }
    >
      {/* Date + Status */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[var(--color-text-muted)]">
          Created: <span className="font-mono">{formatDate(data.createdDate)}</span>
        </span>
        <span className="text-[var(--color-text-muted)]">|</span>
        <span style={{ color: getStatusColor(data.status) }}>
          {data.status}
        </span>
      </div>

      {/* Items */}
      <DetailSection label="Items">
        <div className="flex flex-col gap-1.5">
          {data.items.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="font-mono text-[var(--color-text)]">
                {item.quantity}x
              </span>
              <span className="text-[var(--color-text)]">{item.description}</span>
            </div>
          ))}
        </div>
      </DetailSection>

      {/* Financial */}
      <DetailSection label="Financial">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Order value</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {formatCurrency(data.financial.value)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Margin</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {data.financial.margin}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Invoice</span>
            <span className="font-mono text-[var(--color-text)]">
              {data.financial.invoiceRef}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Payment status</span>
            <span
              className="font-mono font-medium"
              style={{ color: getStatusColor(data.financial.paymentStatus) }}
            >
              {data.financial.paymentStatus}
            </span>
          </div>
          {data.financial.outstanding > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Outstanding</span>
              <span className="font-mono font-medium text-[var(--color-text)]">
                {formatCurrency(data.financial.outstanding)}{' '}
                <span className="text-[var(--color-text-muted)]">
                  (due {formatDate(data.financial.dueDate)})
                </span>
              </span>
            </div>
          )}
        </div>
      </DetailSection>

      {/* Delivery */}
      <DetailSection label="Delivery">
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text)]">
            Delivered: <span className="font-mono">{formatDate(data.delivery.date)}</span>
          </span>
          <span className="text-[var(--color-text)]">
            Driver: {data.delivery.driver}
          </span>
          <span className="text-[var(--color-text)]">
            POD: {data.delivery.pod}
          </span>
          <span className="text-[var(--color-text)]">
            Delivery note: <span className="font-mono">{data.delivery.deliveryNoteRef}</span>
          </span>
        </div>
      </DetailSection>

      {/* Timeline */}
      <DetailSection label="Timeline">
        <div className="flex flex-col gap-2">
          {data.timeline.map((entry, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 font-mono text-[var(--color-text-muted)]">
                {formatDate(entry.date)}
              </span>
              <span className="text-[var(--color-text)]">{entry.description}</span>
            </div>
          ))}
        </div>
      </DetailSection>
    </DetailView>
  )
}
