import { useHotkey } from '@tanstack/react-hotkeys'

/**
 * Swappable abstraction over @tanstack/react-hotkeys.
 * Wraps useHotkey (singular) so downstream code never imports the library directly.
 *
 * Internally passes the key through `useHotkey` as a `RawHotkey` object. The
 * library normalizes lowercase letters and punctuation at runtime, so callers
 * can pass ergonomic strings like 'n', '/', '?', or 'Mod+S' and the hotkey
 * manager does the right thing.
 *
 * @param key - Hotkey string (e.g., 'Escape', 'Mod+J', 'S', 'n', '/', '?')
 * @param callback - Function to call when hotkey fires
 * @param opts - Optional: { enabled } to conditionally disable
 *
 * conflictBehavior: 'allow' suppresses duplicate-registration warnings.
 * Multiple modules register the same keys (n, g, ?, etc.) but only the active
 * module's handlers fire because each registration is guarded by `enabled`.
 */
export function useShortcut(
	key: string,
	callback: () => void,
	opts?: { enabled?: boolean },
) {
	// Convert to RawHotkey: parses compound forms like 'Mod+S', 'Shift+?' into
	// their components. Single-char keys become { key }. The library's runtime
	// parser handles uppercase normalization.
	const hotkey = parseShortcutKey(key)
	useHotkey(hotkey, () => callback(), {
		enabled: opts?.enabled ?? true,
		conflictBehavior: 'allow',
	})
}

interface ParsedShortcut {
	key: string
	mod?: boolean
	ctrl?: boolean
	shift?: boolean
	alt?: boolean
	meta?: boolean
}

function parseShortcutKey(input: string): ParsedShortcut {
	const parts = input.split('+')
	const last = parts.at(-1) ?? input
	const modifiers = new Set(parts.slice(0, -1).map((p) => p.toLowerCase()))
	return {
		key: last.length === 1 ? last.toUpperCase() : last,
		mod: modifiers.has('mod') || undefined,
		ctrl: modifiers.has('control') || modifiers.has('ctrl') || undefined,
		shift: modifiers.has('shift') || undefined,
		alt: modifiers.has('alt') || undefined,
		meta: modifiers.has('meta') || undefined,
	}
}
