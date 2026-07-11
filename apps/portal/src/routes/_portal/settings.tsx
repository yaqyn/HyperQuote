/**
 * Settings — data is the design.
 * Single-column layout. No sidebar. Sections stacked vertically with anchors.
 * Like a clean document — scroll to browse, jump via top nav.
 */

import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddressesSection } from '../../components/settings/AddressesSection'
import { AppearanceSection } from '../../components/settings/AppearanceSection'
import { NotificationsSection } from '../../components/settings/NotificationsSection'
import { ProfileSection } from '../../components/settings/ProfileSection'
import { ProjectsSection } from '../../components/settings/ProjectsSection'
import { SecuritySection } from '../../components/settings/SecuritySection'
import { WindowShell } from '../../components/windows/WindowShell'
import { usePortalThemeSnapshot } from '../../hooks/usePortalThemeSnapshot'
import { portalHead } from '../../lib/page-meta'
import {
	getAddresses,
	getCustomerProfile,
	getNotificationPreferences,
	getProjects,
} from '../../lib/server/settings'
import type { SettingsSection } from '../../types/settings'

const SECTIONS: Array<{
	id: SettingsSection
	labelKey: ParseKeys<'portal'>
}> = [
	{ id: 'profile', labelKey: 'settings.tabProfile' },
	{ id: 'addresses', labelKey: 'settings.tabAddresses' },
	{ id: 'projects', labelKey: 'settings.tabProjects' },
	{ id: 'notifications', labelKey: 'settings.tabNotifications' },
	{ id: 'appearance', labelKey: 'settings.tabAppearance' },
	{ id: 'security', labelKey: 'settings.tabSecurity' },
]

export const Route = createFileRoute('/_portal/settings')({
	head: () =>
		portalHead({
			title: 'Settings — HyperQuote Portal',
			description:
				'Private HyperQuote settings for profile, addresses, projects, notifications, appearance, and security.',
			path: '/settings',
		}),
	component: SettingsWindow,
	validateSearch: (search: Record<string, unknown>) => ({
		section: (search.section as SettingsSection) ?? 'profile',
	}),
})

function SettingsWindow() {
	const { t, i18n } = useTranslation('portal')
	const { section } = Route.useSearch()
	const navigate = useNavigate()
	const [activeSection, setActiveSection] = useState<SettingsSection>(
		section ?? 'profile',
	)
	const currentTheme = usePortalThemeSnapshot()

	const [numberFormat, setNumberFormat] = useState<'arabic' | 'western'>(
		i18n.language === 'ar' ? 'arabic' : 'western',
	)
	const [dateFormat, setDateFormat] = useState<'gregorian' | 'hijri'>(
		'gregorian',
	)

	const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

	const scrollTo = useCallback(
		(id: SettingsSection) => {
			setActiveSection(id)
			navigate({ to: '/settings', search: { section: id }, replace: true })
			sectionRefs.current[id]?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		},
		[navigate],
	)

	// Queries — all load eagerly for scroll-through experience
	const profileQuery = useQuery({
		queryKey: ['customerProfile'],
		queryFn: () => getCustomerProfile(),
	})
	const addressesQuery = useQuery({
		queryKey: ['addresses'],
		queryFn: () => getAddresses(),
	})
	const projectsQuery = useQuery({
		queryKey: ['projects'],
		queryFn: () => getProjects(),
	})
	const notificationPreferencesQuery = useQuery({
		queryKey: ['notificationPreferences'],
		queryFn: () => getNotificationPreferences(),
	})

	return (
		<WindowShell title={t('settings.windowTitle')} maxWidth="640px">
			<div className="py-8">
				{/* Section nav — horizontal text links */}
				<nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12">
					{SECTIONS.map((s) => (
						<button
							key={s.id}
							type="button"
							onClick={() => scrollTo(s.id)}
							className={[
								'text-[13px] transition-colors duration-150',
								activeSection === s.id
									? 'text-[var(--color-text)] font-medium'
									: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]',
							].join(' ')}
						>
							{t(s.labelKey)}
						</button>
					))}
				</nav>

				{/* Sections — stacked vertically, each with an anchor */}
				<div className="flex flex-col gap-16">
					{/* Profile */}
					<SettingsBlock
						ref={(el) => {
							sectionRefs.current.profile = el
						}}
						title={t('settings.tabProfile')}
					>
						{profileQuery.data ? (
							<ProfileSection profile={profileQuery.data} />
						) : (
							<Skeleton />
						)}
					</SettingsBlock>

					{/* Addresses */}
					<SettingsBlock
						ref={(el) => {
							sectionRefs.current.addresses = el
						}}
						title={t('settings.tabAddresses')}
					>
						{addressesQuery.data ? (
							<AddressesSection addresses={addressesQuery.data} />
						) : (
							<Skeleton />
						)}
					</SettingsBlock>

					{/* Projects */}
					<SettingsBlock
						ref={(el) => {
							sectionRefs.current.projects = el
						}}
						title={t('settings.tabProjects')}
					>
						{projectsQuery.data ? (
							<ProjectsSection projects={projectsQuery.data} />
						) : (
							<Skeleton />
						)}
					</SettingsBlock>

					{/* Notifications */}
					<SettingsBlock
						ref={(el) => {
							sectionRefs.current.notifications = el
						}}
						title={t('settings.tabNotifications')}
					>
						{notificationPreferencesQuery.isPending ? (
							<Skeleton />
						) : notificationPreferencesQuery.isError ? (
							<SettingsError
								message={t('settings.notifications.loadError')}
								retryLabel={t('orders.retry')}
								onRetry={() => notificationPreferencesQuery.refetch()}
							/>
						) : (
							<NotificationsSection
								preferences={notificationPreferencesQuery.data ?? []}
							/>
						)}
					</SettingsBlock>

					{/* Appearance */}
					<SettingsBlock
						ref={(el) => {
							sectionRefs.current.appearance = el
						}}
						title={t('settings.tabAppearance')}
					>
						<AppearanceSection
							currentLocale={i18n.language}
							currentTheme={currentTheme}
							numberFormat={numberFormat}
							dateFormat={dateFormat}
							onLocaleChange={(locale) => {
								localStorage.setItem('hq-locale', locale)
								const doc = document as unknown as Record<'cookie', string>
								doc.cookie = `hq-locale=${locale};path=/;max-age=31536000`
								document.documentElement.setAttribute(
									'dir',
									locale === 'ar' ? 'rtl' : 'ltr',
								)
								document.documentElement.setAttribute('lang', locale)
								document.body.className = document.body.className.replace(
									/font-(sans|arabic)/,
									locale === 'ar' ? 'font-arabic' : 'font-sans',
								)
							}}
							onNumberFormatChange={setNumberFormat}
							onDateFormatChange={setDateFormat}
						/>
					</SettingsBlock>

					{/* Security */}
					<SettingsBlock
						ref={(el) => {
							sectionRefs.current.security = el
						}}
						title={t('settings.tabSecurity')}
					>
						<SecuritySection />
					</SettingsBlock>
				</div>
			</div>
		</WindowShell>
	)
}

// ============================================================================
// Settings block — section wrapper with title
// ============================================================================

import { forwardRef } from 'react'

const SettingsBlock = forwardRef<
	HTMLDivElement,
	{ title: string; children: React.ReactNode }
>(function SettingsBlock({ title, children }, ref) {
	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: 'spring', stiffness: 200, damping: 20 }}
			className="scroll-mt-20"
		>
			<h2 className="text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-6">
				{title}
			</h2>
			{children}
		</motion.div>
	)
})

// ============================================================================
// Skeleton
// ============================================================================

function Skeleton() {
	return (
		<div className="flex flex-col gap-4 animate-pulse">
			<div className="h-3.5 w-40 bg-[var(--color-surface)] rounded-sm" />
			<div className="h-9 w-full border-b border-[var(--color-surface)]" />
			<div className="h-9 w-full border-b border-[var(--color-surface)]" />
			<div className="h-9 w-3/4 border-b border-[var(--color-surface)]" />
		</div>
	)
}

function SettingsError({
	message,
	retryLabel,
	onRetry,
}: {
	message: string
	retryLabel: string
	onRetry: () => void
}) {
	return (
		<div className="space-y-3" role="alert">
			<p className="text-sm text-red-600 dark:text-red-400">{message}</p>
			<button
				type="button"
				onClick={onRetry}
				className="text-sm text-[var(--color-text)] underline underline-offset-4"
			>
				{retryLabel}
			</button>
		</div>
	)
}
