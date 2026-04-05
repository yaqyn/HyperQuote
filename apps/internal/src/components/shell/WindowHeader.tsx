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
    <div className="flex items-center justify-between h-14 px-6 border-b border-[var(--color-border)]/50">
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-[var(--color-text-muted)]" />
        <span className="text-base font-semibold text-[var(--color-text)]">
          {t(mod.labelKey)}
        </span>
      </div>
      <Button
        onPress={onClose}
        aria-label={t('window.close')}
        className="flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
      >
        <X size={20} />
      </Button>
    </div>
  )
}
