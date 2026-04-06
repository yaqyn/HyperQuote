/**
 * Loading placeholder for map views.
 * Pulsing grey rectangle with map icon centered.
 * Used as ClientOnly fallback.
 */
export function MapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 animate-pulse ${className}`}
      style={{ minHeight: 300 }}
    >
      <svg
        className="w-12 h-12 text-black/20 dark:text-white/20"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
        />
      </svg>
    </div>
  )
}
