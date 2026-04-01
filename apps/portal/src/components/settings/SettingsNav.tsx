/**
 * Settings navigation sidebar.
 * Desktop: vertical sidebar ~200px.
 * Mobile: horizontal scroll list at top.
 * Uses React Aria ListBox with 8 items.
 */
import { ListBox, ListBoxItem } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
  User,
  MapPin,
  FolderOpen,
  Users,
  Bell,
  Palette,
  Shield,
  Gift,
} from 'lucide-react'
import type { SettingsSection } from '../../types/settings'

const SECTIONS: Array<{
  id: SettingsSection
  icon: typeof User
  labelKey: string
}> = [
  { id: 'profile', icon: User, labelKey: 'settings.nav.profile' },
  { id: 'addresses', icon: MapPin, labelKey: 'settings.nav.addresses' },
  { id: 'projects', icon: FolderOpen, labelKey: 'settings.nav.projects' },
  { id: 'team', icon: Users, labelKey: 'settings.nav.team' },
  { id: 'notifications', icon: Bell, labelKey: 'settings.nav.notifications' },
  { id: 'appearance', icon: Palette, labelKey: 'settings.nav.appearance' },
  { id: 'security', icon: Shield, labelKey: 'settings.nav.security' },
  { id: 'referrals', icon: Gift, labelKey: 'settings.nav.referrals' },
]

interface SettingsNavProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

export function SettingsNav({
  activeSection,
  onSectionChange,
}: SettingsNavProps) {
  const { t } = useTranslation('portal')

  return (
    <nav className="shrink-0">
      {/* Desktop: vertical sidebar */}
      <div className="hidden md:block w-[200px]">
        <ListBox
          aria-label={t('settings.nav.label')}
          selectionMode="single"
          selectedKeys={new Set([activeSection])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0] as SettingsSection | undefined
            if (selected) onSectionChange(selected)
          }}
          className="flex flex-col gap-1"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <ListBoxItem
                key={section.id}
                id={section.id}
                textValue={t(section.labelKey)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none
                  ${
                    isActive
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  }
                  focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
                `}
              >
                <Icon size={18} />
                <span>{t(section.labelKey)}</span>
              </ListBoxItem>
            )
          })}
        </ListBox>
      </div>

      {/* Mobile: horizontal scroll list */}
      <div className="md:hidden overflow-x-auto pb-3 -mx-4 px-4">
        <ListBox
          aria-label={t('settings.nav.label')}
          selectionMode="single"
          selectedKeys={new Set([activeSection])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0] as SettingsSection | undefined
            if (selected) onSectionChange(selected)
          }}
          orientation="horizontal"
          className="flex gap-2 min-w-max"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <ListBoxItem
                key={section.id}
                id={section.id}
                textValue={t(section.labelKey)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap cursor-pointer outline-none
                  ${
                    isActive
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                      : 'text-[var(--color-text-muted)] bg-[var(--color-surface)]'
                  }
                  focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
                `}
              >
                <Icon size={16} />
                <span>{t(section.labelKey)}</span>
              </ListBoxItem>
            )
          })}
        </ListBox>
      </div>
    </nav>
  )
}
