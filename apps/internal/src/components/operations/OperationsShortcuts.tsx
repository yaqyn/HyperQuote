import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useOperationsStore } from '../../stores/operations'
import type { OperationsTab } from '../../types/operations'

const TAB_BY_NUMBER: Record<string, OperationsTab> = {
  '1': 'operations',
}

/**
 * Operations-specific keyboard shortcuts.
 * Only active when operations module is open.
 *
 * 1 - Dashboard
 * 2 - Kanban
 * 3 - Order Detail
 * 4 - Delivery Schedule
 * Escape - Clear order selection
 * ? - Show shortcuts help
 */
export function OperationsShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)
  const selectedOrderId = useOperationsStore((s) => s.selectedOrderId)
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)
  const [showHelp, setShowHelp] = useState(false)

  const isActive = activeModule === 'operations' && scope === 'panel'

  // Number keys for tab switching
  for (const [key, tab] of Object.entries(TAB_BY_NUMBER)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(key, () => setActiveTab(tab), { enabled: isActive })
  }

  // Escape - clear order selection
  useShortcut('Escape', () => {
    if (selectedOrderId) {
      setSelectedOrderId(null)
    }
  }, { enabled: isActive && !!selectedOrderId })

  // ? - Show shortcuts help
  useShortcut('?', () => {
    setShowHelp((prev) => !prev)
  }, { enabled: isActive })

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl dark:bg-black/90">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold tracking-tight">Keyboard Shortcuts</h3>
          <Button
            onPress={() => setShowHelp(false)}
            className="rounded-md px-2 py-1 text-[11px] text-black/50 dark:text-white/50 data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/5 outline-none"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { keys: '1', action: 'Operations' },
            { keys: 'Esc', action: 'Clear order selection' },
            { keys: '?', action: 'Toggle this help' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between">
              <span className="text-[13px] text-black/50 dark:text-white/50">{shortcut.action}</span>
              <kbd className="rounded border border-black/8 bg-black/[0.03] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] text-black/60 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/60">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
