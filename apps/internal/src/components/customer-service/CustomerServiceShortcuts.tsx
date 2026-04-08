import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useCustomerServiceStore } from '../../stores/customer-service'

/**
 * Customer Service keyboard shortcuts.
 * G W -> WhatsApp | G T -> Tickets | G R -> Returns | N -> New ticket | ? -> Help
 */
export function CustomerServiceShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useCustomerServiceStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'customer-service' && scope === 'panel'

  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('w', () => {
    if (gPrefix) {
      setActiveTab('conversations')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('t', () => {
    if (gPrefix) {
      setActiveTab('conversations')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('r', () => {
    if (gPrefix) {
      // Returns merged into conversations as a channel filter
      setActiveTab('conversations')
      useCustomerServiceStore.getState().setChannelFilter('returns')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('c', () => {
    if (gPrefix) {
      setActiveTab('claims')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('n', () => {
    if (!gPrefix) {
      useCustomerServiceStore.getState().setCreateTicketOpen(true)
    }
  }, { enabled: isActive && !gPrefix })

  useShortcut('?', () => {
    setShowHelp((prev: boolean) => !prev)
  }, { enabled: isActive })

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white/90 p-6 shadow-2xl backdrop-blur-2xl dark:bg-black/90">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Keyboard Shortcuts</h3>
          <Button
            onPress={() => setShowHelp(false)}
            className="rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { keys: 'G W', action: 'Conversations' },
            { keys: 'G T', action: 'Conversations' },
            { keys: 'G C', action: 'Claims' },
            { keys: 'G R', action: 'Returns (filter)' },
            { keys: 'N', action: 'New Ticket' },
            { keys: '?', action: 'Toggle this help' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">{shortcut.action}</span>
              <kbd className="rounded border border-[var(--color-border)] bg-black/[0.03] dark:bg-white/[0.03] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--color-text)]">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
