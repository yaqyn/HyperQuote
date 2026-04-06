import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useFinanceStore } from '../../stores/finance'
import type { FinanceTab } from '../../types/finance'

/**
 * Finance-specific keyboard shortcuts.
 * Only active when finance module is open.
 *
 * G then I - Go to Invoicing
 * G then A - Go to AR
 * G then P - Go to AP
 * G then C - Go to Credit
 * N - Record New Payment
 * ? - Show shortcuts help
 */
export function FinanceShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'finance' && scope === 'panel'

  // G prefix for Go-to shortcuts
  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('i', () => {
    if (gPrefix) {
      setActiveTab('invoicing')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('a', () => {
    if (gPrefix) {
      setActiveTab('ar')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('p', () => {
    if (gPrefix) {
      setActiveTab('ap')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('c', () => {
    if (gPrefix) {
      setActiveTab('credit')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // N - Record New Payment
  useShortcut('n', () => {
    setActiveTab('payments')
    setPaymentFlowStep('select_method')
  }, { enabled: isActive && !gPrefix })

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
            { keys: 'G I', action: 'Go to Invoicing' },
            { keys: 'G A', action: 'Go to AR' },
            { keys: 'G P', action: 'Go to AP' },
            { keys: 'G C', action: 'Go to Credit' },
            { keys: 'N', action: 'Record New Payment' },
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
