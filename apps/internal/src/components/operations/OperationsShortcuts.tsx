import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useOperationsStore } from '../../stores/operations'
import type { OperationsTab } from '../../types/operations'

const TAB_BY_NUMBER: Record<string, OperationsTab> = {
  '1': 'dashboard',
  '2': 'kanban',
  '3': 'order-detail',
  '4': 'delivery-schedule',
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
          <Button
            onPress={() => setShowHelp(false)}
            className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { keys: '1', action: 'Dashboard' },
            { keys: '2', action: 'Kanban' },
            { keys: '3', action: 'Order Detail' },
            { keys: '4', action: 'Delivery Schedule' },
            { keys: 'Esc', action: 'Clear order selection' },
            { keys: '?', action: 'Toggle this help' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between">
              <span className="text-sm text-black/60 dark:text-white/60">{shortcut.action}</span>
              <kbd className="rounded border border-black/10 bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs dark:border-white/10 dark:bg-white/5">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
