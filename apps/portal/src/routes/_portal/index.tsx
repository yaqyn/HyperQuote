import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_portal/')({
  component: () => (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-lg font-semibold text-[var(--color-text)]">
        HyperQuote Portal
      </h1>
    </div>
  ),
})
