import type { Customer } from '../../types/entity'
import { DetailView } from './DetailView'
import { DetailSection } from './DetailSection'

interface CustomerDetailProps {
  data: Customer
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

export function CustomerDetail({ data, onBack }: CustomerDetailProps) {
  const utilization = Math.round(
    (data.financial.creditUsed / data.financial.creditLimit) * 100,
  )
  const utilizationColor =
    utilization > 95
      ? 'var(--color-error)'
      : utilization > 80
        ? 'var(--color-warning)'
        : 'var(--color-text-muted)'

  return (
    <DetailView
      title={data.name}
      subtitle={`Customer since ${formatDate(data.customerSince)}`}
      onBack={onBack}
      deepLinkUrl={`https://app.hyperquote.net/crm/customer/${data.id}`}
      deepLinkLabel="View full profile in CRM"
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
            Route to Sales
          </button>
          <a
            href={`tel:${data.primaryContact.phone.replace(/\s/g, '')}`}
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Call Account Manager
          </a>
        </>
      }
    >
      {/* Contact */}
      <DetailSection label="Contact">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text)]">
              Primary: {data.primaryContact.name}
            </span>
            <a
              href={`tel:${data.primaryContact.phone.replace(/\s/g, '')}`}
              className="font-medium text-[var(--color-text)]"
            >
              Call
            </a>
          </div>
          <span className="text-[var(--color-text-muted)]">
            Phone: <span className="font-mono">{data.primaryContact.phone}</span>
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">
              {data.primaryContact.email}
            </span>
            <a
              href={`mailto:${data.primaryContact.email}`}
              className="font-medium text-[var(--color-text)]"
            >
              Email
            </a>
          </div>
          <span className="text-[var(--color-text-muted)]">
            Account manager: {data.accountManager}
          </span>
        </div>
      </DetailSection>

      {/* Financial snapshot */}
      <DetailSection label="Financial snapshot">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Credit limit</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {formatCurrency(data.financial.creditLimit)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Credit used</span>
              <span className="font-mono font-medium" style={{ color: utilizationColor }}>
                {formatCurrency(data.financial.creditUsed)} ({utilization}%)
              </span>
            </div>
            {/* Utilization bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(utilization, 100)}%`,
                  backgroundColor: utilizationColor,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Total AR</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {formatCurrency(data.financial.totalAR)}
            </span>
          </div>

          {data.financial.overdue > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Overdue</span>
              <span className="font-mono font-medium text-[var(--color-error)]">
                {formatCurrency(data.financial.overdue)}
              </span>
            </div>
          )}
        </div>
      </DetailSection>

      {/* Order history */}
      <DetailSection label="Order history (last 6 months)">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Orders</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {data.orderHistory.count}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Total revenue</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {formatCurrency(data.orderHistory.totalRevenue)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Avg order value</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {formatCurrency(data.orderHistory.avgOrderValue)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Avg margin</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {data.orderHistory.avgMargin}%
            </span>
          </div>
        </div>
      </DetailSection>

      {/* Recent orders */}
      <DetailSection label="Recent orders">
        <div className="flex flex-col gap-2">
          {data.recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-[var(--color-text)]">{order.reference}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[var(--color-text)]">
                  {formatCurrency(order.amount)}
                </span>
                <span className="text-[var(--color-text-muted)]">{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </DetailSection>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <DetailSection label="Alerts">
          <div className="flex flex-col gap-2">
            {data.alerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--color-error)]">{alert.description}</span>
                <div className="flex items-center gap-2">
                  {alert.amount != null && (
                    <span className="font-mono text-[var(--color-error)]">
                      {formatCurrency(alert.amount)}
                    </span>
                  )}
                  {alert.date && (
                    <span className="font-mono text-[var(--color-text-muted)]">
                      {formatDate(alert.date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </DetailView>
  )
}
