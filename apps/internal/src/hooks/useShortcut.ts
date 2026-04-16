import { useHotkey } from '@tanstack/react-hotkeys'

/**
 * Swappable abstraction over @tanstack/react-hotkeys.
 * Wraps useHotkey (singular) so downstream code never imports the library directly.
 *
 * @param key - Hotkey string (e.g., 'Escape', 'Mod+J', 'S')
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
  useHotkey(key, () => callback(), {
    enabled: opts?.enabled ?? true,
    conflictBehavior: 'allow',
  })
}
