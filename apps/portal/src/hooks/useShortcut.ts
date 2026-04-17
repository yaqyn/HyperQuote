import { useHotkey } from '@tanstack/react-hotkeys'

/**
 * Swappable abstraction over @tanstack/react-hotkeys.
 * Wraps useHotkey (singular) so downstream code never imports the library directly.
 *
 * We derive the hotkey-string type from `useHotkey` itself so we don't have
 * to import from `@tanstack/hotkeys` (a transitive dep) nor duplicate its
 * big literal-key union here.
 *
 * @param key - Hotkey string (e.g., 'Escape', 'Mod+J', 'O')
 * @param callback - Function to call when hotkey fires
 * @param opts - Optional: { enabled } to conditionally disable
 */
type Shortcut = Parameters<typeof useHotkey>[0]

export function useShortcut(
	key: Shortcut,
	callback: () => void,
	opts?: { enabled?: boolean },
) {
	useHotkey(key, () => callback(), {
		enabled: opts?.enabled ?? true,
	})
}
