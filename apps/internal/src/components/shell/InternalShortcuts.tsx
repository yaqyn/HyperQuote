import { type AuthSession, hasPermission } from '@hyperquote/auth'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'

interface InternalShortcutsProps {
	auth: AuthSession
	onCloseActiveModule: () => void
}

export function InternalShortcuts({
	auth,
	onCloseActiveModule,
}: InternalShortcutsProps) {
	const { scope } = useKeyboardScope()
	const activeModule = useInternalStore((s) => s.activeModule)
	const setActiveModule = useInternalStore((s) => s.setActiveModule)

	function toggleModule(id: string) {
		if (activeModule === id) {
			onCloseActiveModule()
			return
		}
		setActiveModule(id)
	}

	// Register hotkeys for all 11 modules
	// Single-letter hotkeys ONLY fire when scope === 'canvas' (prevents firing in text inputs)
	for (const mod of MODULES) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		// biome-ignore lint/correctness/useHookAtTopLevel: MODULES is a stable constant; hook call order is deterministic across renders.
		useShortcut(mod.hotkey, () => toggleModule(mod.id), {
			enabled: scope === 'canvas' && hasPermission(auth, mod.permission),
		})
	}

	return null
}
