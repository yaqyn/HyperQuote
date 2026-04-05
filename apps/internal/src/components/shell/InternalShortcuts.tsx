import { hasPermission, type AuthSession } from '@hyperquote/auth'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'

interface InternalShortcutsProps {
  auth: AuthSession
}

export function InternalShortcuts({ auth }: InternalShortcutsProps) {
  const { scope } = useKeyboardScope()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveModule = useInternalStore((s) => s.setActiveModule)

  function toggleModule(id: string) {
    setActiveModule(activeModule === id ? null : id)
  }

  // Register hotkeys for all 11 modules
  // Single-letter hotkeys ONLY fire when scope === 'canvas' (prevents firing in text inputs)
  for (const mod of MODULES) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(mod.hotkey, () => toggleModule(mod.id), {
      enabled: scope === 'canvas' && hasPermission(auth, mod.permission),
    })
  }

  // Escape closes current window (fires in canvas and panel scope, not input)
  useShortcut('Escape', () => setActiveModule(null), {
    enabled: scope !== 'input' && activeModule !== null,
  })

  return null
}
