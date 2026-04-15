import { useState } from 'react'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useFinanceStore } from '../../stores/finance'
import type { FinanceTab } from '../../types/finance'

const SHORTCUTS = [
  { keys: 'G R', action: 'Go to Receivables' },
  { keys: 'G P', action: 'Go to Payables' },
  { keys: 'G B', action: 'Go to Bank Recon' },
  { keys: 'N', action: 'Record New Payment' },
  { keys: '?', action: 'Toggle this help' },
]

/**
 * Finance-specific keyboard shortcuts.
 * Only active when finance module is open.
 *
 * G then R - Go to Receivables
 * G then P - Go to Payables
 * G then B - Go to Bank Recon
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

  useShortcut('r', () => {
    if (gPrefix) {
      setActiveTab('receivables')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('p', () => {
    if (gPrefix) {
      setActiveTab('payables')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('b', () => {
    if (gPrefix) {
      setActiveTab('recon')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // N - Record New Payment (jumps to payables tab)
  useShortcut('n', () => {
    setActiveTab('payables')
    setPaymentFlowStep('select_method')
  }, { enabled: isActive && !gPrefix })

  // ? - Show shortcuts help
  useShortcut('?', () => {
    setShowHelp((prev: boolean) => !prev)
  }, { enabled: isActive })

  return (
    <AnimatePresence>
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-xs rounded-lg border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40">
                Keyboard Shortcuts
              </h3>
              <Button
                onPress={() => setShowHelp(false)}
                className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
              >
                Close
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between">
                  <span className="text-sm text-black/60 dark:text-white/60">
                    {shortcut.action}
                  </span>
                  <kbd className="font-[family-name:var(--font-geist-mono)] text-xs text-black/50 dark:text-white/50">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
