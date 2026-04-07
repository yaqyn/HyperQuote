import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useWarehouseStore } from '../../stores/warehouse'
import type { WarehouseTab } from '../../types/warehouse'

const TAB_BY_NUMBER: Record<string, WarehouseTab> = {
  '1': 'inbound',
  '2': 'outbound',
  '3': 'inventory',
  '4': 'yard',
  '5': 'home',
  '6': 'home',
  '7': 'home',
  '8': 'home',
  '9': 'home',
}

/**
 * Warehouse keyboard shortcuts.
 * 1-9 = tab navigation, G+R/P/C/Y = go-to, Esc = clear, ? = help.
 * Help overlay uses elevated glass tier.
 */
export function WarehouseShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab)
  const inboundView = useWarehouseStore((s) => s.inboundView)
  const setInboundView = useWarehouseStore((s) => s.setInboundView)
  const setActiveDeliveryId = useWarehouseStore((s) => s.setActiveDeliveryId)
  const outboundView = useWarehouseStore((s) => s.outboundView)
  const setOutboundView = useWarehouseStore((s) => s.setOutboundView)
  const setActivePickOrderId = useWarehouseStore((s) => s.setActivePickOrderId)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'warehouse' && scope === 'panel'

  // Number keys
  for (const [key, tab] of Object.entries(TAB_BY_NUMBER)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(key, () => setActiveTab(tab), { enabled: isActive })
  }

  // G prefix
  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('r', () => {
    if (gPrefix) {
      setActiveTab('inbound')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('o', () => {
    if (gPrefix) {
      setActiveTab('outbound')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('i', () => {
    if (gPrefix) {
      setActiveTab('inventory')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('y', () => {
    if (gPrefix) {
      setActiveTab('yard')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('Escape', () => {
    // Inbound: back to delivery list
    if (inboundView !== 'list') {
      setInboundView('list')
      setActiveDeliveryId(null)
      return
    }
    // Outbound: back to pick queue
    if (outboundView !== 'queue') {
      setOutboundView('queue')
      setActivePickOrderId(null)
    }
  }, { enabled: isActive && (inboundView !== 'list' || outboundView !== 'queue') })

  useShortcut('?', () => {
    setShowHelp((prev) => !prev)
  }, { enabled: isActive })

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
            Keyboard Shortcuts
          </h3>
          <Button
            onPress={() => setShowHelp(false)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { keys: '1', action: 'Inbound' },
            { keys: '2', action: 'Outbound' },
            { keys: '3', action: 'Inventory' },
            { keys: '4', action: 'Yard' },
            { keys: 'G R', action: 'Go to Inbound' },
            { keys: 'G O', action: 'Go to Outbound' },
            { keys: 'G I', action: 'Go to Inventory' },
            { keys: 'G Y', action: 'Go to Yard' },
            { keys: 'Esc', action: 'Clear selection' },
            { keys: '?', action: 'Toggle this help' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between min-h-[36px]">
              <span className="text-sm text-black/50 dark:text-white/50">{shortcut.action}</span>
              <kbd className="rounded border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-xs text-black/60 dark:text-white/60">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
