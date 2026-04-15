import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useDispatchStore } from '../../stores/dispatch'

/**
 * Dispatch keyboard shortcuts.
 * Active only when dispatch module is focused.
 *
 * M - Live Map (Radar)
 * G then R - Route Planning (Planner)
 * G then D - Driver Management (Roster)
 * G then P - POD Validation (Evidence)
 * 1-9 - Select vehicle by list position
 * ? - Toggle shortcuts overlay
 */
export function DispatchShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useDispatchStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'dispatch' && scope === 'panel'

  useShortcut('m', () => {
    if (!gPrefix) setActiveTab('map')
  }, { enabled: isActive && !gPrefix })

  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  useShortcut('r', () => {
    if (gPrefix) { setActiveTab('map'); setGPrefix(false) }
  }, { enabled: isActive && gPrefix })

  useShortcut('d', () => {
    if (gPrefix) {
      // Open roster sidebar within map tab
      setActiveTab('map')
      useDispatchStore.getState().setRosterSidebarOpen(true)
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  useShortcut('p', () => {
    if (gPrefix) { setActiveTab('deliveries'); setGPrefix(false) }
  }, { enabled: isActive && gPrefix })

  for (const num of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(num, () => {
      window.dispatchEvent(
        new CustomEvent('dispatch:select-vehicle', { detail: { index: Number(num) - 1 } }),
      )
    }, { enabled: isActive && !gPrefix })
  }

  useShortcut('?', () => {
    setShowHelp((prev: boolean) => !prev)
  }, { enabled: isActive })

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/95 p-5 shadow-2xl dark:bg-black/95">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
          <Button
            onPress={() => setShowHelp(false)}
            className="cursor-pointer rounded-md px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { keys: 'M', action: 'Map' },
            { keys: 'G R', action: 'Map (Routes)' },
            { keys: 'G D', action: 'Roster Sidebar' },
            { keys: 'G P', action: 'Deliveries' },
            { keys: '1-9', action: 'Select vehicle' },
            { keys: '?', action: 'Toggle help' },
          ].map((s) => (
            <div key={s.keys} className="flex items-center justify-between">
              <span className="text-sm text-black/60 dark:text-white/60">{s.action}</span>
              <kbd className="rounded border border-black/10 bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs dark:border-white/10 dark:bg-white/5">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
