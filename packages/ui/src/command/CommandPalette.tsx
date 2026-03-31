import type { ReactNode } from 'react'
import { GlassElevated } from '../glass/GlassElevated'
import { cn } from '../utils/cn'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * Command palette shell (Ctrl+K / Cmd+K overlay).
 * SHELL ONLY: No search logic -- consuming app handles hotkey binding and search.
 * Uses GlassElevated for the panel. Max-width 600px, centered.
 */
export function CommandPalette({ isOpen, onClose, children, className }: CommandPaletteProps) {
  return (
    <GlassElevated isOpen={isOpen} onClose={onClose} className={cn('max-w-[600px] w-full', className)}>
      <div className="flex flex-col">
        {/* Search input area */}
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <input
            type="text"
            placeholder="..."
            className="w-full bg-transparent text-[var(--color-text)] text-[var(--text-base)] outline-none placeholder:text-[var(--color-text-subtle)]"
            autoFocus
          />
        </div>
        {/* Results area */}
        <div className="px-2 py-2 max-h-[400px] overflow-auto">
          {children}
        </div>
      </div>
    </GlassElevated>
  )
}
