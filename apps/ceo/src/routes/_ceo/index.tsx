import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_ceo/')({
  component: CEOHome,
})

function CEOHome() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[var(--color-text-muted)]">CEO Command Center</p>
    </div>
  )
}
