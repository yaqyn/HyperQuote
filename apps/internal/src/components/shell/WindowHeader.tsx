import { Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from 'react-aria-components/Button'
import { Tooltip, TooltipTrigger } from 'react-aria-components/Tooltip'
import { useTranslation } from 'react-i18next'
import { MODULES } from '../../lib/modules'
import { useAIChatStore } from '../../stores/ai-chat'
import { useSalesStore } from '../../stores/sales'

interface WindowHeaderProps {
	moduleId: string
	onClose: () => void
	tone?: 'default' | 'dark'
}

const INTERNAL_WAREHOUSE_PHONE_E164 =
	import.meta.env.VITE_INTERNAL_WAREHOUSE_PHONE_E164 ?? ''
const INTERNAL_EMERGENCY_PHONE_E164 =
	import.meta.env.VITE_INTERNAL_EMERGENCY_PHONE_E164 ?? ''

/**
 * WindowHeader — the ruled rail above every module. Consistent across
 * the internal app: Ask Lyon toggle on the leading edge (italic with a
 * dot indicator), module identity in the middle (Archivo 500), module-
 * specific actions next to it (italic-word links, no rounded chrome),
 * and a precise close X on the trailing edge.
 */
export function WindowHeader({
	moduleId,
	onClose,
	tone = 'default',
}: WindowHeaderProps) {
	const { t } = useTranslation('internal')
	const toggleAIChat = useAIChatStore((s) => s.toggle)
	const isAIOpen = useAIChatStore((s) => s.isOpen)
	const requestNewQuote = useSalesStore((s) => s.requestNewQuote)
	const requestStatusDialog = useSalesStore((s) => s.requestStatusDialog)
	const quotePriceRefreshHandler = useSalesStore(
		(s) => s.quotePriceRefreshHandler,
	)
	const quotePriceRefreshAvailable = useSalesStore(
		(s) => s.quotePriceRefreshAvailable,
	)
	const quotePriceRefreshing = useSalesStore((s) => s.quotePriceRefreshing)

	const mod = MODULES.find((m) => m.id === moduleId)
	if (!mod) return null

	const Icon = mod.icon
	const isDark = tone === 'dark'
	const headerClass = isDark
		? 'flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#050505] px-3 text-white sm:px-5'
		: 'flex h-12 shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-3 dark:border-white/[0.06] sm:px-5'
	const askClass = isDark
		? isAIOpen
			? 'text-white'
			: 'text-white/38 hover:text-white/72'
		: isAIOpen
			? 'text-[var(--color-primary)]'
			: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
	const askDotClass = isDark
		? isAIOpen
			? 'bg-white/70'
			: 'bg-transparent ring-1 ring-inset ring-white/24 group-hover:ring-white/54'
		: isAIOpen
			? 'bg-[var(--color-primary)]'
			: 'bg-transparent ring-1 ring-inset ring-[var(--color-text-subtle)] group-hover:ring-[var(--color-text)]'
	const iconClass = isDark
		? 'shrink-0 text-white/42'
		: 'shrink-0 text-[var(--color-text-muted)]'
	const labelClass = isDark
		? 'min-w-0 truncate font-[family-name:var(--font-archivo)] text-white/72'
		: 'min-w-0 truncate font-[family-name:var(--font-archivo)] text-[var(--color-text)]'
	const closeClass = isDark
		? 'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-white/34 transition-colors duration-150 hover:text-white sm:h-7 sm:w-7'
		: 'flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-text-subtle)] transition-colors duration-150 hover:text-[var(--color-text)] sm:h-7 sm:w-7 cursor-pointer'

	return (
		<div data-window-header="true" className={headerClass}>
			<div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
				{/* Ask Lyon — italic with dot indicator, no rounded pill */}
				<TooltipTrigger delay={3000}>
					<Button
						onPress={toggleAIChat}
						aria-label="Ask Lyon AI"
						className={`group inline-flex shrink-0 cursor-pointer items-center gap-2 font-[family-name:var(--font-archivo)] italic transition-colors ${askClass}`}
						style={{ fontSize: '12px' }}
					>
						<span
							aria-hidden="true"
							className={`h-[7px] w-[7px] rounded-full transition-colors ${askDotClass}`}
						/>
						ask lyon
					</Button>
					<Tooltip
						offset={6}
						className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-black"
					>
						Lyon AI · ⌘K
					</Tooltip>
				</TooltipTrigger>

				<Rule tone={tone} />

				{/* Module identity — icon + Archivo label */}
				<div className="flex min-w-0 items-center gap-2">
					<Icon size={14} strokeWidth={1.5} className={iconClass} />
					<span
						className={labelClass}
						style={{
							fontSize: '13px',
							fontWeight: 500,
							letterSpacing: '0',
						}}
					>
						{t(mod.labelKey)}
					</span>
					{moduleId === 'sales' && (
						<>
							<Button
								onPress={requestStatusDialog}
								aria-label="Open sales status"
								className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md border border-black/[0.08] px-2.5 font-[family-name:var(--font-archivo)] text-[11px] font-semibold text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:border-white/[0.1]"
							>
								Status
							</Button>
							{quotePriceRefreshHandler && (
								<TooltipTrigger delay={600}>
									<Button
										onPress={quotePriceRefreshHandler}
										aria-label="Refresh quote prices"
										isDisabled={
											!quotePriceRefreshAvailable || quotePriceRefreshing
										}
										className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-black/[0.08] text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1]"
									>
										{quotePriceRefreshing ? (
											<Loader2
												size={14}
												strokeWidth={2.25}
												aria-hidden="true"
												className="animate-spin"
											/>
										) : (
											<RefreshCw
												size={14}
												strokeWidth={2.25}
												aria-hidden="true"
											/>
										)}
									</Button>
									<Tooltip
										offset={6}
										className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-black"
									>
										Refresh quote prices
									</Tooltip>
								</TooltipTrigger>
							)}
							<Button
								onPress={requestNewQuote}
								aria-label="Start a new quote"
								className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-black/[0.08] bg-[var(--color-primary)] font-[family-name:var(--font-archivo)] text-[16px] font-semibold leading-none text-white outline-none transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:border-white/[0.1]"
							>
								+
							</Button>
						</>
					)}
				</div>

				{moduleId === 'dispatch' &&
					(INTERNAL_WAREHOUSE_PHONE_E164 || INTERNAL_EMERGENCY_PHONE_E164) && (
						<div className="hidden items-center gap-5 sm:flex">
							<Rule tone={tone} />
							{INTERNAL_WAREHOUSE_PHONE_E164 && (
								<HeaderLink
									href={`tel:${INTERNAL_WAREHOUSE_PHONE_E164}`}
									tone="muted"
									label="warehouse"
								/>
							)}
							{INTERNAL_EMERGENCY_PHONE_E164 && (
								<HeaderLink
									href={`tel:${INTERNAL_EMERGENCY_PHONE_E164}`}
									tone="signal"
									label="emergency"
								/>
							)}
						</div>
					)}
			</div>

			<Button onPress={onClose} aria-label="Close" className={closeClass}>
				<X size={16} strokeWidth={1.5} />
			</Button>
		</div>
	)
}

function Rule({ tone = 'default' }: { tone?: 'default' | 'dark' }) {
	return (
		<div
			aria-hidden="true"
			className={
				tone === 'dark'
					? 'h-4 w-px bg-white/[0.08]'
					: 'h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]'
			}
		/>
	)
}

function HeaderLink({
	href,
	label,
	tone,
}: {
	href: string
	label: string
	tone: 'muted' | 'signal'
}) {
	const color =
		tone === 'signal'
			? 'text-[var(--color-signal-red)] hover:text-[var(--color-signal-red)]'
			: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
	return (
		<a
			href={href}
			className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-archivo)] italic transition-colors ${color}`}
			style={{ fontSize: '12px' }}
		>
			<svg
				aria-hidden="true"
				width="11"
				height="11"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
			</svg>
			{label}
		</a>
	)
}
