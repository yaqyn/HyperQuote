import type { ReactNode } from 'react'

interface DetailSectionProps {
  label: string
  children: ReactNode
}

export function DetailSection({ label, children }: DetailSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </h3>
      <div>{children}</div>
    </div>
  )
}
