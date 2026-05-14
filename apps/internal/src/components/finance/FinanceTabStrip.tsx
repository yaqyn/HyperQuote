import { BookOpen, History, type LucideIcon } from 'lucide-react'
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
										? 'border-[var(--color-border)] bg-black/[0.035] dark:bg-white/[0.06]'
										: 'border-black/[0.08] bg-[var(--color-surface)] hover:border-black/[0.18] hover:bg-black/[0.025] dark:border-white/[0.12] dark:hover:border-white/[0.2] dark:hover:bg-white/[0.04]'
								}`}
							>
								<Icon
									aria-hidden="true"
									size={16}
									strokeWidth={2}
									className={`mt-0.5 shrink-0 ${
										isActive
											? 'text-[var(--color-text)]'
											: 'text-[var(--color-text-subtle)]'
									}`}
								/>
								<span
									className="mt-1 hidden font-[family-name:var(--font-geist-mono)] leading-none tabular-nums transition-colors sm:inline"
									style={{
										fontSize: '10px',
										color: isActive
											? 'var(--color-text)'
											: 'var(--color-text-subtle)',
										letterSpacing: '0.14em',
									}}
								>
									{register.mark.toUpperCase()}
								</span>
								<div className="flex min-w-0 flex-col">
									<span
										className="break-words font-[family-name:var(--font-archivo)] leading-tight transition-colors"
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
										className="mt-1 break-words font-[family-name:var(--font-archivo)] transition-colors"
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
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
