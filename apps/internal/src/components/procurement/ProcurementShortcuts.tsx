import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useProcurementStore } from '../../stores/procurement'

/**
 * Procurement-specific keyboard shortcuts (CONTEXT.md Section 2.7).
 * Only active when procurement module is open.
 *
 * N        - New Supplier Inquiry
 * G then I - Go to Inquiries
 * G then P - Go to PO List
 * G then S - Go to Supplier Directory
 * /        - Focus search within Procurement
 * ?        - Show shortcuts help
 */
export function ProcurementShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useProcurementStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'procurement' && scope === 'panel'

  // N - New Supplier Inquiry (navigate to inquiries tab)
  useShortcut('n', () => {
    if (gPrefix) { setGPrefix(false); return }
    setActiveTab('inquiries')
  }, { enabled: isActive })

  // G prefix - start sequence
  useShortcut('g', () => {
    setGPrefix(true)
    // Auto-clear after 1 second if no follow-up
    setTimeout(() => setGPrefix(false), 1000)
  }, { enabled: isActive && !gPrefix })

  // G then I - Go to Inquiries
  useShortcut('i', () => {
    if (gPrefix) {
      setActiveTab('inquiries')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then P - Go to PO List
  useShortcut('p', () => {
    if (gPrefix) {
      setActiveTab('po-management')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then S - Go to Supplier Directory
  useShortcut('s', () => {
    if (gPrefix) {
      setActiveTab('directory')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // / - Focus search
  useShortcut('/', () => {
    if (gPrefix) { setGPrefix(false); return }
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[type="text"][placeholder*="earch"], input[type="search"]'
    )
    searchInput?.focus()
  }, { enabled: isActive })

  // ? - Show shortcuts help
  useShortcut('?', () => {
    if (gPrefix) { setGPrefix(false); return }
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
            { keys: 'N', action: 'New Supplier Inquiry' },
            { keys: 'G then I', action: 'Go to Inquiries' },
            { keys: 'G then P', action: 'Go to PO Management' },
            { keys: 'G then S', action: 'Go to Supplier Directory' },
            { keys: '/', action: 'Focus search' },
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
