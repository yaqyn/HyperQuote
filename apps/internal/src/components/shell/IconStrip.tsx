import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { hasPermission, type AuthSession } from '@hyperquote/auth'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'

interface IconStripProps {
  auth: AuthSession
}

export function IconStrip({ auth }: IconStripProps) {
  const { t } = useTranslation('internal')
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveModule = useInternalStore((s) => s.setActiveModule)

  const allowedModules = MODULES.filter((m) => hasPermission(auth, m.permission))

  return (
    <nav className="fixed inset-y-0 start-0 z-30 flex flex-col items-center gap-1 py-16 px-2 max-md:hidden">
      {allowedModules.map((mod) => {
        const isActive = activeModule === mod.id
        return (
          <Button
            key={mod.id}
            onPress={() => setActiveModule(isActive ? null : mod.id)}
            aria-label={t(mod.labelKey)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer ${
              isActive
                ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <mod.icon size={24} />
          </Button>
        )
      })}
    </nav>
  )
}
