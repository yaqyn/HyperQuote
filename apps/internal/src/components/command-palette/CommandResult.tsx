import type { ReactNode } from 'react'

interface CommandResultProps {
  id: string
  type: string
  label: string
  sublabel?: string
  icon: ReactNode
  hotkey?: string
}

/**
 * Single result row in the command palette.
 * Rendered inside a React Aria MenuItem -- hover/focus handled by parent.
 */
export function CommandResult({ type, label, sublabel, icon, hotkey }: CommandResultProps) {
  return (
    <div className="flex items-center gap-3 w-full px-3 py-2">
      <span className="shrink-0 text-[var(--color-text-muted)]">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
        {sublabel && (
          <span className="ms-2 text-xs text-[var(--color-text-muted)]">{sublabel}</span>
        )}
      </div>
      {hotkey && (
        <kbd className="shrink-0 font-[var(--font-mono)] text-xs bg-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">
          {hotkey}
        </kbd>
      )}
      <span className="shrink-0 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded px-1.5 py-0.5">
        {type}
      </span>
    </div>
  )
}
