import type { Employee } from '../../types/entity'
import { DetailView } from './DetailView'
import { DetailSection } from './DetailSection'

interface EmployeeDetailProps {
  data: Employee
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

export function EmployeeDetail({ data, onBack }: EmployeeDetailProps) {
  return (
    <DetailView
      title={data.name}
      subtitle={`${data.role} -- ${data.department}`}
      onBack={onBack}
      deepLinkUrl={`https://app.hyperquote.net/hr/employee/${data.id}`}
      deepLinkLabel="View full profile in HR"
    >
      {/* Joined date */}
      <p className="text-sm text-[var(--color-text-muted)]">
        Joined: <span className="font-mono">{formatDate(data.joinedDate)}</span>
      </p>

      {/* Contact */}
      <DetailSection label="Contact">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text)]">
              Phone: <span className="font-mono">{data.phone}</span>
            </span>
            <a
              href={`tel:${data.phone.replace(/\s/g, '')}`}
              className="text-sm font-medium text-[var(--color-text)]"
            >
              Call
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text)]">{data.email}</span>
            <a
              href={`mailto:${data.email}`}
              className="text-sm font-medium text-[var(--color-text)]"
            >
              Email
            </a>
          </div>
        </div>
      </DetailSection>

      {/* Quick stats */}
      <DetailSection label="Quick stats">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Active quotes</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {data.stats.activeQuotes}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Pipeline value</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {formatCurrency(data.stats.pipelineValue)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Win rate (90d)</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {data.stats.winRate}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Avg margin</span>
            <span className="font-mono font-medium text-[var(--color-text)]">
              {data.stats.avgMargin}%
            </span>
          </div>
        </div>
      </DetailSection>

      {/* Recent activity */}
      <DetailSection label="Recent activity">
        <div className="flex flex-col gap-2">
          {data.recentActivity.map((entry, i) => (
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
