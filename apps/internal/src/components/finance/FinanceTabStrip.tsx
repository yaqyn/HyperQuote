import { BookOpen, History, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from 'react-aria-components'
import { type FinanceTab, useFinanceStore } from '../../stores/finance'

interface Register {
	id: FinanceTab
	mark: string
	title: string
	dek: string
	icon: LucideIcon
}

const REGISTERS: Register[] = [
	{
		id: 'deals-orders',
		mark: 'i',
		title: 'Live ledger',
		dek: 'payments to record',
		icon: BookOpen,
	},
	{
		id: 'history',
		mark: 'ii',
		title: 'History',
		dek: 'settled records',
		icon: History,
	},
]

/**
 * Finance's pair of work areas. The tabs stay as two fixed columns on
 * smaller screens so the operator never has to discover horizontal scroll.
 */
export function FinanceTabStrip() {
	const activeTab = useFinanceStore((s) => s.activeTab)
	const setActiveTab = useFinanceStore((s) => s.setActiveTab)

	return (
		<nav
			aria-label="Finance registers"
			className="relative border-b border-[var(--color-border)] px-3 py-3 sm:px-6 lg:px-8"
		>
			<ul className="grid grid-cols-2 gap-2">
				{REGISTERS.map((register) => {
					const isActive = register.id === activeTab
					const Icon = register.icon
					return (
						<li key={register.id} className="relative">
							<Button
								onPress={() => setActiveTab(register.id)}
								aria-current={isActive ? 'page' : undefined}
								className={`group relative flex min-h-[64px] w-full items-start gap-2 rounded-md border px-3 py-3 text-start outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/35 ${
									isActive
										? 'border-[var(--color-primary)]/55 bg-[var(--color-primary)]/[0.06]'
										: 'border-black/[0.08] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.04] dark:border-white/[0.12]'
								}`}
							>
								<Icon
									aria-hidden="true"
									size={16}
									strokeWidth={2}
									className={`mt-0.5 shrink-0 ${
										isActive
											? 'text-[var(--color-primary)]'
											: 'text-[var(--color-text-subtle)]'
									}`}
								/>
								<span
									className="mt-1 hidden font-[family-name:var(--font-jetbrains-mono)] leading-none tabular-nums transition-colors sm:inline"
									style={{
										fontSize: '10px',
										color: isActive
											? 'var(--color-primary)'
											: 'var(--color-text-subtle)',
										letterSpacing: '0.14em',
									}}
								>
									{register.mark.toUpperCase()}
								</span>
								<div className="flex min-w-0 flex-col">
									<span
										className="break-words font-[family-name:var(--font-bricolage)] leading-tight transition-colors"
										style={{
											fontSize: '14px',
											fontWeight: isActive ? 600 : 400,
											color: isActive
												? 'var(--color-text)'
												: 'var(--color-text-muted)',
										}}
									>
										{register.title}
									</span>
									<span
										className="mt-1 break-words font-[family-name:var(--font-bricolage)] transition-colors"
										style={{
											fontSize: '11px',
											color: isActive
												? 'var(--color-text-muted)'
												: 'var(--color-text-subtle)',
										}}
									>
										{register.dek}
									</span>
								</div>
							</Button>

							{isActive && (
								<motion.span
									layoutId="ledger-tab-rule"
									aria-hidden="true"
									className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-[1px] bg-[var(--color-primary)]"
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 32,
									}}
								/>
							)}
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
