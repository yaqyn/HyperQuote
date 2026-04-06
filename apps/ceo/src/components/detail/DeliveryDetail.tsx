import type { Delivery } from '../../types/entity'
import { DetailView } from './DetailView'
import { DetailSection } from './DetailSection'

interface DeliveryDetailProps {
  data: Delivery
  onBack: () => void
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'delivered':
      return 'var(--color-success)'
    case 'in transit':
      return 'var(--color-text-muted)'
    case 'failed':
      return 'var(--color-error)'
    default:
      return 'var(--color-text-muted)'
  }
}

export function DeliveryDetail({ data, onBack }: DeliveryDetailProps) {
  return (
    <DetailView
      title={`Delivery ${data.id.toUpperCase()}`}
      subtitle={`Order: ${data.orderRef} | Customer: ${data.customer}`}
      onBack={onBack}
      deepLinkUrl={`https://app.hyperquote.net/logistics/delivery/${data.id}`}
      deepLinkLabel="View full details in Logistics"
      actions={
        <>
          <button
            type="button"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            View delivery note PDF
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
      {/* Status + Driver + Vehicle */}
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">Status:</span>
          <span className="font-medium" style={{ color: getStatusColor(data.status) }}>
            {data.status}
          </span>
        </div>
        <span className="text-[var(--color-text)]">Driver: {data.driver}</span>
        <span className="text-[var(--color-text)]">Vehicle: {data.vehicle}</span>
      </div>

      {/* Timeline */}
      <DetailSection label="Timeline">
        <div className="flex flex-col gap-2">
          {data.timeline.map((entry, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 font-mono text-[var(--color-text-muted)]">
                {entry.time}
              </span>
              <span className="text-[var(--color-text)]">{entry.description}</span>
            </div>
          ))}
        </div>
      </DetailSection>

      {/* Items delivered */}
      <DetailSection label="Items delivered">
        <div className="flex flex-col gap-1.5">
          {data.itemsDelivered.map((item, i) => {
            const isShort = item.delivered < item.expected
            return (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="flex-shrink-0 font-mono"
                  style={{
                    color: isShort ? 'var(--color-warning)' : 'var(--color-text)',
                  }}
                >
                  {item.delivered}/{item.expected}
                </span>
                <span className="text-[var(--color-text)]">
                  {item.description}
                  {item.note && (
                    <span className="text-[var(--color-warning)]"> ({item.note})</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </DetailSection>

      {/* POD */}
      <DetailSection label="POD">
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text)]">
            Signed by: {data.pod.signedBy}
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text)]">
              Photos: <span className="font-mono">{data.pod.photoCount}</span>
            </span>
            <button
              type="button"
              className="font-medium text-[var(--color-text)]"
            >
              View
            </button>
          </div>
          <span className="text-[var(--color-text-muted)]">
            Condition: {data.pod.condition}
          </span>
        </div>
      </DetailSection>
    </DetailView>
  )
}
