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
 * G then R - Rules (Margins + Approvals)
 * G then H - Holiday Calendar
 * G then L - Audit Log
 * G then P - Permissions (via Users tab)
 * ? - Show shortcuts help
 */
export function AdminShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useAdminStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'admin' && scope === 'panel'

  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('u', () => {
    if (gPrefix) { setActiveTab('users'); setGPrefix(false) }
  }, { enabled: isActive && gPrefix })

  useShortcut('s', () => {
    if (gPrefix) { setActiveTab('settings'); setGPrefix(false) }
  }, { enabled: isActive && gPrefix })

  useShortcut('r', () => {
    if (gPrefix) { setActiveTab('rules'); setGPrefix(false) }
  }, { enabled: isActive && gPrefix })

  useShortcut('l', () => {
    if (gPrefix) { setActiveTab('audit'); setGPrefix(false) }
  }, { enabled: isActive && gPrefix })

  useShortcut('p', () => {
    if (gPrefix) {
      // G P now opens permissions inline within Users tab
      setActiveTab('users')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('?', () => {
    setShowHelp((prev: boolean) => !prev)
  }, { enabled: isActive })

  if (!showHelp) return null

  const shortcuts = [
    { keys: 'G U', action: 'Users' },
    { keys: 'G P', action: 'Permissions (Users tab)' },
    { keys: 'G S', action: 'Settings' },
    { keys: 'G R', action: 'Rules' },
    { keys: 'G L', action: 'Audit Log' },
    { keys: '?', action: 'Toggle help' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/95 dark:bg-black/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
            Shortcuts
          </span>
          <Button
            onPress={() => setShowHelp(false)}
            className="rounded-md px-2 py-0.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer outline-none"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-0.5">
              <span className="text-xs text-black/50 dark:text-white/50">{s.action}</span>
              <kbd className="rounded border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] text-black/60 dark:text-white/60">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
