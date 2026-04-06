import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useInternalStore } from '../../stores/internal'
import { useDispatchStore } from '../../stores/dispatch'

/**
 * Dispatch-specific keyboard shortcuts.
 * Only active when dispatch module is open.
 *
 * M - Toggle to Live Map
 * G then R - Route Planning
 * G then D - Driver Management
 * 1-9 - Select vehicle by list position (dispatches custom event)
 * ? - Show shortcuts help
 */
export function DispatchShortcuts() {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveTab = useDispatchStore((s) => s.setActiveTab)
  const [showHelp, setShowHelp] = useState(false)
  const [gPrefix, setGPrefix] = useState(false)

  const isActive = activeModule === 'dispatch' && scope === 'panel'

  // M - Toggle to Live Map
  useShortcut('m', () => {
    if (!gPrefix) {
      setActiveTab('live-map')
    }
  }, { enabled: isActive && !gPrefix })

  // G prefix for Go-to shortcuts
  useShortcut('g', () => setGPrefix(true), { enabled: isActive })

  // G then R - Route Planning
  useShortcut('r', () => {
    if (gPrefix) {
      setActiveTab('route-planning')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // G then D - Driver Management
  useShortcut('d', () => {
    if (gPrefix) {
      setActiveTab('driver-management')
      setGPrefix(false)
    }
  }, { enabled: isActive && gPrefix })

  // 1-9 - Select vehicle by list position
  for (const num of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(num, () => {
      window.dispatchEvent(
        new CustomEvent('dispatch:select-vehicle', { detail: { index: Number(num) - 1 } }),
      )
    }, { enabled: isActive && !gPrefix })
  }

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
            { keys: 'M', action: 'Live Map' },
            { keys: 'G R', action: 'Route Planning' },
            { keys: 'G D', action: 'Driver Management' },
            { keys: '1-9', action: 'Select vehicle by position' },
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
