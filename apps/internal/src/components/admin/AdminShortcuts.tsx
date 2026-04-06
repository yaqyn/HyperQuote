import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useAdminStore } from '../../stores/admin'

/**
 * Admin-specific keyboard shortcuts.
 * Only active when admin module is open.
 *
 * G then U - Users & Roles
 * G then S - System Settings
 * G then M - Margin Rules
 * G then H - Holiday Calendar
 * G then L - Audit Log
 * G then P - Permissions
 * G then A - Approval Thresholds
 * ? - Show shortcuts help
 */
export function AdminShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useAdminStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'admin' && scope === 'panel'

  // G prefix for Go-to shortcuts
  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  // G then U - Users
  useShortcut('u', () => {
    if (gPrefix) {
      setActiveTab('users')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then S - Settings
  useShortcut('s', () => {
    if (gPrefix) {
      setActiveTab('settings')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then M - Margins
  useShortcut('m', () => {
    if (gPrefix) {
      setActiveTab('margins')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then H - Holidays
  useShortcut('h', () => {
    if (gPrefix) {
      setActiveTab('holidays')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then L - Audit Log
  useShortcut('l', () => {
    if (gPrefix) {
      setActiveTab('audit')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then P - Permissions
  useShortcut('p', () => {
    if (gPrefix) {
      setActiveTab('permissions')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then A - Approvals
  useShortcut('a', () => {
    if (gPrefix) {
      setActiveTab('approvals')
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
            { keys: 'G U', action: 'Users & Roles' },
            { keys: 'G P', action: 'Permissions' },
            { keys: 'G S', action: 'System Settings' },
            { keys: 'G M', action: 'Margin Rules' },
            { keys: 'G A', action: 'Approval Thresholds' },
            { keys: 'G H', action: 'Holiday Calendar' },
            { keys: 'G L', action: 'Audit Log' },
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
