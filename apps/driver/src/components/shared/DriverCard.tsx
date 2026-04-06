import type { ReactNode } from 'react'

interface DriverCardProps {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export function DriverCard({
  header,
  footer,
  children,
  className = '',
}: DriverCardProps) {
  return (
    <div
      className={`
        rounded-2xl bg-[var(--bg-primary)] p-4 shadow-sm
        border border-[var(--border-color)]
        ${className}
      `.trim()}
    >
      {header && (
        <div className="mb-3 border-b border-[var(--border-color)] pb-3">
          {header}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-3 border-t border-[var(--border-color)] pt-3">
          {footer}
        </div>
      )}
    </div>
  )
}
