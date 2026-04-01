export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 justify-start">
      <div className="rounded-xl rounded-tl-sm rtl:rounded-tl-xl rtl:rounded-tr-sm bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)] animate-[typing-bounce_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
