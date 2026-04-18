import { type AuthSession, hasPermission } from '@hyperquote/auth'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button, DialogTrigger, Popover } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { MODULES } from '../../lib/modules'
import { getUrgentItems } from '../../lib/server/urgent-items'
import { useInternalStore } from '../../stores/internal'
import { useNotificationStore } from '../../stores/notifications'

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
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(id)
	}, [])
	return now
}

function getGreeting(hour: number): string {
	if (hour >= 5 && hour < 12) return 'good morning'
	if (hour >= 12 && hour < 17) return 'good afternoon'
	if (hour >= 17 && hour < 22) return 'good evening'
	return 'good night'
}

function formatTime(date: Date): { hm: string; s: string } {
	const h = date.getHours().toString().padStart(2, '0')
	const m = date.getMinutes().toString().padStart(2, '0')
	const s = date.getSeconds().toString().padStart(2, '0')
	return { hm: `${h}:${m}`, s }
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
	if (count === 0) return 'all clear · nothing needs attention'
	if (count === 1) return 'one thing needs your attention'
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
	const time = formatTime(now)
	const setActiveModule = useInternalStore((s) => s.setActiveModule)
	const unreadCount = useNotificationStore((s) => s.unreadCount)
	const toggleNotifications = useNotificationStore((s) => s.toggleWindow)
	const [awayActive, setAwayActive] = useState(false)

	const name = auth.user?.user_metadata?.name ?? ''
	const firstName = (name.split(' ')[0] || 'there').toLowerCase()
	const greeting = getGreeting(now.getHours())

	const allowedModules = MODULES.filter((m) =>
		hasPermission(auth, m.permission),
	)

	const { data: urgentData } = useQuery({
		queryKey: ['urgent-items'],
		queryFn: () => getUrgentItems(),
		staleTime: 60_000,
	})

	const attention = buildAttentionFeed(urgentData?.breakdown)
	const urgentCount = urgentData?.total ?? 0
	const modulesWithAttention = new Set(attention.map((a) => a.moduleId))

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden select-none bg-dot-grid">
			<Masthead
				now={now}
				firstName={firstName}
				fullName={name}
				roles={auth.roles ?? []}
				unreadCount={unreadCount}
				onOpenNotifications={toggleNotifications}
			/>

			{/* Centerpiece — clock + greeting. Clicking the clock pulls
			    the away screen down over the entire canvas. */}
			<div className="relative z-10 flex flex-1 min-h-0 flex-col items-center justify-center px-12">
				<button
					type="button"
					onClick={() => setAwayActive(true)}
					aria-label="Mark myself as away"
					className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
				>
					<Clock hm={time.hm} s={time.s} />
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
			<div className="relative z-10 shrink-0 px-12 pb-10">
				<SectionRule label={attentionHeadline(urgentCount)} />
				{attention.length > 0 && (
					<div className="mt-5 flex flex-col gap-2.5 max-w-[640px] mx-auto">
						{attention.map((row, i) => (
							<AttentionRow
								key={`${row.moduleId}-${row.label}`}
								row={row}
								index={i}
								onJump={() => setActiveModule(row.moduleId)}
							/>
						))}
					</div>
				)}

				<div className="mt-10">
					<SectionRule label="modules" />
					<div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
						{allowedModules.map((mod, i) => (
							<ModuleLink
								key={mod.id}
								label={t(mod.labelKey)}
								hasAttention={modulesWithAttention.has(mod.id)}
								index={i}
								onJump={() => setActiveModule(mod.id)}
							/>
						))}
					</div>
				</div>
			</div>

			<AnimatePresence>
				{awayActive && (
					<AwayScreen
						now={now}
						firstName={firstName}
						onUnlock={() => setAwayActive(false)}
					/>
				)}
			</AnimatePresence>
		</div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function Masthead({
	now,
	firstName,
	fullName,
	roles,
	unreadCount,
	onOpenNotifications,
}: {
	now: Date
	firstName: string
	fullName: string
	roles: string[]
	unreadCount: number
	onOpenNotifications: () => void
}) {
	return (
		<div className="relative z-10 shrink-0 px-12 pt-5 pb-3">
			<div className="flex items-start justify-between gap-6">
				{/* Left — organizational identity. Clicking the wordmark
				    toggles paper mode; that's the only entry point now. */}
				<div className="flex items-baseline gap-2">
					<button
						type="button"
						onClick={() => {
							const html = document.documentElement
							const isPaper = html.getAttribute('data-theme') === 'paper'
							if (isPaper) {
								html.removeAttribute('data-theme')
								localStorage.setItem('hq-theme', 'light')
							} else {
								html.setAttribute('data-theme', 'paper')
								localStorage.setItem('hq-theme', 'paper')
							}
						}}
						aria-label="Toggle paper mode"
						className="font-[family-name:var(--font-literata)] italic text-[var(--color-text)] outline-none transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							letterSpacing: '-0.01em',
						}}
					>
						HyperQuote
					</button>
					<span
						className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
						style={{ fontSize: '11px' }}
					>
						· internal ops
					</span>
				</div>

				{/* Right — dateline + subscriber byline */}
				<div className="flex flex-col items-end gap-1.5">
					<div className="flex items-baseline gap-2">
						<span
							className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]"
							style={{ fontSize: '11px', letterSpacing: '0.06em' }}
						>
							{formatMastheadDate(now)}
						</span>
						<span
							className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
							style={{ fontSize: '11px', letterSpacing: '0.06em' }}
						>
							· {formatWeekNumber(now)}
						</span>
					</div>
					<div className="flex items-baseline gap-2">
						<span
							className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
							style={{ fontSize: '11px' }}
						>
							signed
						</span>
						<ProfileTrigger
							firstName={firstName}
							fullName={fullName}
							roles={roles}
						/>
						<NotificationsTrigger
							unreadCount={unreadCount}
							onOpen={onOpenNotifications}
						/>
					</div>
				</div>
			</div>
			<div
				aria-hidden="true"
				className="mt-3 h-px w-full bg-black/[0.1] dark:bg-white/[0.1]"
			/>
		</div>
	)
}

function NotificationsTrigger({
	unreadCount,
	onOpen,
}: {
	unreadCount: number
	onOpen: () => void
}) {
	const label = unreadCount === 0 ? 'no new' : `${unreadCount} new`
	const isBrand = unreadCount > 0
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label={unreadCount === 0 ? 'No new notifications' : 'Notifications'}
			className="group inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic transition-colors"
			style={{
				fontSize: '11px',
				color: isBrand ? 'var(--color-primary)' : 'var(--color-text-subtle)',
			}}
		>
			<span aria-hidden="true" style={{ color: 'var(--color-text-subtle)' }}>
				·
			</span>
			{isBrand && (
				<span
					aria-hidden="true"
					className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] animate-pulse"
				/>
			)}
			<span className="group-hover:text-[var(--color-primary)] transition-colors">
				{label}
			</span>
		</button>
	)
}

// ─── Clock ───────────────────────────────────────────────

function Clock({ hm, s }: { hm: string; s: string }) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.98 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ type: 'spring', stiffness: 220, damping: 24 }}
			className="flex items-baseline gap-3"
		>
			<span
				suppressHydrationWarning
				className="font-[family-name:var(--font-literata)] tabular-nums text-[var(--color-text)]"
				style={{
					fontSize: 'clamp(110px, 16vw, 170px)',
					fontWeight: 500,
					letterSpacing: '-0.04em',
					lineHeight: 0.85,
				}}
			>
				{hm.split(':').map((part, i, arr) => (
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
			<span
				suppressHydrationWarning
				className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)] self-end mb-3"
				style={{
					fontSize: 'clamp(28px, 3.2vw, 40px)',
					letterSpacing: '0.02em',
					lineHeight: 1,
				}}
			>
				·{s}
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
	index,
	onJump,
}: {
	row: AttentionRow
	index: number
	onJump: () => void
}) {
	return (
		<motion.button
			type="button"
			onClick={onJump}
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 + index * 0.05, duration: 0.32 }}
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
				style={{ fontSize: '13px', letterSpacing: '-0.005em' }}
			>
				{row.label}
			</span>
			<span
				className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors"
				style={{ fontSize: '12px' }}
			>
				→ {row.moduleId.replace('-', ' ')}
			</span>
		</motion.button>
	)
}

// ─── Module link ─────────────────────────────────────────

function ModuleLink({
	label,
	hasAttention,
	index,
	onJump,
}: {
	label: string
	hasAttention: boolean
	index: number
	onJump: () => void
}) {
	return (
		<motion.button
			type="button"
			onClick={onJump}
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4 + index * 0.03, duration: 0.3 }}
			className="group inline-flex items-baseline gap-1.5 font-[family-name:var(--font-literata)] italic transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
			style={{ fontSize: '15px', letterSpacing: '-0.005em' }}
		>
			{hasAttention && (
				<span
					aria-hidden="true"
					className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)]"
				/>
			)}
			{label.toLowerCase()}
		</motion.button>
	)
}

// ─── Profile trigger ─────────────────────────────────────

function ProfileTrigger({
	firstName,
	fullName,
	roles,
}: {
	firstName: string
	fullName: string
	roles: string[]
}) {
	return (
		<DialogTrigger>
			<Button
				aria-label={`Profile — signed in as ${fullName}`}
				className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text)] hover:text-[var(--color-primary)] cursor-pointer outline-none transition-colors"
				style={{ fontSize: '11px' }}
			>
				· {firstName}
			</Button>
			<Popover
				placement="bottom end"
				offset={8}
				aria-label="Profile menu"
				className="min-w-[220px] rounded-xl bg-[var(--color-surface)] p-2 outline-none shadow-xl shadow-black/10"
			>
				<div className="mb-1 px-3 py-2.5">
					<p
						className="font-[family-name:var(--font-literata)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							color: 'var(--color-text)',
							letterSpacing: '-0.01em',
						}}
					>
						{fullName}
					</p>
					<p
						className="mt-0.5 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
						style={{ fontSize: '11px' }}
					>
						{roles[0] ?? 'employee'}
					</p>
				</div>
			</Popover>
		</DialogTrigger>
	)
}

// ─── Away screen ─────────────────────────────────────────

const AWAY_PASSWORD = '1234'

function AwayScreen({
	now,
	firstName,
	onUnlock,
}: {
	now: Date
	firstName: string
	onUnlock: () => void
}) {
	const [digits, setDigits] = useState<string[]>(['', '', '', ''])
	const [shake, setShake] = useState(false)
	const [awaySince] = useState(() => now)
	const inputsRef = useRef<Array<HTMLInputElement | null>>([])

	// Autofocus first slot on mount + refocus whenever the page loses
	// focus. The locked screen should never lose caret — the only way
	// back is typing four digits.
	useEffect(() => {
		const focusActiveSlot = () => {
			const firstEmpty = digits.findIndex((d) => !d)
			const target = firstEmpty === -1 ? 3 : firstEmpty
			inputsRef.current[target]?.focus()
		}
		focusActiveSlot()
		const interval = setInterval(focusActiveSlot, 200)
		window.addEventListener('blur', focusActiveSlot)
		document.addEventListener('visibilitychange', focusActiveSlot)
		return () => {
			clearInterval(interval)
			window.removeEventListener('blur', focusActiveSlot)
			document.removeEventListener('visibilitychange', focusActiveSlot)
		}
	}, [digits])

	const handleChange = (i: number, value: string) => {
		const clean = value.replace(/\D/g, '').slice(-1)
		const next = [...digits]
		next[i] = clean
		setDigits(next)
		if (clean && i < 3) inputsRef.current[i + 1]?.focus()
		if (next.join('').length === 4) {
			if (next.join('') === AWAY_PASSWORD) {
				onUnlock()
			} else {
				setShake(true)
				setTimeout(() => {
					setShake(false)
					setDigits(['', '', '', ''])
					inputsRef.current[0]?.focus()
				}, 520)
			}
		}
	}

	const handleKeyDown = (
		i: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === 'Backspace' && !digits[i] && i > 0) {
			inputsRef.current[i - 1]?.focus()
			return
		}
		if (e.key === 'Escape') {
			e.preventDefault()
			// Escape does NOT close — the only exit is the password
		}
	}

	const hm = formatTime(now).hm
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
			transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
				transition={{ delay: 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
						letterSpacing: '-0.022em',
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

			{/* Passcode — four tight dots, almost invisible until filled. */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3, duration: 0.4 }}
				className="absolute bottom-20 flex flex-col items-center"
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
					className="flex items-center gap-5"
				>
					{digits.map((d, i) => (
						<PasscodeDot
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-slot array
							key={i}
							index={i}
							value={d}
							filled={d.length > 0}
							inputRef={(el) => {
								inputsRef.current[i] = el
							}}
							onChange={(e) => handleChange(i, e.target.value)}
							onKeyDown={(e) => handleKeyDown(i, e)}
						/>
					))}
				</motion.div>
				<span
					className="mt-4 font-[family-name:var(--font-geist-mono)] uppercase"
					style={{
						fontSize: '9px',
						letterSpacing: '0.32em',
						color: shake ? '#F87171' : 'rgba(255,255,255,0.22)',
					}}
				>
					{shake ? 'incorrect' : 'four digits'}
				</span>
			</motion.div>
		</motion.div>
	)
}

function PasscodeDot({
	index,
	value,
	filled,
	inputRef,
	onChange,
	onKeyDown,
}: {
	index: number
	value: string
	filled: boolean
	inputRef: (el: HTMLInputElement | null) => void
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
	return (
		<label
			className="relative inline-flex h-8 w-8 items-center justify-center"
			aria-label={`Digit ${index + 1} of 4`}
		>
			{/* Hidden input — invisible, but captures the keystroke. */}
			<input
				ref={inputRef}
				type="password"
				inputMode="numeric"
				maxLength={1}
				value={value}
				onChange={onChange}
				onKeyDown={onKeyDown}
				className="absolute inset-0 h-full w-full opacity-0 outline-none"
				style={{ caretColor: 'transparent' }}
			/>
			{/* Visual dot — hollow ring when empty, solid dot when filled. */}
			<motion.span
				aria-hidden="true"
				animate={{
					scale: filled ? 1 : 0.8,
					backgroundColor: filled
						? 'rgba(245,245,245,0.92)'
						: 'rgba(255,255,255,0)',
					borderColor: filled
						? 'rgba(245,245,245,0.92)'
						: 'rgba(255,255,255,0.28)',
				}}
				transition={{ duration: 0.18, ease: 'easeOut' }}
				className="h-[7px] w-[7px] rounded-full"
				style={{ borderWidth: '1px', borderStyle: 'solid' }}
			/>
		</label>
	)
}
