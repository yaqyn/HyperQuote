import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { hasPermission, type AuthSession } from '@hyperquote/auth'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'

interface MobileModuleGridProps {
  auth: AuthSession
}

export function MobileModuleGrid({ auth }: MobileModuleGridProps) {
  const { t } = useTranslation('internal')
  const setActiveModule = useInternalStore((s) => s.setActiveModule)

  const allowedModules = MODULES.filter((m) => hasPermission(auth, m.permission))

  return (
    <div className="grid grid-cols-2 gap-3 p-4 md:hidden">
      {allowedModules.map((mod) => (
        <Button
          key={mod.id}
          onPress={() => setActiveModule(mod.id)}
          className=" bg-[rgba(255,255,255,0.80)] dark:bg-[rgba(0,0,0,0.80)] rounded-xl p-4 shadow-sm flex flex-col items-start gap-2 cursor-pointer"
        >
          <mod.icon size={32} className="text-[var(--color-text-muted)]" />
          <span className="text-sm font-medium text-[var(--color-text)]">
            {t(mod.labelKey)}
          </span>
        </Button>
      ))}
    </div>
  )
}
