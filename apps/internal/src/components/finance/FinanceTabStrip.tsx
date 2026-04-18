import { motion } from 'motion/react'
import { Button } from 'react-aria-components'
import { type FinanceTab, useFinanceStore } from '../../stores/finance'

interface Register {
	id: FinanceTab
	mark: string
	title: string
	dek: string
}

const REGISTERS: Register[] = [
	{
		id: 'deals-orders',
		mark: 'i',
		title: 'Ledger',
		dek: 'money in · money out',
	},
	{
		id: 'history',
		mark: 'ii',
		title: 'Archives',
		dek: 'settled volumes',
	},
]

/**
 * Finance's pair of registers — the live ledger and the bound archives.
 * Bricolage italic title + JetBrains Mono mark + small italic dek
 * underneath. Mirrors the Compendium chapter pattern but with its own
 * typographic register so the two panels don't twin.
 */
export function FinanceTabStrip() {
	const activeTab = useFinanceStore((s) => s.activeTab)
	const setActiveTab = useFinanceStore((s) => s.setActiveTab)

	return (
		<nav
			aria-label="Finance registers"
			className="relative border-b border-[var(--color-border)] px-8 pt-3 pb-2"
		>
			<ul className="flex items-end gap-8">
				{REGISTERS.map((register) => {
					const isActive = register.id === activeTab
					return (
						<li key={register.id} className="relative pb-2">
							<Button
								onPress={() => setActiveTab(register.id)}
								aria-current={isActive ? 'page' : undefined}
								className="group relative flex items-baseline gap-2.5 rounded-sm text-start outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
							>
								<span
									className="font-[family-name:var(--font-jetbrains-mono)] leading-none tabular-nums transition-colors"
									style={{
										fontSize: '10.5px',
										color: isActive
											? 'var(--color-primary)'
											: 'var(--color-text-subtle)',
										letterSpacing: '0.14em',
									}}
								>
									{register.mark.toUpperCase()}
								</span>
								<div className="flex flex-col">
									<span
										className="font-[family-name:var(--font-bricolage)] leading-none transition-colors"
										style={{
											fontSize: '20px',
											fontWeight: isActive ? 600 : 400,
											fontStyle: isActive ? 'normal' : 'italic',
											letterSpacing: '-0.018em',
											color: isActive
												? 'var(--color-text)'
												: 'var(--color-text-muted)',
										}}
									>
										{register.title}
									</span>
									<span
										className="mt-1 font-[family-name:var(--font-bricolage)] italic transition-colors"
										style={{
											fontSize: '10.5px',
											color: isActive
												? 'var(--color-text-muted)'
												: 'var(--color-text-subtle)',
											letterSpacing: '0.005em',
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
									className="absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-[1px] bg-[var(--color-primary)]"
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
