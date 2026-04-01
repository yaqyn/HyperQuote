import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useState, useCallback, lazy, Suspense } from 'react'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { SettingsNav } from '../../components/settings/SettingsNav'
import { ProfileSection } from '../../components/settings/ProfileSection'
import { AddressesSection } from '../../components/settings/AddressesSection'
import { ProjectsSection } from '../../components/settings/ProjectsSection'
import { TeamSection } from '../../components/settings/TeamSection'
import { NotificationsSection } from '../../components/settings/NotificationsSection'
import { AppearanceSection } from '../../components/settings/AppearanceSection'
import { SecuritySection } from '../../components/settings/SecuritySection'
import { ReferralsSection } from '../../components/settings/ReferralsSection'
import {
  getCustomerProfile,
  getAddresses,
  getProjects,
  getActiveSessions,
} from '../../lib/server/settings'
import { getTeamMembers } from '../../lib/server/team'
import type { SettingsSection } from '../../types/settings'

export const Route = createFileRoute('/_portal/settings')({
  component: SettingsWindow,
  validateSearch: (search: Record<string, unknown>) => ({
    section: (search.section as SettingsSection) ?? 'profile',
  }),
})

function SettingsWindow() {
  const { t, i18n } = useTranslation('portal')
  const { section } = Route.useSearch()
  const navigate = useNavigate()

  const [currentTheme, setCurrentTheme] = useState('system')
  const [numberFormat, setNumberFormat] = useState<'arabic' | 'western'>(
    i18n.language === 'ar' ? 'arabic' : 'western',
  )
  const [dateFormat, setDateFormat] = useState<'gregorian' | 'hijri'>('gregorian')

  const activeSection = (section ?? 'profile') as SettingsSection

  const handleSectionChange = useCallback(
    (newSection: SettingsSection) => {
      navigate({
        to: '/settings',
        search: { section: newSection },
        replace: true,
      })
    },
    [navigate],
  )

  // Queries
  const profileQuery = useQuery({
    queryKey: ['customerProfile'],
    queryFn: () => getCustomerProfile(),
  })

  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: () => getAddresses(),
    enabled: activeSection === 'addresses',
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
    enabled: activeSection === 'projects',
  })

  const teamQuery = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => getTeamMembers(),
    enabled: activeSection === 'team',
  })

  const sessionsQuery = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => getActiveSessions(),
    enabled: activeSection === 'security',
  })

  function renderSection() {
    switch (activeSection) {
      case 'profile':
        if (!profileQuery.data) {
          return <SectionSkeleton />
        }
        return <ProfileSection profile={profileQuery.data} />

      case 'addresses':
        if (!addressesQuery.data) {
          return <SectionSkeleton />
        }
        return <AddressesSection addresses={addressesQuery.data} />

      case 'projects':
        if (!projectsQuery.data) {
          return <SectionSkeleton />
        }
        return <ProjectsSection projects={projectsQuery.data} />

      case 'team':
        if (!teamQuery.data) {
          return <SectionSkeleton />
        }
        return (
          <TeamSection
            members={teamQuery.data}
            isOwner={teamQuery.data.some((m) => m.isOwner)}
          />
        )

      case 'notifications':
        return <NotificationsSection />

      case 'appearance':
        return (
          <AppearanceSection
            currentLocale={i18n.language}
            currentTheme={currentTheme}
            numberFormat={numberFormat}
            dateFormat={dateFormat}
            onLocaleChange={(locale) => {
              document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
              document.documentElement.setAttribute('lang', locale)
            }}
            onThemeChange={setCurrentTheme}
            onNumberFormatChange={setNumberFormat}
            onDateFormatChange={setDateFormat}
          />
        )

      case 'security':
        if (!sessionsQuery.data) {
          return <SectionSkeleton />
        }
        return <SecuritySection sessions={sessionsQuery.data} />

      case 'referrals':
        return <ReferralsSection />

      default:
        return null
    }
  }

  return (
    <>
      <WindowShell title={t('settings.windowTitle')}>
        {/* Desktop: side-by-side. Mobile: stacked. */}
        <div className="flex flex-col md:flex-row gap-6 h-full">
          <SettingsNav
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
          <div className="flex-1 min-w-0 overflow-y-auto">
            {renderSection()}
          </div>
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-32 rounded bg-[var(--color-surface)]" />
      <div className="h-12 w-full rounded-lg bg-[var(--color-surface)]" />
      <div className="h-12 w-full rounded-lg bg-[var(--color-surface)]" />
      <div className="h-12 w-3/4 rounded-lg bg-[var(--color-surface)]" />
    </div>
  )
}
