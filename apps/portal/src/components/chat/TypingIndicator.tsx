/**
 * TypingIndicator — a thin cursor blink on the left side.
 * No dots. No text. Just a line that breathes.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-start me-auto">
      <span className="block w-[1.5px] h-4 bg-[var(--color-text-muted)] animate-pulse" />
    </div>
  )
}
