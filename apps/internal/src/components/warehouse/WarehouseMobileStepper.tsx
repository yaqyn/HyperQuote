import { ChevronDown, RotateCcw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

type MobileStepTone = 'dark' | 'yellow' | 'green' | 'red'

export function mobilePanelClass(active: boolean) {
	return active ? 'block' : 'hidden lg:block'
}

export function MobileStepMeter({ title }: { title: string }) {
	return (
		<div className="lg:hidden">
			<h3 className="font-[family-name:var(--font-geist-mono)] text-[16px] font-bold uppercase tracking-[0.16em]">
				{title}
			</h3>
		</div>
	)
}

export function MobileStepControls({
	backLabel = 'Reset',
	secondaryKind = 'reset',
	primaryLabel,
	onBack,
	onPrimary,
	primaryDisabled,
	isPending,
	tone = 'dark',
	children,
}: {
	backLabel?: string
	secondaryKind?: 'reset' | 'exit'
	primaryLabel: string
	onBack?: () => void
	onPrimary: () => void
	primaryDisabled?: boolean
	isPending?: boolean
	tone?: MobileStepTone
	children?: ReactNode
}) {
	const disabled = !!primaryDisabled || !!isPending
	const bg = colorForTone(tone)
	const fg = tone === 'yellow' ? 'var(--color-text)' : '#FFFFFF'
	const SecondaryIcon = secondaryKind === 'exit' ? X : RotateCcw

	return (
		<div className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-3 sm:px-6 lg:hidden">
			{children}
			<div className={onBack ? 'grid grid-cols-[44px_1fr] gap-2' : 'grid'}>
				{onBack && (
					<motion.button
						type="button"
						aria-label={backLabel}
						title={backLabel}
						onClick={onBack}
						whileTap={{ scale: 0.96 }}
						className="flex min-h-11 items-center justify-center border-2 border-[var(--color-text)] bg-[var(--color-surface)] text-[var(--color-text)]"
					>
						<SecondaryIcon aria-hidden="true" size={17} strokeWidth={2.4} />
					</motion.button>
				)}
				<motion.button
					type="button"
					onClick={onPrimary}
					disabled={disabled}
					whileTap={disabled ? undefined : { scale: 0.97 }}
					animate={{
						backgroundColor: disabled ? 'rgba(0,0,0,0.06)' : bg,
						color: disabled ? 'rgba(0,0,0,0.35)' : fg,
					}}
					transition={{ duration: 0.2 }}
					className="border-2 border-[var(--color-text)] px-3 py-3 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.16em] disabled:cursor-not-allowed"
				>
					{isPending ? 'Working…' : primaryLabel}
				</motion.button>
			</div>
		</div>
	)
}

export function MobileAdvisorMenu({
	employees,
	selectedAdvisor,
	isOpen,
	onToggle,
	onSelect,
}: {
	employees: { id: string; name: string }[]
	selectedAdvisor: { id: string; name: string } | null
	isOpen: boolean
	onToggle: () => void
	onSelect: (employeeId: string) => void
}) {
	return (
		<div>
			<motion.button
				type="button"
				onClick={onToggle}
				whileTap={{ scale: 0.98 }}
				aria-expanded={isOpen}
				className="grid h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 text-start"
			>
				<span
					className={`truncate font-[family-name:var(--font-geist-mono)] text-[12px] font-bold uppercase tracking-[0.14em] ${
						selectedAdvisor ? 'text-[var(--color-text)]' : 'text-black/35'
					}`}
				>
					{selectedAdvisor?.name ?? 'Select advisor'}
				</span>
				<motion.span
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.18 }}
					className="flex h-7 w-7 items-center justify-center border border-black/20"
				>
					<ChevronDown aria-hidden="true" size={15} strokeWidth={2.4} />
				</motion.span>
			</motion.button>

			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						key="mobile-advisors"
						initial={{ opacity: 0, height: 0, y: -4 }}
						animate={{ opacity: 1, height: 'auto', y: 0 }}
						exit={{ opacity: 0, height: 0, y: -4 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden border-x-2 border-b-2 border-[var(--color-text)]"
					>
						{employees.length === 0 ? (
							<div className="px-3 py-4 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
								Loading advisors
							</div>
						) : (
							employees.map((employee) => {
								const active = selectedAdvisor?.id === employee.id
								return (
									<motion.button
										key={employee.id}
										type="button"
										onClick={() => onSelect(employee.id)}
										whileTap={{ scale: 0.99 }}
										animate={{
											backgroundColor: active
												? 'var(--color-text)'
												: 'var(--color-surface)',
											color: active ? '#FFFFFF' : 'var(--color-text)',
										}}
										transition={{ duration: 0.16 }}
										className="block h-12 w-full border-t border-black/10 px-3 text-start font-[family-name:var(--font-geist-mono)] text-[12px] font-bold uppercase tracking-[0.12em]"
									>
										{employee.name}
									</motion.button>
								)
							})
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

function colorForTone(tone: MobileStepTone) {
	switch (tone) {
		case 'yellow':
			return '#E6B400'
		case 'green':
			return '#0A5C2E'
		case 'red':
			return '#CC3300'
		case 'dark':
			return 'var(--color-text)'
	}
}
