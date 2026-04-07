/**
 * Clean loading placeholder for maps.
 * Gray rectangle with centered spinner.
 */
export function MapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.03] ${className}`}
      style={{ minHeight: 200 }}
    >
      <svg
        className="h-5 w-5 animate-spin text-black/20 dark:text-white/20"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  )
}
