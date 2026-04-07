interface RFQPriorityBadgeProps {
  score: number
}

function getLevel(score: number): { label: string; className: string } {
  if (score > 75) return { label: '!!!', className: 'text-red-600' }
  if (score > 50) return { label: '!!', className: 'text-yellow-600' }
  if (score > 25) return { label: '!', className: 'text-[var(--color-text-muted)]' }
  return { label: '', className: '' }
}

export function RFQPriorityBadge({ score }: RFQPriorityBadgeProps) {
  const { label, className } = getLevel(score)

  if (!label) return <span className="inline-block w-6" />

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] text-[11px] font-bold tabular-nums ${className}`}
      title={`Priority: ${score}`}
    >
      {label}
    </span>
  )
}
