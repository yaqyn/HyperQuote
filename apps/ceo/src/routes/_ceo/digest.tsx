import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getCEODigest } from '../../lib/server/digest'

const digestSearchSchema = z.object({
  date: z.string().optional(),
})

export const Route = createFileRoute('/_ceo/digest')({
  validateSearch: digestSearchSchema,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: ({ deps }) => {
    const date = deps.date || new Date().toISOString().slice(0, 10)
    return getCEODigest({ data: { date } })
  },
  component: DigestPage,
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function DigestPage() {
  const digest = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          aria-label="Go back"
        >
          &larr;
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Daily Digest
          </h1>
          <p className="font-mono text-lg text-[var(--color-text)]">
            {digest.date}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {/* Sent note */}
          <p className="text-xs text-[var(--color-text-muted)]">
            Sent via email at 7:00 AM
          </p>

          {/* Revenue */}
          <Section title="Revenue">
            <Row label="Yesterday" value={formatCurrency(digest.revenue.yesterday)} />
            <Row label="Daily Target" value={formatCurrency(digest.revenue.target)} />
            <Row label="MTD" value={formatCurrency(digest.revenue.mtd)} />
            <Row label="MTD Target" value={formatCurrency(digest.revenue.mtdTarget)} />
          </Section>

          {/* Pipeline */}
          <Section title="Pipeline">
            <Row label="Total Value" value={formatCurrency(digest.pipeline.totalValue)} />
            <Row label="New Quotes" value={String(digest.pipeline.newQuotes)} mono />
            <Row label="Expiring" value={String(digest.pipeline.quotesExpiring)} mono />
          </Section>

          {/* Cash */}
          <Section title="Cash">
            <Row label="Balance" value={formatCurrency(digest.cash.balance)} />
            <Row label="Inflow" value={formatCurrency(digest.cash.inflow)} />
            <Row label="Outflow" value={formatCurrency(digest.cash.outflow)} />
          </Section>

          {/* AR Aging */}
          <Section title="AR Aging">
            <Row label="Current" value={formatCurrency(digest.arAging.current)} />
            <Row label="30 Days" value={formatCurrency(digest.arAging.overdue30)} />
            <Row label="60 Days" value={formatCurrency(digest.arAging.overdue60)} />
            <Row label="90+ Days" value={formatCurrency(digest.arAging.overdue90Plus)} />
          </Section>

          {/* Delivery Performance */}
          <Section title="Delivery Performance">
            <Row label="Completed" value={String(digest.deliveryPerformance.completed)} mono />
            <Row label="Failed" value={String(digest.deliveryPerformance.failed)} mono />
            <Row label="On-time Rate" value={`${digest.deliveryPerformance.onTimeRate}%`} mono />
          </Section>

          {/* Supplier Updates */}
          <Section title="Supplier Updates">
            {digest.supplierUpdates.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">No updates</p>
            ) : (
              <ul className="space-y-1">
                {digest.supplierUpdates.map((update, i) => (
                  <li key={i} className="text-sm text-[var(--color-text)]">
                    {update}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* HR */}
          <Section title="HR">
            <Row label="Attendance" value={String(digest.hr.attendance)} mono />
            <Row label="On Leave" value={String(digest.hr.onLeave)} mono />
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  // Currency values (starting with EGP) always use mono
  const isCurrency = value.startsWith('EGP')
  const useMono = mono || isCurrency

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-text)]">{label}</span>
      <span
        className={`text-sm font-medium text-[var(--color-text)] ${useMono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
