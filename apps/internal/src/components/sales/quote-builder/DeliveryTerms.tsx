import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { useEffect, useMemo } from 'react'
import {
	Button as AriaButton,
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHeader,
	CalendarHeaderCell,
	Dialog,
	DialogTrigger,
	Heading,
	Popover,
} from 'react-aria-components'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { QuoteFormValues } from './types'

// ─── Cairo Truck Ban Logic ────────────────────────────────

const CAIRO_PATTERNS = [
	'cairo',
	'القاهرة',
	'giza',
	'الجيزة',
	'helwan',
	'حلوان',
	'6th of october',
	'٦ أكتوبر',
	'new cairo',
	'القاهرة الجديدة',
	'nasr city',
	'مدينة نصر',
	'maadi',
	'المعادي',
	'heliopolis',
	'مصر الجديدة',
	'6th october',
	'6 october',
]

const HEAVY_WEIGHT_TONS = 5
const HEAVY_CATEGORIES = ['cement', 'steel', 'rebar', 'concrete'] as const

function isGreaterCairoAddress(address: string): boolean {
	const lower = address.toLowerCase()
	return CAIRO_PATTERNS.some((p) => lower.includes(p))
}

function hasHeavyMaterials(lineItems: { productName: string }[]): boolean {
	return lineItems.some((item) => {
		const lower = item.productName.toLowerCase()
		return HEAVY_CATEGORIES.some((cat) => lower.includes(cat))
	})
}

interface DeliveryTermsProps {
	deliveryAddress: string
	highlightDate?: boolean
	/** Total shipment weight in tonnes — may be derived by a future commit
	 *  from line items × unit weight. For now the parent supplies an
	 *  estimate. Drives the truck count and the heavy-order detection for
	 *  Cairo truck-ban rules. */
	totalWeightTons: number
	leadTimeDays?: number
}

const TRUCK_CAPACITY_TONS = 5

const WINDOWS = [
	{ id: '08:00-13:00', label: 'morning', range: '08:00–13:00' },
	{ id: '13:00-17:00', label: 'midday', range: '13:00–17:00' },
	{ id: '17:00-20:00', label: 'evening', range: '17:00–20:00' },
] as const
const NIGHT_WINDOW = {
	id: '00:00-06:00',
	label: 'night',
	range: '00:00–06:00',
} as const

type WindowId = (typeof WINDOWS)[number]['id'] | typeof NIGHT_WINDOW.id

// ─── Component ────────────────────────────────────────────

export function DeliveryTerms({
	deliveryAddress,
	highlightDate = false,
	totalWeightTons,
	leadTimeDays = 3,
}: DeliveryTermsProps) {
	const { i18n } = useTranslation('internal')
	const { control, setValue: setFormValue } = useFormContext<QuoteFormValues>()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

	const lineItems = useWatch({ control, name: 'lineItems' })
	const deliveryWindow = useWatch({ control, name: 'deliveryWindow' })
	const itemCount = lineItems?.length ?? 0
	const truckCount = Math.max(
		1,
		Math.ceil(totalWeightTons / TRUCK_CAPACITY_TONS),
	)

	const isCairoDelivery = isGreaterCairoAddress(deliveryAddress)
	const isHeavyByWeight = totalWeightTons > HEAVY_WEIGHT_TONS
	const isHeavyByCategory = hasHeavyMaterials(lineItems ?? [])
	const isHeavyOrder = isHeavyByWeight || isHeavyByCategory
	const truckBanActive = isCairoDelivery && isHeavyOrder

	// Truck ban forces night-delivery window. Only wire once when the
	// condition flips — the rep can still override afterward for the
	// rare exemption.
	useEffect(() => {
		if (truckBanActive) {
			setFormValue('deliveryWindow', '00:00-06:00')
		}
	}, [truckBanActive, setFormValue])

	useEffect(() => {
		if (truckBanActive) return
		if (!deliveryWindow || deliveryWindow === '08:00-17:00') {
			setFormValue('deliveryWindow', '08:00-13:00')
		}
	}, [deliveryWindow, truckBanActive, setFormValue])

	const earliestDate = useMemo(() => {
		return today(getLocalTimeZone()).add({ days: leadTimeDays })
	}, [leadTimeDays])

	const latestDate = useMemo(
		() => today(getLocalTimeZone()).add({ months: 1 }),
		[],
	)

	const earliestFormatted = useMemo(
		() =>
			earliestDate
				.toDate(getLocalTimeZone())
				.toLocaleDateString(locale, {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
				})
				.toLowerCase(),
		[earliestDate, locale],
	)

	return (
		<dl className="mt-5 flex flex-col gap-0">
			{/* Row — date + earliest context */}
			<StratumRow label="date" highlight={highlightDate}>
				<Controller
					control={control}
					name="deliveryDate"
					render={({ field }) => {
						const parsed = field.value ? parseDate(field.value) : null
						const formatted = parsed
							? parsed
									.toDate(getLocalTimeZone())
									.toLocaleDateString(locale, {
										weekday: 'short',
										day: 'numeric',
										month: 'short',
										year: 'numeric',
									})
									.toLowerCase()
							: null
						return (
							<div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
								<DialogTrigger>
									<AriaButton
										aria-label={
											highlightDate
												? 'Pick delivery date, required'
												: 'Pick delivery date'
										}
										aria-invalid={highlightDate || undefined}
										className={`group relative inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 font-[family-name:var(--font-archivo)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
											highlightDate
												? 'border-[var(--color-signal-red)] bg-[var(--color-signal-red)]/[0.04]'
												: 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
										}`}
									>
										<svg
											width="12"
											height="12"
											viewBox="0 0 14 14"
											fill="none"
											aria-hidden="true"
											className="shrink-0 self-center"
											style={{
												color: highlightDate
													? 'var(--color-signal-red)'
													: 'var(--color-text-subtle)',
											}}
										>
											<rect
												x="1.5"
												y="2.5"
												width="11"
												height="10"
												rx="0"
												stroke="currentColor"
												strokeWidth="1"
											/>
											<path
												d="M1.5 5.5h11M4.5 1v2.5M9.5 1v2.5"
												stroke="currentColor"
												strokeWidth="1"
												strokeLinecap="round"
											/>
										</svg>
										{formatted ? (
											<span className="relative">
												<span
													className="font-[family-name:var(--font-plex-mono)] tabular-nums"
													style={{
														fontSize: '13px',
														color: 'var(--color-text)',
														fontWeight: 500,
														letterSpacing: '0.01em',
													}}
												>
													{formatted}
												</span>
												<span
													aria-hidden="true"
													className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
												/>
											</span>
										) : (
											<span className="relative">
												<span
													className="font-[family-name:var(--font-archivo)] italic"
													style={{
														fontSize: '13px',
														color: highlightDate
															? 'var(--color-signal-red)'
															: 'var(--color-text-subtle)',
													}}
												>
													pick a date
												</span>
												<span
													aria-hidden="true"
													className={`absolute inset-x-0 -bottom-0.5 h-px origin-left transition-transform duration-200 ${
														highlightDate
															? 'scale-x-100 bg-[var(--color-signal-red)]'
															: 'scale-x-0 bg-[var(--color-primary)] group-hover:scale-x-100 group-focus-visible:scale-x-100'
													}`}
												/>
											</span>
										)}
									</AriaButton>
									<Popover
										placement="bottom start"
										className="max-w-[calc(100vw-24px)]"
									>
										<Dialog
											aria-label="Delivery date picker"
											className="cursor-default select-none p-4 outline-none"
											style={{
												backgroundColor: 'var(--color-surface)',
												border: '1px solid var(--color-border)',
												boxShadow:
													'0 4px 12px -4px rgba(0,0,0,0.12), 0 16px 40px -8px rgba(0,0,0,0.18)',
											}}
										>
											{({ close }) => (
												<Calendar
													aria-label="Delivery date"
													minValue={earliestDate}
													maxValue={latestDate}
													value={parsed}
													onChange={(date) => {
														field.onChange(date?.toString() ?? '')
														close()
													}}
												>
													<header className="mb-3 flex items-center justify-between">
														<AriaButton
															slot="previous"
															aria-label="Previous month"
															className="rounded-sm p-1 font-[family-name:var(--font-archivo)] italic outline-none transition-colors data-[hovered]:text-[var(--color-primary)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
															style={{
																fontSize: '13px',
																color: 'var(--color-text-muted)',
															}}
														>
															←
														</AriaButton>
														<Heading
															className="font-[family-name:var(--font-archivo)]"
															style={{
																fontSize: '13px',
																fontWeight: 500,
																color: 'var(--color-text)',
																letterSpacing: '-0.005em',
															}}
														/>
														<AriaButton
															slot="next"
															aria-label="Next month"
															className="rounded-sm p-1 font-[family-name:var(--font-archivo)] italic outline-none transition-colors data-[hovered]:text-[var(--color-primary)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
															style={{
																fontSize: '13px',
																color: 'var(--color-text-muted)',
															}}
														>
															→
														</AriaButton>
													</header>
													<CalendarGrid>
														<CalendarGridHeader>
															{(day) => (
																<CalendarHeaderCell
																	className="pb-2 font-[family-name:var(--font-archivo)] italic"
																	style={{
																		fontSize: '10px',
																		color: 'var(--color-text-subtle)',
																		letterSpacing: '0.04em',
																	}}
																>
																	{day}
																</CalendarHeaderCell>
															)}
														</CalendarGridHeader>
														<CalendarGridBody>
															{(date) => (
																<CalendarCell
																	date={date}
																	className="flex h-8 w-8 items-center justify-center font-[family-name:var(--font-plex-mono)] tabular-nums outline-none transition-colors data-[hovered]:bg-[var(--color-primary)]/10 data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white data-[unavailable]:opacity-25 data-[outside-month]:invisible data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40 rounded-sm"
																	style={{
																		fontSize: '12px',
																		color: 'var(--color-text)',
																	}}
																/>
															)}
														</CalendarGridBody>
													</CalendarGrid>
												</Calendar>
											)}
										</Dialog>
									</Popover>
								</DialogTrigger>
								<span
									className="font-[family-name:var(--font-archivo)] italic"
									style={{
										fontSize: '11px',
										color: 'var(--color-text-subtle)',
									}}
								>
									earliest{' '}
									<span
										className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums"
										style={{
											color: 'var(--color-text-muted)',
											letterSpacing: '0.02em',
										}}
									>
										{earliestFormatted}
									</span>{' '}
									·{' '}
									<span
										className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums"
										style={{
											color: 'var(--color-text-muted)',
										}}
									>
										{leadTimeDays}d
									</span>{' '}
									lead
								</span>
							</div>
						)
					}}
				/>
			</StratumRow>

			{/* Row — window picker as a radio group */}
			<StratumRow label="window">
				<Controller
					control={control}
					name="deliveryWindow"
					render={({ field }) => {
						const value = (
							field.value === '08:00-17:00'
								? '08:00-13:00'
								: (field.value ?? '08:00-13:00')
						) as WindowId
						const windows =
							truckBanActive || value === NIGHT_WINDOW.id
								? [NIGHT_WINDOW, ...WINDOWS]
								: WINDOWS
						return (
							<fieldset className="m-0 grid grid-cols-1 gap-2 border-0 p-0 sm:grid-cols-3">
								<legend className="sr-only">Delivery window</legend>
								{windows.map((w) => {
									const selected = value === w.id
									const inputId = `window-${w.id}`
									return (
										<label
											key={w.id}
											htmlFor={inputId}
											className={`group relative flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 font-[family-name:var(--font-archivo)] transition-colors ${
												selected
													? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.06]'
													: 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
											}`}
										>
											<input
												id={inputId}
												type="radio"
												name="deliveryWindow"
												value={w.id}
												checked={selected}
												onChange={() => field.onChange(w.id)}
												className="sr-only peer"
											/>
											<span className="min-w-0">
												<span
													className="block"
													style={{
														fontSize: '13px',
														fontWeight: selected ? 600 : 500,
														color: selected
															? 'var(--color-text)'
															: 'var(--color-text-muted)',
														letterSpacing: '-0.005em',
													}}
												>
													{w.label}
												</span>
												<span
													className="mt-0.5 block font-[family-name:var(--font-plex-mono)] tabular-nums"
													style={{
														fontSize: '10px',
														color: 'var(--color-text-subtle)',
														letterSpacing: '0.04em',
													}}
												>
													{w.range}
												</span>
											</span>
											<span
												aria-hidden="true"
												className="shrink-0 rounded-full transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)]/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface)]"
												style={{
													width: 8,
													height: 8,
													backgroundColor: selected
														? 'var(--color-primary)'
														: 'transparent',
													border: selected
														? 'none'
														: '1px solid var(--color-text-subtle)',
												}}
											/>
										</label>
									)
								})}
								{truckBanActive && (
									<span
										role="note"
										className="sm:col-span-3 font-[family-name:var(--font-archivo)] italic"
										style={{
											fontSize: '11px',
											color: 'var(--color-signal-amber)',
										}}
									>
										· cairo truck ban — night delivery only
									</span>
								)}
							</fieldset>
						)
					}}
				/>
			</StratumRow>

			{/* Row — shipment summary */}
			<StratumRow label="shipment">
				<div
					className="flex flex-wrap items-baseline gap-x-4 gap-y-2 font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '12px',
						color: 'var(--color-text)',
					}}
				>
					<span>
						{totalWeightTons}
						<span
							className="font-[family-name:var(--font-archivo)] italic"
							style={{
								fontSize: '11px',
								color: 'var(--color-text-subtle)',
								marginInlineStart: '2px',
							}}
						>
							t
						</span>
					</span>
					<span
						aria-hidden="true"
						style={{ color: 'var(--color-text-subtle)' }}
					>
						·
					</span>
					<span>
						{truckCount}
						<span
							className="font-[family-name:var(--font-archivo)] italic"
							style={{
								fontSize: '11px',
								color: 'var(--color-text-subtle)',
								marginInlineStart: '4px',
							}}
						>
							{truckCount === 1 ? 'truck' : 'trucks'}
						</span>
					</span>
					<span
						aria-hidden="true"
						style={{ color: 'var(--color-text-subtle)' }}
					>
						·
					</span>
					<span>
						{itemCount}
						<span
							className="font-[family-name:var(--font-archivo)] italic"
							style={{
								fontSize: '11px',
								color: 'var(--color-text-subtle)',
								marginInlineStart: '4px',
							}}
						>
							{itemCount === 1 ? 'item' : 'items'}
						</span>
					</span>
				</div>
			</StratumRow>

			{/* Row — notes */}
			<StratumRow label="notes" align="start">
				<Controller
					control={control}
					name="specialInstructions"
					render={({ field }) => (
						<label htmlFor="delivery-notes" className="block w-full">
							<span className="sr-only">Delivery notes</span>
							<textarea
								id="delivery-notes"
								value={field.value ?? ''}
								onChange={(e) => field.onChange(e.target.value)}
								placeholder="time windows, contact on-site, loading bay notes…"
								rows={2}
								className="w-full resize-none bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/60"
								style={{
									fontSize: '13px',
									lineHeight: 1.5,
									letterSpacing: '-0.005em',
								}}
							/>
						</label>
					)}
				/>
			</StratumRow>
		</dl>
	)
}

// ─── Stratum row primitive ───────────────────────────────

function StratumRow({
	label,
	children,
	align = 'baseline',
	highlight = false,
}: {
	label: string
	children: React.ReactNode
	align?: 'baseline' | 'start'
	highlight?: boolean
}) {
	return (
		<div
			className={`flex flex-col gap-2 py-3 sm:grid sm:grid-cols-[80px_1fr] sm:gap-x-6 ${
				align === 'start' ? 'sm:items-start' : 'sm:items-baseline'
			}`}
			style={{
				borderBottom: `1px solid ${
					highlight ? 'var(--color-signal-red)' : 'var(--color-border)'
				}`,
				borderBottomStyle: 'solid',
				opacity: 1,
			}}
		>
			<dt
				className="font-[family-name:var(--font-archivo)] italic"
				style={{
					fontSize: '11px',
					color: highlight
						? 'var(--color-signal-red)'
						: 'var(--color-text-subtle)',
					paddingTop: align === 'start' ? '3px' : undefined,
				}}
			>
				{label}
			</dt>
			<dd>{children}</dd>
		</div>
	)
}
