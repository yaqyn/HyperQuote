/**
 * TypingIndicator — Three subtle dots pulsing.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-3 ps-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-[var(--p-text-muted)] animate-pulse"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  )
}
