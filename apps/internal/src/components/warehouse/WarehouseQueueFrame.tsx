import { cubicBezier, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { WarehouseTabSwitch } from './WarehouseTabSwitch'

const QUEUE_EASE = cubicBezier(0.2, 0.8, 0.2, 1)

export function WarehouseQueueLoading({ label }: { label: string }) {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.22em] text-black/40">
				{label}
			</p>
		</div>
	)
}

export function WarehouseQueueShell({
	isHidden,
	reduce,
	title,
	stats,
	accentColor,
	children,
}: {
	isHidden: boolean
	reduce: boolean
	title: string
	stats: Array<{ label: string; value: number | string; accent?: boolean }>
	accentColor: string
	children: ReactNode
}) {
	return (
		<div
			className={`h-full w-full flex-col overflow-hidden lg:flex ${
				isHidden ? 'hidden' : 'flex'
			}`}
		>
			<motion.header
				initial={reduce ? false : { opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: QUEUE_EASE }}
				className="shrink-0 border-b-2 border-[var(--color-text)] px-4 pt-4 pb-4 sm:px-6 lg:border-b-[3px] lg:px-8 lg:pt-8 lg:pb-5"
			>
				<div className="hidden flex-col items-start gap-3 lg:flex lg:flex-row lg:justify-between lg:gap-8">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.24em] text-black/60 lg:text-[11px] lg:tracking-[0.32em]">
							Dock · Bay 01
						</p>
						<h1 className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[22px] font-bold uppercase leading-none tracking-[-0.01em] sm:text-[28px] lg:mt-2 lg:text-[44px] lg:leading-[0.9] lg:tracking-[-0.02em]">
							<span className="lg:block">{title}</span>
							<span className="lg:hidden"> queue</span>
							<span className="hidden lg:block">queue</span>
						</h1>
					</div>
					<div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:flex lg:flex-wrap lg:gap-x-6 lg:gap-y-3 lg:text-end">
						{stats.map((stat) => (
							<WarehouseStatBlock
								key={stat.label}
								label={stat.label}
								value={stat.value}
								accent={stat.accent}
								accentColor={accentColor}
							/>
						))}
					</div>
				</div>
				<WarehouseTabSwitch />
			</motion.header>

			<div className="flex-1 min-h-0 overflow-y-auto px-0 py-0 lg:px-8 lg:py-6">
				{children}
			</div>
		</div>
	)
}

function WarehouseStatBlock({
	label,
	value,
	accent,
	accentColor,
}: {
	label: string
	value: number | string
	accent?: boolean
	accentColor: string
}) {
	return (
		<div className="min-w-0 border border-black/10 px-2 py-2 lg:border-0 lg:px-0 lg:py-0 lg:text-end">
			<span
				className="font-[family-name:var(--font-geist-mono)] text-[21px] font-bold leading-none tabular-nums lg:text-[44px]"
				style={{
					color: accent ? accentColor : 'var(--color-text)',
				}}
			>
				{String(value).padStart(2, '0')}
			</span>
			<span className="mt-1 block truncate font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.14em] text-black/50 lg:text-[10px] lg:tracking-[0.22em]">
				{label}
			</span>
		</div>
	)
}

export function WarehouseQueueEmpty({
	title,
	copy,
}: {
	title: string
	copy: string
}) {
	return (
		<div className="flex h-full min-h-[280px] flex-col items-center justify-center border-[3px] border-dashed border-black/15 p-10">
			<span
				aria-hidden="true"
				className="font-[family-name:var(--font-geist-mono)] text-[60px] font-bold leading-none text-black/20"
			>
				—
			</span>
			<p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[13px] font-bold uppercase tracking-[0.2em] text-black/45">
				{title}
			</p>
			<p className="mt-2 text-center text-[12px] leading-relaxed text-black/45 max-w-[320px]">
				{copy}
			</p>
		</div>
	)
}

export function WarehouseAnimatedList({
	reduce,
	children,
}: {
	reduce: boolean
	children: ReactNode
}) {
	return (
		<motion.div
			className="flex flex-col lg:gap-4"
			initial="hidden"
			animate="visible"
			variants={{
				hidden: {},
				visible: {
					transition: { staggerChildren: reduce ? 0 : 0.05 },
				},
			}}
		>
			{children}
		</motion.div>
	)
}

export function WarehouseQueueCard({
	isSelected,
	onPress,
	reduce,
	children,
}: {
	isSelected: boolean
	onPress: () => void
	reduce: boolean
	children: ReactNode
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			variants={{
				hidden: { opacity: 0, y: 12 },
				visible: {
					opacity: 1,
					y: 0,
					transition: {
						duration: 0.32,
						ease: QUEUE_EASE,
					},
				},
			}}
			whileHover={reduce ? undefined : { y: -2 }}
			whileTap={reduce ? undefined : { scale: 0.995 }}
			transition={{ type: 'spring', stiffness: 420, damping: 32 }}
			className={`group relative w-full border-y-2 border-x-0 bg-[var(--color-surface)] text-start lg:border-[3px] ${
				isSelected
					? 'border-[var(--color-text)] lg:shadow-[8px_8px_0_0_var(--color-text)]'
					: 'border-[var(--color-text)]/15 lg:hover:border-[var(--color-text)]/60 lg:hover:shadow-[4px_4px_0_0_var(--color-text)]'
			}`}
			style={{
				minHeight: '112px',
				transition: 'border-color 160ms, box-shadow 160ms',
			}}
		>
			{children}
		</motion.button>
	)
}

export function WarehouseProgressStrip({
	percent,
	color,
}: {
	percent: number
	color: string
}) {
	return (
		<div className="mt-4 flex items-center gap-3">
			<div className="relative h-[6px] flex-1 bg-black/10">
				<motion.div
					className="absolute start-0 top-0 h-full"
					initial={{ width: 0 }}
					animate={{ width: `${percent}%` }}
					transition={{
						duration: 0.45,
						ease: QUEUE_EASE,
					}}
					style={{ backgroundColor: color }}
				/>
			</div>
			<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold tabular-nums text-black/50 w-8 text-end">
				{percent}%
			</span>
		</div>
	)
}
