import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_internal/')({
  component: InternalCanvas,
})

/** Placeholder canvas -- Plan 02 builds the real spatial canvas with greeting + icon strip */
function InternalCanvas() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-[var(--color-text-muted)] text-lg">Internal Platform</p>
    </div>
  )
}
