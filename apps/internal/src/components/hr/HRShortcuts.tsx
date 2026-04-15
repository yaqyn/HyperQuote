import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useHRStore } from '../../stores/hr'

/**
 * HR keyboard shortcuts.
 * G E -> Employees | G C -> Compliance | G L -> Leave | G A -> Attendance | ? -> Help
 */
export function HRShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useHRStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'hr' && scope === 'panel'

  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('e', () => {
    if (gPrefix) {
      setActiveTab('people')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('t', () => {
    if (gPrefix) {
      setActiveTab('time')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('?', () => {
    setShowHelp((prev: boolean) => !prev)
  }, { enabled: isActive })

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white/90 p-6 shadow-2xl dark:bg-black/90">
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
            { keys: 'G E', action: 'People' },
            { keys: 'G T', action: 'Time' },
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
