import { X } from 'lucide-react'
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { MODULES } from '../../lib/modules'
import { useAIChatStore } from '../../stores/ai-chat'

interface WindowHeaderProps {
	moduleId: string
	onClose: () => void
}

/**
 * WindowHeader — the ruled rail above every module. Consistent across
 * the internal app: Ask Lyon toggle on the leading edge (italic with a
 * dot indicator), module identity in the middle (Archivo 500), module-
 * specific actions next to it (italic-word links, no rounded chrome),
 * and a precise close X on the trailing edge.
 */
export function WindowHeader({ moduleId, onClose }: WindowHeaderProps) {
	const { t } = useTranslation('internal')
	const toggleAIChat = useAIChatStore((s) => s.toggle)
	const isAIOpen = useAIChatStore((s) => s.isOpen)

	const mod = MODULES.find((m) => m.id === moduleId)
	if (!mod) return null

	const Icon = mod.icon

	return (
		<div
			data-window-header="true"
			className="flex items-center justify-between h-12 px-5 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]"
		>
			<div className="flex items-center gap-5">
				{/* Ask Lyon — italic with dot indicator, no rounded pill */}
				<TooltipTrigger delay={3000}>
					<Button
						onPress={toggleAIChat}
						aria-label="Ask Lyon AI"
						className={`group inline-flex items-center gap-2 font-[family-name:var(--font-archivo)] italic transition-colors cursor-pointer ${
							isAIOpen
								? 'text-[var(--color-primary)]'
								: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
						}`}
						style={{ fontSize: '12px' }}
					>
						<span
							aria-hidden="true"
							className={`h-[7px] w-[7px] rounded-full transition-colors ${
								isAIOpen
									? 'bg-[var(--color-primary)]'
									: 'bg-transparent ring-1 ring-inset ring-[var(--color-text-subtle)] group-hover:ring-[var(--color-text)]'
							}`}
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

				<Rule />

				{/* Module identity — icon + Archivo label */}
				<div className="flex items-center gap-2">
					<Icon
						size={14}
						strokeWidth={1.5}
						className="text-[var(--color-text-muted)]"
					/>
					<span
						className="font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
						style={{
							fontSize: '13px',
							fontWeight: 500,
							letterSpacing: '-0.005em',
						}}
					>
						{t(mod.labelKey)}
					</span>
				</div>

				{moduleId === 'dispatch' && (
					<>
						<Rule />
						<HeaderLink
							href="tel:+20235551234"
							tone="muted"
							label="warehouse"
						/>
						<HeaderLink href="tel:991" tone="signal" label="emergency" />
					</>
				)}
			</div>

			<Button
				onPress={onClose}
				aria-label="Close"
				className="flex items-center justify-center w-7 h-7 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors duration-150 cursor-pointer"
			>
				<X size={16} strokeWidth={1.5} />
			</Button>
		</div>
	)
}

function Rule() {
	return (
		<div
			aria-hidden="true"
			className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]"
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
