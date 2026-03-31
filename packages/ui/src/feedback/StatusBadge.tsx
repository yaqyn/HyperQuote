import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

const statusColors = {
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  neutral: 'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
} as const

interface StatusBadgeProps {
  status: keyof typeof statusColors
  children: ReactNode
  className?: string
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        statusColors[status],
        className,
      )}
    >
      {children}
    </span>
  )
}
