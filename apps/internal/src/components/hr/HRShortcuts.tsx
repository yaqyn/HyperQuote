import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useHRStore } from '../../stores/hr'

/**
 * HR-specific keyboard shortcuts.
 * Only active when HR module is open.
 *
 * G then E - Employees
 * G then C - Driver Compliance
 * G then L - Leave Management
 * G then A - Attendance
 * ? - Show shortcuts help
 */
export function HRShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useHRStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'hr' && scope === 'panel'

  // G prefix for Go-to shortcuts
  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  // G then E - Employees
  useShortcut('e', () => {
    if (gPrefix) {
      setActiveTab('employees')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then C - Driver Compliance
  useShortcut('c', () => {
    if (gPrefix) {
      setActiveTab('compliance')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then L - Leave Management
  useShortcut('l', () => {
    if (gPrefix) {
      setActiveTab('leave')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then A - Attendance
  useShortcut('a', () => {
    if (gPrefix) {
      setActiveTab('attendance')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // ? - Show shortcuts help
  useShortcut('?', () => {
    setShowHelp((prev: boolean) => !prev)
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
            { keys: 'G E', action: 'Employees' },
            { keys: 'G C', action: 'Driver Compliance' },
            { keys: 'G L', action: 'Leave Management' },
            { keys: 'G A', action: 'Attendance' },
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
