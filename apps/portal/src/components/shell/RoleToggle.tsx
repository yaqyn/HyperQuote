import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { usePortalStore } from '../../stores/portal'

interface RoleToggleProps {
  hasSupplierRole: boolean
}

export function RoleToggle({ hasSupplierRole }: RoleToggleProps) {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const activeRole = usePortalStore((s) => s.activeRole)
  const setActiveRole = usePortalStore((s) => s.setActiveRole)

  if (!hasSupplierRole) return null

  const roles = ['customer', 'supplier'] as const
  const activeIndex = roles.indexOf(activeRole)

  const handleSwitch = (role: 'customer' | 'supplier') => {
    if (role === activeRole) return
    setActiveRole(role)
    navigate({ to: '/' })
  }

  return (
    <div className="hidden md:flex relative items-center w-[200px] h-9 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
      {/* Sliding indicator */}
      <div
        className="absolute h-8 w-[calc(50%-2px)] rounded-full bg-[var(--color-primary)] transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${activeIndex === 0 ? '0' : '100%'})`,
        }}
      />

      {roles.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => handleSwitch(role)}
          aria-pressed={activeRole === role}
          className={`relative z-10 flex-1 h-8 rounded-full text-[var(--text-sm)] font-semibold transition-colors duration-200 ${
            activeRole === role
              ? 'text-white'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          {t(`role.${role}`)}
        </button>
      ))}
    </div>
  )
}
