import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useWarehouseStore } from '../../stores/warehouse'
import type { WarehouseTab } from '../../types/warehouse'

const TAB_BY_NUMBER: Record<string, WarehouseTab> = {
  '1': 'receiving',
  '2': 'putaway',
  '3': 'picking',
  '4': 'staging',
  '5': 'count',
  '6': 'lookup',
  '7': 'yard',
  '8': 'home',
  '9': 'home', // Alerts -> home with alerts section
}

/**
 * Warehouse-specific keyboard shortcuts.
 * Only active when warehouse module is open.
 *
 * 1-9 - Navigate to warehouse tiles (per spec section 4.1)
 * G then R - Go to Receiving
 * G then P - Go to Picking
 * G then C - Go to Cycle Count
 * G then Y - Go to Yard
 * Escape - Clear selection
 * ? - Show shortcuts help
 */
export function WarehouseShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab)
  const selectedReceivingId = useWarehouseStore((s) => s.selectedReceivingId)
  const setSelectedReceivingId = useWarehouseStore((s) => s.setSelectedReceivingId)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'warehouse' && scope === 'panel'

  // Number keys for tile navigation
  for (const [key, tab] of Object.entries(TAB_BY_NUMBER)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(key, () => setActiveTab(tab), { enabled: isActive })
  }

  // G prefix for Go-to shortcuts
  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('r', () => {
    if (gPrefix) {
      setActiveTab('receiving')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('p', () => {
    if (gPrefix) {
      setActiveTab('picking')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('c', () => {
    if (gPrefix) {
      setActiveTab('count')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('y', () => {
    if (gPrefix) {
      setActiveTab('yard')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // Escape - clear selection
  useShortcut('Escape', () => {
    if (selectedReceivingId) {
      setSelectedReceivingId(null)
    }
  }, { enabled: isActive && !!selectedReceivingId })

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
            className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { keys: '1', action: 'Receiving' },
            { keys: '2', action: 'Putaway' },
            { keys: '3', action: 'Picking' },
            { keys: '4', action: 'Staging/Load' },
            { keys: '5', action: 'Cycle Count' },
            { keys: '6', action: 'Lookup' },
            { keys: '7', action: 'Yard' },
            { keys: 'G R', action: 'Go to Receiving' },
            { keys: 'G P', action: 'Go to Picking' },
            { keys: 'G C', action: 'Go to Cycle Count' },
            { keys: 'G Y', action: 'Go to Yard' },
            { keys: 'Esc', action: 'Clear selection' },
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
