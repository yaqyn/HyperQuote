import { type AuthSession, hasPermission } from '@hyperquote/auth'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronDown, type LucideIcon, PanelsTopLeft } from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { DialogTrigger } from 'react-aria-components/Dialog'
import { Popover } from 'react-aria-components/Popover'
import { useTranslation } from 'react-i18next'
import { MODULES } from '../../lib/modules'
import { validateCurrentInternalPassword } from '../../lib/server/internal-auth'
import { getUrgentItems } from '../../lib/server/urgent-items'
import { useInternalStore } from '../../stores/internal'
import { AppActionsMenu } from './AppActionsMenu'

/**
 * InternalCanvas — the Front Page.
 *
 * Always-on ambient screen for the ops floor. Composed as an editorial
 * masthead: dated banner on top, a serif clock as the centerpiece,
 * an attention feed ranked by severity, and a module roll as a bottom
 * rail. Employees can read it from across the room and find what's
 * happening at a glance.
 */

function useCurrentTime() {
	const [now, setNow] = useState<Date | null>(null)
	useEffect(() => {
		setNow(new Date())
		const id = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(id)
	}, [])
	return now
}

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false)
	useEffect(() => {
		const media = window.matchMedia(query)
		const handleChange = () => setMatches(media.matches)
		handleChange()
		media.addEventListener('change', handleChange)
		return () => media.removeEventListener('change', handleChange)
	}, [query])
	return matches
}

function getGreeting(hour: number): string {
	if (hour >= 5 && hour < 12) return 'good morning'
	if (hour >= 12 && hour < 17) return 'good afternoon'
	if (hour >= 17 && hour < 22) return 'good evening'
	return 'good night'
}

function formatTime(date: Date): string {
	const h = date.getHours().toString().padStart(2, '0')
	const m = date.getMinutes().toString().padStart(2, '0')
	return `${h}:${m}`
}

function formatMastheadDate(date: Date): string {
	return date
		.toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		})
		.toLowerCase()
}

function formatWeekNumber(date: Date): string {
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	)
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	const weekNo = Math.ceil(
		((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
	)
	return `w${weekNo.toString().padStart(2, '0')}`
}

// ─── Attention feed mapping ─────────────────────────────

interface AttentionRow {
	count: number
	label: string
	moduleId: string
}

interface PanelOption {
	id: string
	icon: LucideIcon
	label: string
	hotkey: string
	hasAttention: boolean
}

function buildAttentionFeed(breakdown?: {
	unassignedRfqs: number
	expiringQuotes: number
	pendingApprovals: number
	problemDeliveries: number
	overdueInvoices: number
	slaBreaches: number
}): AttentionRow[] {
	if (!breakdown) return []
	const rows: AttentionRow[] = []
	if (breakdown.unassignedRfqs > 0)
		rows.push({
			count: breakdown.unassignedRfqs,
			label:
				breakdown.unassignedRfqs === 1
					? 'unassigned rfq over 30 minutes'
					: 'unassigned rfqs over 30 minutes',
			moduleId: 'sales',
		})
	if (breakdown.expiringQuotes > 0)
		rows.push({
			count: breakdown.expiringQuotes,
			label:
				breakdown.expiringQuotes === 1
					? 'quote expiring in 24 hours'
					: 'quotes expiring in 24 hours',
			moduleId: 'sales',
		})
	if (breakdown.problemDeliveries > 0)
		rows.push({
			count: breakdown.problemDeliveries,
			label:
				breakdown.problemDeliveries === 1
					? 'problem delivery'
					: 'problem deliveries',
			moduleId: 'dispatch',
		})
	if (breakdown.overdueInvoices > 0)
		rows.push({
			count: breakdown.overdueInvoices,
			label:
				breakdown.overdueInvoices === 1
					? 'overdue invoice'
					: 'overdue invoices',
			moduleId: 'finance',
		})
	if (breakdown.slaBreaches > 0)
		rows.push({
			count: breakdown.slaBreaches,
			label: breakdown.slaBreaches === 1 ? 'sla breach' : 'sla breaches',
			moduleId: 'customer-service',
		})
	if (breakdown.pendingApprovals > 0)
		rows.push({
			count: breakdown.pendingApprovals,
			label:
				breakdown.pendingApprovals === 1
					? 'approval pending'
					: 'approvals pending',
			moduleId: 'admin',
		})
	return rows
}

function attentionHeadline(count: number): string {
	if (count <= 1) return 'one thing needs your attention'
	if (count === 2) return 'two things need your attention'
	if (count === 3) return 'three things need your attention'
	return `${count} things need your attention`
}

// ─── Canvas ─────────────────────────────────────────────

interface InternalCanvasProps {
	auth: AuthSession
}

export function InternalCanvas({ auth }: InternalCanvasProps) {
	const { t } = useTranslation('internal')
	const now = useCurrentTime()
	const time = now ? formatTime(now) : '--:--'
	const setActiveModule = useInternalStore((s) => s.setActiveModule)
	const [awayActive, setAwayActive] = useState(false)
	const canLockFromClock = useMediaQuery('(min-width: 640px)')
	const reduceMotion = useReducedMotion()

	const name = auth.user?.user_metadata?.name ?? ''
	const firstName = (name.split(' ')[0] || 'there').toLowerCase()
	const greeting = now ? getGreeting(now.getHours()) : 'welcome'

	const allowedModules = MODULES.filter((m) =>
		hasPermission(auth, m.permission),
	)

	const { data: urgentData } = useQuery({
		queryKey: ['urgent-items'],
		queryFn: () => getUrgentItems(),
		staleTime: 60_000,
	})

	useEffect(() => {
		window.dispatchEvent(
			new CustomEvent('internal-away-state-change', {
				detail: { away: awayActive },
			}),
		)
	}, [awayActive])

	const attention = buildAttentionFeed(urgentData?.breakdown)
	const urgentCount = urgentData?.total ?? 0
	const modulesWithAttention = new Set(attention.map((a) => a.moduleId))
	const panelOptions: PanelOption[] = allowedModules.map((mod) => ({
		id: mod.id,
		icon: mod.icon,
		label: t(mod.labelKey),
		hotkey: mod.hotkey,
		hasAttention: modulesWithAttention.has(mod.id),
	}))

	return (
		<motion.div
			className="relative flex h-full w-full flex-col overflow-hidden select-none bg-dot-grid"
			animate={
				reduceMotion
					? undefined
					: {
							'--dot-wave-x': ['132%', '-32%'],
						}
			}
			transition={{
				duration: 12,
				repeat: Number.POSITIVE_INFINITY,
				ease: 'linear',
			}}
		>
			<Masthead now={now} />

			{/* Centerpiece — clock + greeting. Clicking the clock pulls
			    the away screen down over the entire canvas. */}
			<div className="relative z-10 flex flex-1 min-h-0 flex-col items-center justify-center px-4 sm:px-8 lg:px-12">
				<button
					type="button"
					onClick={() => {
						if (canLockFromClock) setAwayActive(true)
					}}
					aria-label={
						canLockFromClock ? 'Mark myself as away' : 'Clock display'
					}
					aria-disabled={!canLockFromClock}
					className={`rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
						canLockFromClock ? '' : 'cursor-default'
					}`}
				>
					<Clock time={time} />
				</button>
				<motion.p
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.18, duration: 0.5 }}
					className="mt-6 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
					style={{ fontSize: '14px', letterSpacing: '0.005em' }}
				>
					{greeting}, {firstName}
				</motion.p>
			</div>

			{/* Bottom stack — attention feed + module roll */}
			<div className="relative z-10 shrink-0 px-4 pb-5 sm:px-8 sm:pb-8 lg:px-12 lg:pb-10">
				{attention.length > 0 && (
					<>
						<SectionRule label={attentionHeadline(urgentCount)} />
						<div className="mt-5 flex flex-col gap-2.5 max-w-[640px] mx-auto">
							{attention.map((row) => (
								<AttentionRow
									key={`${row.moduleId}-${row.label}`}
									row={row}
									onJump={() => setActiveModule(row.moduleId)}
								/>
							))}
						</div>
					</>
				)}

				<div className="mt-10">
					<div className="hidden lg:block">
						<SectionRule label="modules" />
					</div>
					<div className="mt-5 hidden flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:flex">
						{panelOptions.map((mod) => (
							<ModuleLink
								key={mod.id}
								label={mod.label}
								hasAttention={mod.hasAttention}
								onJump={() => setActiveModule(mod.id)}
							/>
						))}
					</div>
					<div className="mt-5 flex justify-center lg:hidden">
						<PanelMenu
							modules={panelOptions}
							onJump={(id) => setActiveModule(id)}
						/>
					</div>
				</div>
			</div>

			<AnimatePresence>
				{awayActive && (
					<AwayScreen
						now={now ?? new Date()}
						firstName={firstName}
						onUnlock={() => setAwayActive(false)}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function Masthead({ now }: { now: Date | null }) {
	return (
		<div className="relative z-10 shrink-0 px-4 pt-4 pb-3 sm:px-8 lg:px-12 lg:pt-5">
			<div className="flex items-baseline justify-between gap-6">
				{/* Left — organizational identity. Clicking the wordmark toggles
				    the quiet night-light surface. */}
				<div className="flex items-baseline gap-2 leading-none">
					<button
						type="button"
						onClick={() => {
							const html = document.documentElement
							const isNightLight =
								html.getAttribute('data-theme') === 'night-light'
							if (isNightLight) {
								html.removeAttribute('data-theme')
								localStorage.setItem('hq-theme', 'light')
							} else {
								html.setAttribute('data-theme', 'night-light')
								localStorage.setItem('hq-theme', 'night-light')
							}
						}}
						aria-label="Toggle night light"
						className="font-[family-name:var(--font-literata)] italic text-[var(--color-text)] outline-none transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							letterSpacing: '0',
						}}
					>
						HyperQuote
					</button>
					<AppActionsMenu />
				</div>

				{/* Right — dateline */}
				<div className="flex items-baseline gap-2 leading-none">
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]"
						style={{
							fontSize: '11px',
							letterSpacing: '0.06em',
							lineHeight: 1,
						}}
					>
						{now ? formatMastheadDate(now) : 'loading'}
					</span>
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
						style={{
							fontSize: '11px',
							letterSpacing: '0.06em',
							lineHeight: 1,
						}}
					>
						· {now ? formatWeekNumber(now) : 'w--'}
					</span>
				</div>
			</div>
			<div
				aria-hidden="true"
				className="mt-3 h-px w-full bg-black/[0.1] dark:bg-white/[0.1]"
			/>
		</div>
	)
}

// ─── Clock ───────────────────────────────────────────────

function Clock({ time }: { time: string }) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.98 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ type: 'spring', stiffness: 220, damping: 24 }}
			className="flex items-center justify-center"
		>
			<span
				suppressHydrationWarning
				className="font-[family-name:var(--font-literata)] text-[72px] tabular-nums text-[var(--color-text)] sm:text-[96px] lg:text-[clamp(110px,16vw,170px)]"
				style={{
					fontWeight: 500,
					letterSpacing: '0',
					lineHeight: 0.85,
				}}
			>
				{time.split(':').map((part, i, arr) => (
					<span key={part + String(i)}>
						{part}
						{i < arr.length - 1 && (
							<span
								aria-hidden="true"
								style={{
									color: 'var(--color-primary)',
									fontWeight: 400,
									fontStyle: 'italic',
								}}
							>
								:
							</span>
						)}
					</span>
				))}
			</span>
		</motion.div>
	)
}

// ─── Section rule ────────────────────────────────────────

function SectionRule({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-4">
			<div
				className="h-px flex-1"
				style={{ backgroundColor: 'var(--color-border)', opacity: 0.6 }}
			/>
			<span
				className="font-[family-name:var(--font-archivo)] italic shrink-0 text-[var(--color-text-muted)]"
				style={{ fontSize: '11px', letterSpacing: '0.01em' }}
			>
				{label}
			</span>
			<div
				className="h-px flex-1"
				style={{ backgroundColor: 'var(--color-border)', opacity: 0.6 }}
			/>
		</div>
	)
}

// ─── Attention row ───────────────────────────────────────

function AttentionRow({
	row,
	onJump,
}: {
	row: AttentionRow
	onJump: () => void
}) {
	return (
		<button
			type="button"
			onClick={onJump}
			className="group flex items-baseline gap-4 py-1 text-start"
		>
			<span
				className="font-[family-name:var(--font-plex-mono)] tabular-nums shrink-0 text-[var(--color-primary)]"
				style={{ fontSize: '14px', fontWeight: 500, minWidth: '28px' }}
			>
				{row.count}
			</span>
			<span
				className="font-[family-name:var(--font-archivo)] italic flex-1 text-[var(--color-text)]"
				style={{ fontSize: '13px', letterSpacing: '0' }}
			>
				{row.label}
			</span>
			<span
				className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors"
				style={{ fontSize: '12px' }}
			>
				→ {row.moduleId.replace('-', ' ')}
			</span>
		</button>
	)
}

// ─── Module link ─────────────────────────────────────────

function ModuleLink({
	label,
	hasAttention,
	onJump,
}: {
	label: string
	hasAttention: boolean
	onJump: () => void
}) {
	return (
		<button
			type="button"
			onClick={onJump}
			className="group inline-flex items-baseline gap-1.5 font-[family-name:var(--font-literata)] italic transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
			style={{ fontSize: '15px', letterSpacing: '0' }}
		>
			{hasAttention && (
				<span
					aria-hidden="true"
					className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)]"
				/>
			)}
			{label.toLowerCase()}
		</button>
	)
}

// ─── Panel menu ──────────────────────────────────────────

function PanelMenu({
	modules,
	onJump,
}: {
	modules: PanelOption[]
	onJump: (id: string) => void
}) {
	const [isOpen, setIsOpen] = useState(false)
	const activeModule = useInternalStore((s) => s.activeModule)

	useEffect(() => {
		if (activeModule) setIsOpen(false)
	}, [activeModule])

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<Button
				aria-label="Open panels"
				className={`inline-flex h-12 min-w-[176px] items-center justify-center gap-3 rounded-lg border bg-[var(--color-surface)] px-4 font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
					isOpen
						? '-translate-y-0.5 border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/10'
						: 'border-[var(--color-border)] shadow-sm shadow-black/5'
				}`}
				style={{ fontSize: '14px', fontWeight: 600, letterSpacing: 0 }}
			>
				<PanelsTopLeft
					aria-hidden="true"
					size={18}
					strokeWidth={1.75}
					className={`text-[var(--color-primary)] transition-transform duration-200 ${
						isOpen ? 'scale-95' : 'scale-100'
					}`}
				/>
				<span>Panels</span>
				<ChevronDown
					aria-hidden="true"
					size={16}
					strokeWidth={1.75}
					className={`text-[var(--color-text-muted)] transition-transform duration-200 ${
						isOpen ? 'rotate-180' : 'rotate-0'
					}`}
				/>
			</Button>
			<Popover
				placement="top"
				offset={10}
				aria-label="Panels"
				className="panel-menu-popover rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-xl shadow-black/10 outline-none"
				style={{ width: 'min(360px, calc(100vw - 32px))' }}
			>
				<div className="flex flex-col">
					{modules.map((mod) => (
						<Button
							key={mod.id}
							onPress={() => {
								setIsOpen(false)
								onJump(mod.id)
							}}
							className="group flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-start outline-none transition-colors hover:bg-[var(--color-primary)]/8 focus-visible:bg-[var(--color-primary)]/8"
						>
							<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
								<mod.icon aria-hidden="true" size={17} strokeWidth={1.75} />
							</span>
							<span className="min-w-0 flex-1">
								<span
									className="block truncate font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
									style={{
										fontSize: '14px',
										fontWeight: 600,
										letterSpacing: 0,
									}}
								>
									{mod.label}
								</span>
							</span>
							{mod.hasAttention && (
								<span
									aria-hidden="true"
									className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
								/>
							)}
							<span
								className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[var(--color-text-subtle)]"
								style={{ fontSize: '11px', letterSpacing: 0 }}
							>
								{mod.hotkey}
							</span>
						</Button>
					))}
				</div>
			</Popover>
		</DialogTrigger>
	)
}

// ─── Away screen ─────────────────────────────────────────

function AwayScreen({
	now,
	firstName,
	onUnlock,
}: {
	now: Date
	firstName: string
	onUnlock: () => void
}) {
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [shake, setShake] = useState(false)
	const [awaySince] = useState(() => now)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const unlockMutation = useMutation({
		mutationFn: () =>
			validateCurrentInternalPassword({ data: { password: password.trim() } }),
		onSuccess: (result) => {
			if (result.ok) {
				onUnlock()
				return
			}
			setError('Password did not match your account.')
			setPassword('')
			setShake(true)
			setTimeout(() => {
				setShake(false)
				inputRef.current?.focus()
			}, 520)
		},
		onError: () => {
			setError('Could not verify your password.')
			setShake(true)
			setTimeout(() => setShake(false), 520)
		},
	})

	// Keep the unlock field active; the only way back is a verified password.
	useEffect(() => {
		const focusPassword = () => inputRef.current?.focus()
		focusPassword()
		const interval = setInterval(focusPassword, 200)
		window.addEventListener('blur', focusPassword)
		document.addEventListener('visibilitychange', focusPassword)
		return () => {
			clearInterval(interval)
			window.removeEventListener('blur', focusPassword)
			document.removeEventListener('visibilitychange', focusPassword)
		}
	}, [])

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError(null)
		if (!password.trim() || unlockMutation.isPending) return
		unlockMutation.mutate()
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			// Escape does NOT close — the only exit is the password
		}
	}

	const hm = formatTime(now)
	const elapsedMinutes = Math.floor(
		(now.getTime() - awaySince.getTime()) / 60_000,
	)

	return (
		<motion.div
			key="away-screen"
			role="dialog"
			aria-modal="true"
			aria-label="Away — enter password to return"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.35, ease: cubicBezier(0.16, 1, 0.3, 1) }}
			className="absolute inset-0 z-[100] flex flex-col items-center justify-center"
			data-away-lock="true"
			style={{ backgroundColor: '#030303' }}
			onMouseDown={(e) => e.preventDefault()}
			onContextMenu={(e) => e.preventDefault()}
		>
			{/* Corner brackets — corporate security-terminal framing */}
			<motion.div
				initial={{ y: 16, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{
					delay: 0.1,
					duration: 0.45,
					ease: cubicBezier(0.16, 1, 0.3, 1),
				}}
				className="flex flex-col items-center text-center"
			>
				{/* Friendly headline in Sherlock-era Fraunces italic —
				    two lines so the serif has room to breathe. High
				    contrast, detective-novel cover type held modestly. */}
				<h1
					className="font-[family-name:var(--font-fraunces)] italic text-center"
					style={{
						fontSize: 'clamp(54px, 7vw, 96px)',
						fontWeight: 500,
						fontStyle: 'italic',
						letterSpacing: '0',
						lineHeight: 1.02,
						color: '#F5F5F5',
						fontFeatureSettings: '"ss01" on, "ss02" on, "liga" on',
					}}
				>
					just stepped out
					<br />
					<span style={{ color: 'rgba(245,245,245,0.62)' }}>
						— back in a moment
					</span>
				</h1>

				{/* Name + time telemetry line — minimal, spaced out */}
				<div
					className="mt-6 flex items-baseline gap-3 font-[family-name:var(--font-geist-mono)] uppercase"
					style={{
						fontSize: '10.5px',
						letterSpacing: '0.28em',
						color: 'rgba(255,255,255,0.4)',
					}}
				>
					<span style={{ color: 'rgba(255,255,255,0.68)' }}>{firstName}</span>
					<span aria-hidden="true" style={{ opacity: 0.4 }}>
						·
					</span>
					<span suppressHydrationWarning>{hm}</span>
					<span aria-hidden="true" style={{ opacity: 0.4 }}>
						·
					</span>
					<span suppressHydrationWarning>
						{elapsedMinutes === 0 ? 'now' : `${elapsedMinutes}m`}
					</span>
				</div>
			</motion.div>

			<motion.form
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3, duration: 0.4 }}
				className="absolute bottom-20 flex w-[min(360px,calc(100vw-48px))] flex-col items-center gap-3"
				onSubmit={handleSubmit}
			>
				<motion.div
					animate={
						shake
							? {
									x: [0, -8, 8, -6, 6, -3, 3, 0],
									transition: { duration: 0.5 },
								}
							: {}
					}
					className="w-full"
				>
					<input
						ref={inputRef}
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						onKeyDown={handleKeyDown}
						aria-label="Enter your account password"
						autoComplete="current-password"
						className="h-14 w-full rounded-none border border-white/22 bg-white/[0.06] px-4 font-[family-name:var(--font-archivo)] text-[18px] text-white outline-none transition-colors placeholder:text-white/32 focus:border-white/60 focus:bg-white/[0.1]"
						placeholder="Account password"
					/>
				</motion.div>
				<button
					type="submit"
					disabled={!password.trim() || unlockMutation.isPending}
					className="h-11 w-full border border-white/22 bg-white/[0.08] px-4 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase text-white outline-none transition-colors hover:bg-white/[0.14] focus-visible:border-white/60 disabled:cursor-not-allowed disabled:opacity-45"
				>
					{unlockMutation.isPending ? 'Verifying' : 'Unlock'}
				</button>
				<span
					className="mt-4 font-[family-name:var(--font-geist-mono)] uppercase"
					style={{
						fontSize: '9px',
						letterSpacing: '0.32em',
						color: shake ? '#F87171' : 'rgba(255,255,255,0.22)',
					}}
				>
					{error ?? 'account password'}
				</span>
			</motion.form>
		</motion.div>
	)
}
