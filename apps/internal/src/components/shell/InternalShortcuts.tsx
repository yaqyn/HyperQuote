import { type AuthSession, hasPermission } from '@hyperquote/auth'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'

interface InternalShortcutsProps {
	auth: AuthSession
	commandPaletteOpen: boolean
	onToggleCommandPalette: () => void
	onCloseCommandPalette: () => void
}

export function InternalShortcuts({
	auth,
	commandPaletteOpen,
	onToggleCommandPalette,
	onCloseCommandPalette,
}: InternalShortcutsProps) {
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
		// biome-ignore lint/correctness/useHookAtTopLevel: MODULES is a stable constant; hook call order is deterministic across renders.
		useShortcut(mod.hotkey, () => toggleModule(mod.id), {
			enabled: scope === 'canvas' && hasPermission(auth, mod.permission),
		})
	}

	// Ctrl+K toggles command palette (works in canvas and panel scope, not input)
	useShortcut('ctrl+k', () => onToggleCommandPalette(), {
		enabled: scope !== 'input',
	})

	// Escape: close command palette first; otherwise close the whole
	// module window. We no longer try to close the sales quote builder
	// as a first step — sales auto-loads the head of the pipeline into
	// `editingRfqId` the moment it's cleared, so closing the quote
	// builder on Escape just re-opened it on the next render, trapping
	// the user in the panel. The quote builder has its own internal
	// dismissal gestures; Escape on the shell walks straight out.
	useShortcut(
		'Escape',
		() => {
			if (commandPaletteOpen) {
				onCloseCommandPalette()
				return
			}
			if (activeModule) {
				setActiveModule(null)
			}
		},
		{
			enabled:
				scope !== 'input' && (commandPaletteOpen || activeModule !== null),
		},
	)

	return null
}
