import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { X } from 'lucide-react'
import { MODULES } from '../../lib/modules'

interface WindowHeaderProps {
  moduleId: string
  onClose: () => void
}

export function WindowHeader({ moduleId, onClose }: WindowHeaderProps) {
  const { t } = useTranslation('internal')

  const mod = MODULES.find((m) => m.id === moduleId)
  if (!mod) return null

  const Icon = mod.icon

  return (
    <div className="flex items-center justify-between h-12 px-5 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]">
      <div className="flex items-center gap-2.5">
        <Icon size={18} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {t(mod.labelKey)}
        </span>
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
