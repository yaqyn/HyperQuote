import { useEffect, useState } from 'react'
import { clampMargin, MAX_MARGIN_PCT } from '../../../lib/inputs'
import { getMarginLevel, type MarginThresholds } from '../../../types/sales'

interface LineMarginItem {
	productName: string
	supplierCost: number
	quantity: number
	marginPercent: number
}

interface LineMarginPanelProps {
	items: LineMarginItem[]
	currentIndex: number
	onSelectIndex: (index: number) => void
	marginFloor: number
	thresholds: MarginThresholds | null
	onChange: (index: number, margin: number) => void
	onApplyToAll: (margin: number) => void
	onClose: () => void
}

const DEFAULT_THRESHOLDS: MarginThresholds = {
	productCategory: 'default',
	target: 18,
	floor: 12,
	absoluteMin: 8,
}

function computeSellPrice(cost: number, margin: number): number {
	if (cost <= 0 || margin >= 100) return 0
	return Math.round((cost / (1 - margin / 100)) * 100) / 100
}

const LEVEL_COLOR = {
	green: 'var(--color-primary)',
	yellow: 'var(--color-signal-amber)',
	red: 'var(--color-signal-red)',
	blocked: 'var(--color-signal-red)',
} as const

const LEVEL_LABEL = {
	green: 'on target',
	yellow: 'below target',
	red: 'below floor',
	blocked: 'below minimum',
} as const

/**
 * LineMarginPanel — the margin workbench. Each rep decision is a
 * typographic moment: the sovereign margin % in Literata, the derived
 * sell price in Plex Mono, threshold markers as ruled ticks on a bar.
 * Presets and nudges are italic word-actions, not rounded pills. The
 * breakdown is a ruled strata of dt/dd pairs. Footer has one primary
 * `Done` wordmark and an italic escape-hatch `apply to all items`.
 */
export function LineMarginPanel({
	items,
	currentIndex,
	onSelectIndex,
	marginFloor,
	thresholds,
	onChange,
	onApplyToAll,
	onClose,
}: LineMarginPanelProps) {
	const t = thresholds ?? DEFAULT_THRESHOLDS
	const current = items[currentIndex]
	const supplierCost = current?.supplierCost ?? 0
	const quantity = current?.quantity ?? 0
	const productName = current?.productName ?? ''
	const marginPercent = current?.marginPercent ?? 0
	const [draft, setDraft] = useState(marginPercent)

	useEffect(() => {
		setDraft(marginPercent)
	}, [marginPercent])

	const clamp = (m: number) => clampMargin(m, marginFloor)
	const commit = (m: number) => {
		const clamped = clamp(m)
		setDraft(clamped)
		onChange(currentIndex, clamped)
	}

	const level = getMarginLevel(draft, t)
	const sellPrice = computeSellPrice(supplierCost, draft)
	const lineTotal = Math.round(sellPrice * quantity * 100) / 100
	const lineCost = Math.round(supplierCost * quantity * 100) / 100
	const lineProfit = lineTotal - lineCost

	const heroColor = LEVEL_COLOR[level]
	const levelLabel = LEVEL_LABEL[level]

	const barMax = Math.max(t.target + 12, draft + 5, 30)
	const pos = (v: number) =>
		`${Math.min(Math.max((v / barMax) * 100, 0), 100)}%`

	const presets = [
		{ label: 'min', value: t.absoluteMin },
		{ label: 'floor', value: t.floor },
		{ label: 'target', value: t.target },
	]

	const nudges = [-1, -0.5, 0.5, 1] as const

	return (
		<div className="flex h-full flex-col">
			{/* Section rule eyebrow + product name */}
			<div className="px-7 pt-6 pb-4">
				<div className="flex items-center gap-4">
					<span
						className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
						style={{ fontSize: '11px' }}
					>
						line margin
					</span>
					<div
						aria-hidden="true"
						className="h-px flex-1"
						style={{
							backgroundColor: 'var(--color-border)',
							opacity: 0.6,
						}}
					/>
				</div>
				<h2
					className="mt-3 truncate font-[family-name:var(--font-literata)]"
					style={{
						fontSize: '22px',
						fontWeight: 500,
						color: 'var(--color-text)',
						letterSpacing: '-0.02em',
						lineHeight: 1.1,
					}}
				>
					{productName}
				</h2>
			</div>

			{/* Hero — sovereign margin + sell price on a ruled row */}
			<div
				className="flex items-baseline justify-between px-7 pb-5 pt-1"
				style={{ borderBottom: '1px solid var(--color-border)' }}
			>
				<div className="flex flex-col items-start">
					<span
						className="block py-1 font-[family-name:var(--font-literata)] tabular-nums"
						style={{
							fontSize: '64px',
							fontWeight: 500,
							letterSpacing: '-0.04em',
							color: heroColor,
							lineHeight: 1.1,
						}}
					>
						{draft}
						<span
							className="font-[family-name:var(--font-archivo)]"
							style={{
								fontSize: '28px',
								fontWeight: 400,
								fontStyle: 'italic',
								letterSpacing: '-0.01em',
								marginInlineStart: '2px',
							}}
						>
							%
						</span>
					</span>
					<span
						className="mt-2 font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: heroColor,
							letterSpacing: '0.005em',
						}}
					>
						{levelLabel}
					</span>
				</div>
				<div className="flex flex-col items-end">
					<span
						className="block py-1 font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '28px',
							fontWeight: 500,
							color: 'var(--color-text)',
							letterSpacing: '-0.01em',
							lineHeight: 1.15,
						}}
					>
						{sellPrice.toLocaleString('en-EG')}
					</span>
					<span
						className="mt-2 font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: 'var(--color-text-subtle)',
						}}
					>
						EGP · per unit
					</span>
				</div>
			</div>

			{/* Threshold bar — ruled track with colored ticks + current indicator */}
			<div className="px-7 pt-6 pb-5">
				<div
					className="relative h-px w-full"
					style={{ backgroundColor: 'var(--color-border)' }}
					aria-hidden="true"
				>
					<ThresholdTick
						position={pos(t.absoluteMin)}
						color="var(--color-signal-red)"
					/>
					<ThresholdTick
						position={pos(t.floor)}
						color="var(--color-signal-amber)"
					/>
					<ThresholdTick
						position={pos(t.target)}
						color="var(--color-primary)"
					/>
					<div
						className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
						style={{
							left: pos(draft),
							backgroundColor: heroColor,
							boxShadow: '0 2px 6px -1px rgba(0,0,0,0.25)',
						}}
					/>
				</div>
				<div className="relative mt-2.5 h-4">
					<ThresholdLabel
						position={pos(t.absoluteMin)}
						value={t.absoluteMin}
						tone="var(--color-signal-red)"
					/>
					<ThresholdLabel
						position={pos(t.floor)}
						value={t.floor}
						tone="var(--color-signal-amber)"
					/>
					<ThresholdLabel
						position={pos(t.target)}
						value={t.target}
						tone="var(--color-primary)"
					/>
				</div>
			</div>

			{/* Range + numeric input */}
			<div className="px-7 pb-6">
				<div className="flex items-center gap-4">
					<input
						type="range"
						min={marginFloor}
						max={MAX_MARGIN_PCT}
						step={0.5}
						value={draft}
						onChange={(e) => commit(Number(e.target.value))}
						className="flex-1 accent-[var(--color-primary)]"
						aria-label="Margin percentage"
					/>
					<div
						className="inline-flex items-baseline gap-0.5 px-2 py-1"
						style={{
							borderBottom: '1px solid var(--color-border)',
						}}
					>
						<input
							type="number"
							value={draft}
							step={0.5}
							onChange={(e) => commit(Number(e.target.value) || 0)}
							className="w-12 bg-transparent text-end font-[family-name:var(--font-plex-mono)] tabular-nums outline-none"
							style={{
								fontSize: '13px',
								fontWeight: 500,
								color: 'var(--color-text)',
							}}
							aria-label="Margin percentage (numeric)"
						/>
						<span
							className="font-[family-name:var(--font-archivo)] italic"
							style={{
								fontSize: '11px',
								color: 'var(--color-text-subtle)',
							}}
						>
							%
						</span>
					</div>
				</div>
			</div>

			{/* Presets — italic word-actions */}
			<StratumRow label="presets">
				<div className="flex items-baseline gap-5">
					{presets.map((p) => {
						const selected = Math.abs(draft - p.value) < 0.01
						return (
							<button
								key={p.label}
								type="button"
								onClick={() => commit(p.value)}
								aria-pressed={selected}
								className="group relative inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
							>
								<span
									style={{
										fontSize: '13px',
										fontStyle: selected ? 'normal' : 'italic',
										fontWeight: selected ? 500 : 400,
										color: selected
											? 'var(--color-text)'
											: 'var(--color-text-muted)',
										letterSpacing: '-0.005em',
									}}
								>
									{p.label}
								</span>
								<span
									className="font-[family-name:var(--font-plex-mono)] tabular-nums"
									style={{
										fontSize: '11px',
										color: selected
											? 'var(--color-primary)'
											: 'var(--color-text-subtle)',
										letterSpacing: '0.04em',
									}}
								>
									{p.value}%
								</span>
								{selected && (
									<span
										aria-hidden="true"
										className="absolute inset-x-0 -bottom-0.5 h-px bg-[var(--color-primary)]"
									/>
								)}
							</button>
						)
					})}
				</div>
			</StratumRow>

			{/* Nudge — row of word-actions with Δ total preview */}
			<StratumRow label="nudge">
				<div className="grid grid-cols-4 gap-4">
					{nudges.map((step) => {
						const next = clamp(draft + step)
						const nextTotal =
							Math.round(
								computeSellPrice(supplierCost, next) * quantity * 100,
							) / 100
						const diff = Math.round((nextTotal - lineTotal) * 100) / 100
						const disabled = next === draft
						const diffColor =
							diff > 0
								? 'var(--color-primary)'
								: diff < 0
									? 'var(--color-signal-red)'
									: 'var(--color-text-subtle)'
						return (
							<button
								key={step}
								type="button"
								disabled={disabled}
								onClick={() => commit(next)}
								className="group relative flex flex-col items-start gap-0.5 py-1 text-start font-[family-name:var(--font-archivo)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm disabled:cursor-not-allowed disabled:opacity-30"
							>
								<span
									className="font-[family-name:var(--font-plex-mono)] tabular-nums"
									style={{
										fontSize: '13px',
										fontWeight: 500,
										color: 'var(--color-text)',
										letterSpacing: '0.01em',
									}}
								>
									{step > 0 ? '+' : ''}
									{step}%
								</span>
								<span
									className="font-[family-name:var(--font-plex-mono)] tabular-nums"
									style={{
										fontSize: '11px',
										color: diffColor,
										letterSpacing: '0.02em',
									}}
								>
									{diff > 0 ? '+' : ''}
									{diff.toLocaleString('en-EG')}
								</span>
							</button>
						)
					})}
				</div>
			</StratumRow>

			{/* Breakdown — ruled dt/dd strata */}
			<div
				className="mx-7 mt-1"
				style={{ borderTop: '1px solid var(--color-border)' }}
			>
				<dl className="py-3">
					<BreakdownRow
						label={`cost · ${quantity}×`}
						value={lineCost}
						tone="var(--color-text-muted)"
					/>
					<BreakdownRow
						label="profit"
						value={lineProfit}
						tone="var(--color-primary)"
						showPlus
					/>
					<BreakdownRow
						label="line total"
						value={lineTotal}
						tone="var(--color-text)"
						emphasis
						suffix="EGP"
					/>
				</dl>
			</div>

			{/* Other items — typographic roster, only when there are siblings */}
			{items.length > 1 && (
				<div
					className="mx-7 mt-4"
					style={{ borderTop: '1px solid var(--color-border)' }}
				>
					<div className="flex items-center gap-4 pt-4">
						<span
							className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
							style={{ fontSize: '11px' }}
						>
							other items
						</span>
						<div
							aria-hidden="true"
							className="h-px flex-1"
							style={{
								backgroundColor: 'var(--color-border)',
								opacity: 0.6,
							}}
						/>
						<span
							className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
							style={{ fontSize: '10px', letterSpacing: '0.06em' }}
						>
							{items.length}
						</span>
					</div>
					<div className="mt-2 flex flex-col gap-0 max-h-[160px] overflow-y-auto">
						{items.map((it, i) => {
							const itLevel = getMarginLevel(it.marginPercent, t)
							const isActive = i === currentIndex
							const dotColor = LEVEL_COLOR[itLevel]
							return (
								<button
									key={it.productName}
									type="button"
									onClick={() => onSelectIndex(i)}
									aria-current={isActive ? 'true' : undefined}
									className="group relative flex items-center gap-3 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
								>
									<span
										aria-hidden="true"
										className="shrink-0 rounded-full"
										style={{
											width: 5,
											height: 5,
											backgroundColor: dotColor,
										}}
									/>
									<span
										className="flex-1 min-w-0 truncate font-[family-name:var(--font-archivo)]"
										style={{
											fontSize: '13px',
											fontStyle: isActive ? 'normal' : 'italic',
											fontWeight: isActive ? 500 : 400,
											color: isActive
												? 'var(--color-text)'
												: 'var(--color-text-muted)',
											letterSpacing: '-0.005em',
										}}
									>
										{it.productName}
									</span>
									<span
										className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums"
										style={{
											fontSize: '11px',
											color: isActive
												? 'var(--color-primary)'
												: 'var(--color-text-subtle)',
											letterSpacing: '0.04em',
										}}
									>
										{it.marginPercent}%
									</span>
								</button>
							)
						})}
					</div>
				</div>
			)}

			{/* Actions — italic escape-hatch + sovereign Done word */}
			<div
				className="mt-auto flex items-center justify-between gap-6 px-7 py-5"
				style={{ borderTop: '1px solid var(--color-border)' }}
			>
				<button
					type="button"
					onClick={() => {
						onApplyToAll(draft)
						onClose()
					}}
					className="group relative inline-flex items-baseline font-[family-name:var(--font-archivo)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
					style={{
						fontSize: '12px',
						color: 'var(--color-text-muted)',
					}}
				>
					<span className="relative">
						apply to all items
						<span
							aria-hidden="true"
							className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
						/>
					</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="group relative inline-flex items-baseline gap-2 font-[family-name:var(--font-literata)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
					style={{
						fontSize: '22px',
						fontWeight: 500,
						color: 'var(--color-text)',
						letterSpacing: '-0.02em',
					}}
				>
					<span className="relative">
						done
						<span
							aria-hidden="true"
							className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
						/>
					</span>
					<span
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-1"
						style={{ fontSize: '18px' }}
					>
						→
					</span>
				</button>
			</div>
		</div>
	)
}

// ─── Primitives ───────────────────────────────────────────

function ThresholdTick({
	position,
	color,
}: {
	position: string
	color: string
}) {
	return (
		<span
			className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2"
			style={{ left: position, backgroundColor: color, opacity: 0.7 }}
		/>
	)
}

function ThresholdLabel({
	position,
	value,
	tone,
}: {
	position: string
	value: number
	tone: string
}) {
	return (
		<span
			className="absolute font-[family-name:var(--font-plex-mono)] tabular-nums"
			style={{
				left: position,
				transform: 'translateX(-50%)',
				fontSize: '9px',
				color: tone,
				letterSpacing: '0.04em',
			}}
		>
			{value}
		</span>
	)
}

function StratumRow({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<div
			className="grid grid-cols-[72px_1fr] items-baseline gap-x-5 px-7 py-3"
			style={{
				borderTop: '1px solid var(--color-border)',
			}}
		>
			<dt
				className="font-[family-name:var(--font-archivo)] italic"
				style={{
					fontSize: '11px',
					color: 'var(--color-text-subtle)',
				}}
			>
				{label}
			</dt>
			<dd>{children}</dd>
		</div>
	)
}

function BreakdownRow({
	label,
	value,
	tone,
	showPlus,
	emphasis,
	suffix,
}: {
	label: string
	value: number
	tone: string
	showPlus?: boolean
	emphasis?: boolean
	suffix?: string
}) {
	return (
		<div
			className="flex items-baseline justify-between py-1.5"
			style={{
				borderTop: emphasis ? '1px solid var(--color-border)' : undefined,
				marginTop: emphasis ? '4px' : 0,
				paddingTop: emphasis ? '10px' : undefined,
			}}
		>
			<span
				className="font-[family-name:var(--font-archivo)] italic"
				style={{
					fontSize: emphasis ? '12px' : '11px',
					color: emphasis ? 'var(--color-text)' : 'var(--color-text-subtle)',
					fontStyle: emphasis ? 'normal' : 'italic',
					fontWeight: emphasis ? 500 : 400,
				}}
			>
				{label}
			</span>
			<span className="flex items-baseline gap-1.5">
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: emphasis ? '14px' : '12px',
						color: tone,
						fontWeight: emphasis ? 500 : 400,
					}}
				>
					{showPlus && value >= 0 ? '+' : ''}
					{value.toLocaleString('en-EG')}
				</span>
				{suffix && (
					<span
						className="font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: 'var(--color-text-subtle)',
						}}
					>
						{suffix}
					</span>
				)}
			</span>
		</div>
	)
}
