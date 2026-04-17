import { type AuthSession, hasPermission } from '@hyperquote/auth'
import { useQuery } from '@tanstack/react-query'
import { Bell, Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button, DialogTrigger, Popover } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { MODULES } from '../../lib/modules'
import { getUrgentItems } from '../../lib/server/urgent-items'
import { useInternalStore } from '../../stores/internal'
import { useNotificationStore } from '../../stores/notifications'

function useCurrentTime() {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(id)
	}, [])
	return now
}

function getGreeting(hour: number): string {
	if (hour >= 5 && hour < 12) return 'Good morning'
	if (hour >= 12 && hour < 17) return 'Good afternoon'
	if (hour >= 17 && hour < 22) return 'Good evening'
	return 'Good night'
}

function formatTime(date: Date): {
	hours: string
	minutes: string
	seconds: string
} {
	return {
		hours: date.getHours().toString().padStart(2, '0'),
		minutes: date.getMinutes().toString().padStart(2, '0'),
		seconds: date.getSeconds().toString().padStart(2, '0'),
	}
}

function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})
}

interface InternalCanvasProps {
	auth: AuthSession
}

export function InternalCanvas({ auth }: InternalCanvasProps) {
	const { t } = useTranslation('internal')
	const now = useCurrentTime()
	const time = formatTime(now)
	const setActiveModule = useInternalStore((s) => s.setActiveModule)
	const _sidebarOpen = useInternalStore((s) => s.sidebarOpen)
	const _sidebarFocusIndex = useInternalStore((s) => s.sidebarFocusIndex)
	const unreadCount = useNotificationStore((s) => s.unreadCount)
	const toggleNotifications = useNotificationStore((s) => s.toggleWindow)

	const name = auth.user?.user_metadata?.name ?? ''
	const firstName = name.split(' ')[0] || 'there'
	const initials =
		name
			.split(' ')
			.map((w: string) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || 'U'
	const greeting = getGreeting(now.getHours())

	const allowedModules = MODULES.filter((m) =>
		hasPermission(auth, m.permission),
	)

	const { data: urgentData } = useQuery({
		queryKey: ['urgent-items'],
		queryFn: () => getUrgentItems(),
		staleTime: 60_000,
	})

	const urgentCount = urgentData?.total ?? 0

	return (
		<div className="flex flex-col items-center justify-center h-full relative overflow-hidden select-none">
			{/* Top-right: notification + profile */}
			<div className="absolute top-4 right-5 z-20 flex items-center gap-1">
				{/* Notifications */}
				<Button
					onPress={toggleNotifications}
					aria-label="Notifications"
					className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer outline-none transition-all"
				>
					<Bell size={17} strokeWidth={1.5} />
					{unreadCount > 0 && (
						<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-surface)]" />
					)}
				</Button>

				{/* Profile */}
				<DialogTrigger>
					<Button
						aria-label="Profile"
						className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer outline-none transition-all"
					>
						<div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 transition-colors">
							{initials}
						</div>
					</Button>
					<Popover
						placement="bottom end"
						offset={4}
						aria-label="Profile menu"
						className="rounded-xl p-1.5 min-w-[180px] outline-none bg-[var(--color-surface)] shadow-xl shadow-black/10 border border-black/[0.06] dark:border-white/[0.06]"
					>
						<div className="px-3 py-2 mb-1">
							<p className="text-[13px] font-medium text-[var(--color-text)]">
								{name}
							</p>
							<p className="text-[11px] text-[var(--color-text-subtle)]">
								{auth.roles?.[0] ?? 'Employee'}
							</p>
						</div>
						<div className="h-px bg-black/[0.04] dark:bg-white/[0.04] mx-1.5 mb-1" />
						<Button
							onPress={() => {
								const html = document.documentElement
								const current = html.getAttribute('data-theme')
								html.setAttribute(
									'data-theme',
									current === 'dark' ? 'light' : 'dark',
								)
								localStorage.setItem(
									'hq-theme',
									current === 'dark' ? 'light' : 'dark',
								)
							}}
							className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer outline-none transition-colors"
						>
							<Moon size={14} strokeWidth={1.5} className="dark:hidden" />
							<Sun size={14} strokeWidth={1.5} className="hidden dark:block" />
							Dark Mode
						</Button>
						<Button
							onPress={() => {
								// Toggle language en ↔ ar (placeholder — will use i18n.changeLanguage)
							}}
							className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer outline-none transition-colors"
						>
							<span className="w-[14px] text-center text-[11px] font-[family-name:var(--font-geist-mono)] font-medium">
								ع
							</span>
							Language
						</Button>
					</Popover>
				</DialogTrigger>
			</div>

			{/* Subtle radial glow behind the clock */}
			<div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
				style={{
					background:
						'radial-gradient(circle, rgba(37,99,235,0.03) 0%, transparent 70%)',
				}}
			/>

			{/* Main content stack */}
			<div className="relative z-10 flex flex-col items-center gap-10">
				{/* Greeting */}
				<motion.p
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1, duration: 0.5 }}
					className="text-sm tracking-[0.2em] uppercase text-[var(--color-text-muted)]"
				>
					{greeting}, {firstName}
				</motion.p>

				{/* Clock */}
				<motion.div
					initial={{ opacity: 0, scale: 0.96 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{
						type: 'spring',
						stiffness: 200,
						damping: 20,
						delay: 0.05,
					}}
					className="flex items-baseline gap-1"
				>
					<span
						suppressHydrationWarning
						className="text-8xl lg:text-[120px] font-medium tracking-tight text-[var(--color-text)] font-[family-name:var(--font-geist-mono)] leading-none"
					>
						{time.hours}
					</span>
					<span className="text-6xl lg:text-7xl font-light text-[var(--color-primary)] font-[family-name:var(--font-geist-mono)] leading-none mx-1">
						:
					</span>
					<span
						suppressHydrationWarning
						className="text-8xl lg:text-[120px] font-medium tracking-tight text-[var(--color-text)] font-[family-name:var(--font-geist-mono)] leading-none"
					>
						{time.minutes}
					</span>
					<span
						suppressHydrationWarning
						className="text-3xl lg:text-4xl font-normal text-[var(--color-text-subtle)] font-[family-name:var(--font-geist-mono)] leading-none self-end mb-2 ml-2 w-[2ch]"
					>
						{time.seconds}
					</span>
				</motion.div>

				{/* Date */}
				<motion.p
					initial={{ opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.5 }}
					className="text-sm text-[var(--color-text-muted)] tracking-wide"
				>
					{formatDate(now)}
				</motion.p>

				{/* Urgent items badge */}
				{urgentCount > 0 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{
							delay: 0.4,
							type: 'spring',
							stiffness: 200,
							damping: 20,
						}}
						className="flex items-center gap-2 px-4 py-2 rounded-full"
						style={{
							background: 'rgba(37,99,235,0.06)',
							border: '1px solid rgba(37,99,235,0.1)',
						}}
					>
						<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
						<span className="text-xs font-medium text-[var(--color-primary)]">
							<span className="font-[family-name:var(--font-geist-mono)]">
								{urgentCount}
							</span>{' '}
							item{urgentCount !== 1 ? 's' : ''} need attention
						</span>
					</motion.div>
				)}

				{/* Module tiles */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.5 }}
					className="flex flex-wrap items-center justify-center gap-2 max-w-[640px] mt-2"
				>
					{allowedModules.map((mod, i) => (
						<motion.div
							key={mod.id}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.35 + i * 0.03, duration: 0.3 }}
						>
							<Button
								onPress={() => setActiveModule(mod.id)}
								aria-label={mod.labelKey}
								className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 outline-none hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
							>
								<mod.icon
									size={16}
									strokeWidth={1.5}
									className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors duration-200"
								/>
								<span className="text-xs font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors duration-200">
									{t(mod.labelKey)}
								</span>
							</Button>
						</motion.div>
					))}
				</motion.div>
			</div>
		</div>
	)
}
