import { useTranslation } from 'react-i18next'
import { Button, TooltipTrigger, Tooltip } from 'react-aria-components'
import { X } from 'lucide-react'
import { MODULES } from '../../lib/modules'
import { useAIChatStore } from '../../stores/ai-chat'

interface WindowHeaderProps {
  moduleId: string
  onClose: () => void
}

export function WindowHeader({ moduleId, onClose }: WindowHeaderProps) {
  const { t } = useTranslation('internal')
  const toggleAIChat = useAIChatStore((s) => s.toggle)
  const isAIOpen = useAIChatStore((s) => s.isOpen)

  const mod = MODULES.find((m) => m.id === moduleId)
  if (!mod) return null

  const Icon = mod.icon

  return (
    <div className="flex items-center justify-between h-12 px-5 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]">
      <div className="flex items-center gap-4">
        <TooltipTrigger delay={400}>
          <Button
            onPress={toggleAIChat}
            aria-label="Ask Lyon AI"
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer ${
              isAIOpen
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-primary)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isAIOpen
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-text-subtle)] group-hover:bg-[var(--color-primary)]'
              }`}
            />
            Ask Lyon
          </Button>
          <Tooltip
            offset={6}
            className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-black"
          >
            Lyon AI · ⌘K
          </Tooltip>
        </TooltipTrigger>

        <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />

        <div className="flex items-center gap-2.5">
          <Icon size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
          <span className="text-[13px] font-semibold text-[var(--color-text)]">
            {t(mod.labelKey)}
          </span>
        </div>

        {moduleId === 'dispatch' && (
          <>
            <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
            <a
              href="tel:+20235551234"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Warehouse
            </a>
            <a
              href="tel:991"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-red-500 transition-colors hover:text-red-600 hover:bg-red-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Emergency
            </a>
          </>
        )}
      </div>

      <Button
        onPress={onClose}
        aria-label="Close"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer"
      >
        <X size={16} strokeWidth={1.5} />
      </Button>
    </div>
  )
}
