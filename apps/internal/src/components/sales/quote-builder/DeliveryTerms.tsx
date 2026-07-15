import {
	type CalendarDate,
	getLocalTimeZone,
	parseDate,
	today,
} from '@internationalized/date'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button as AriaButton } from 'react-aria-components/Button'
import {
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHeader,
	CalendarHeaderCell,
} from 'react-aria-components/Calendar'
import { Heading } from 'react-aria-components/Dialog'
import { createPortal } from 'react-dom'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { QuoteFormValues } from './types'

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

const WINDOWS = [
	{ id: '08:00-13:00', label: 'morning', range: '08:00-13:00' },
	{ id: '13:00-17:00', label: 'midday', range: '13:00-17:00' },
	{ id: '17:00-20:00', label: 'evening', range: '17:00-20:00' },
] as const
const NIGHT_WINDOW = {
	id: '00:00-06:00',
	label: 'night',
	range: '00:00-06:00',
} as const
const ALL_WINDOWS = [...WINDOWS, NIGHT_WINDOW] as const

type WindowId = (typeof ALL_WINDOWS)[number]['id']

interface DeliveryTermsProps {
	deliveryAddress: string
	highlightDate?: boolean
	datePickerOpenSignal?: number
	onAddressPress: () => void
	totalWeightTons: number
	leadTimeDays?: number
}

export function DeliveryTerms({
	deliveryAddress,
	highlightDate = false,
	datePickerOpenSignal = 0,
	onAddressPress,
	totalWeightTons,
	leadTimeDays = 3,
}: DeliveryTermsProps) {
	const { i18n } = useTranslation('internal')
	const { control, setValue: setFormValue } = useFormContext<QuoteFormValues>()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

	const lineItems = useWatch({ control, name: 'lineItems' })
	const deliveryDate = useWatch({ control, name: 'deliveryDate' })
	const deliveryWindow = useWatch({ control, name: 'deliveryWindow' })

	const truckBanActive =
		isGreaterCairoAddress(deliveryAddress) &&
		(totalWeightTons > HEAVY_WEIGHT_TONS || hasHeavyMaterials(lineItems ?? []))

	useEffect(() => {
		if (truckBanActive) {
			setFormValue('deliveryWindow', NIGHT_WINDOW.id, { shouldDirty: true })
		}
	}, [truckBanActive, setFormValue])

	useEffect(() => {
		if (truckBanActive) return
		if (!deliveryWindow || deliveryWindow === '08:00-17:00') {
			setFormValue('deliveryWindow', WINDOWS[0].id)
		}
	}, [deliveryWindow, truckBanActive, setFormValue])

	const earliestDate = useMemo(() => {
		return today(getLocalTimeZone()).add({ days: leadTimeDays })
	}, [leadTimeDays])

	const latestDate = useMemo(
		() => today(getLocalTimeZone()).add({ months: 1 }),
		[],
	)

	const addressLabel = formatAddressSummary(deliveryAddress)

	return (
		<div className="py-3">
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onAddressPress}
					className="group flex min-h-14 min-w-0 items-center rounded-md border border-[var(--color-border)] px-3 py-2 text-start outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.035] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					aria-label={`Open delivery map, current address ${deliveryAddress || 'not set'}`}
				>
					<span className="min-w-0">
						<span className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
							Address
						</span>
						<span
							className={`mt-0.5 block truncate font-[family-name:var(--font-archivo)] text-[14px] ${
								deliveryAddress
									? 'text-[var(--color-text)]'
									: 'italic text-[var(--color-text-subtle)]'
							}`}
							style={{ letterSpacing: '0' }}
						>
							{addressLabel}
						</span>
					</span>
				</button>

				<DateTimePicker
					dateValue={deliveryDate}
					windowValue={deliveryWindow}
					earliestDate={earliestDate}
					latestDate={latestDate}
					highlightDate={highlightDate}
					openSignal={datePickerOpenSignal}
					locale={locale}
					truckBanActive={truckBanActive}
					onDateChange={(value) =>
						setFormValue('deliveryDate', value, {
							shouldDirty: true,
							shouldValidate: true,
						})
					}
					onWindowChange={(value) =>
						setFormValue('deliveryWindow', value, { shouldDirty: true })
					}
				/>
			</div>

			<div className="mt-3 border-t border-[var(--color-border)] pt-3">
				<Controller
					control={control}
					name="specialInstructions"
					render={({ field }) => (
						<label htmlFor="delivery-notes" className="block">
							<span className="sr-only">Delivery notes</span>
							<textarea
								id="delivery-notes"
								value={field.value ?? ''}
								onChange={(event) => field.onChange(event.target.value)}
								placeholder="notes"
								rows={3}
								wrap="soft"
								className="block min-h-20 w-full resize-none overflow-hidden rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/65 focus:border-[var(--color-primary)]/45 focus:ring-2 focus:ring-[var(--color-primary)]/20"
								style={{
									fontSize: '13px',
									lineHeight: 1.45,
									letterSpacing: '0',
									overflowWrap: 'anywhere',
									wordBreak: 'break-word',
								}}
							/>
						</label>
					)}
				/>
			</div>
		</div>
	)
}

function DateTimePicker({
	dateValue,
	windowValue,
	earliestDate,
	latestDate,
	highlightDate,
	openSignal,
	locale,
	truckBanActive,
	onDateChange,
	onWindowChange,
}: {
	dateValue: string
	windowValue: string
	earliestDate: CalendarDate
	latestDate: CalendarDate
	highlightDate: boolean
	openSignal: number
	locale: string
	truckBanActive: boolean
	onDateChange: (value: string) => void
	onWindowChange: (value: WindowId) => void
}) {
	const [isOpen, setOpen] = useState(false)
	const selectedDate = parseDeliveryDate(dateValue)
	const selectedWindow = getWindowOption(windowValue)
	const summaryLabel = selectedDate
		? `${formatPickerDate(selectedDate, locale)} at ${capitalize(selectedWindow.label)}`
		: 'Pick date & time'

	useEffect(() => {
		if (!isOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false)
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [isOpen])

	useEffect(() => {
		if (openSignal > 0) setOpen(true)
	}, [openSignal])

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen((open) => !open)}
				aria-expanded={isOpen}
				aria-invalid={highlightDate || undefined}
				className={`group flex min-h-14 min-w-0 items-center rounded-md border px-3 py-2 text-start outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.035] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
					highlightDate
						? 'border-[var(--color-signal-red)] bg-[var(--color-signal-red)]/[0.035]'
						: 'border-[var(--color-border)]'
				}`}
				aria-label={`Open delivery date and time picker, current ${summaryLabel}`}
			>
				<span className="min-w-0">
					<span
						className={`block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.08em] ${
							highlightDate
								? 'text-[var(--color-signal-red)]'
								: 'text-[var(--color-text-subtle)]'
						}`}
					>
						Date & Time
					</span>
					<span
						className={`mt-0.5 block truncate font-[family-name:var(--font-archivo)] text-[14px] ${
							selectedDate
								? 'text-[var(--color-text)]'
								: 'italic text-[var(--color-text-subtle)]'
						}`}
						style={{ letterSpacing: '0' }}
					>
						{summaryLabel}
					</span>
				</span>
			</button>

			<DateTimeOverlay
				isOpen={isOpen}
				selectedDate={selectedDate}
				selectedWindowId={selectedWindow.id}
				earliestDate={earliestDate}
				latestDate={latestDate}
				locale={locale}
				truckBanActive={truckBanActive}
				onClose={() => setOpen(false)}
				onDateChange={onDateChange}
				onWindowChange={onWindowChange}
			/>
		</>
	)
}

function DateTimeOverlay({
	isOpen,
	selectedDate,
	selectedWindowId,
	earliestDate,
	latestDate,
	locale,
	truckBanActive,
	onClose,
	onDateChange,
	onWindowChange,
}: {
	isOpen: boolean
	selectedDate: CalendarDate | null
	selectedWindowId: WindowId
	earliestDate: CalendarDate
	latestDate: CalendarDate
	locale: string
	truckBanActive: boolean
	onClose: () => void
	onDateChange: (value: string) => void
	onWindowChange: (value: WindowId) => void
}) {
	if (!isOpen || typeof document === 'undefined') return null

	const content = (
		<>
			<div
				className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]"
				onClick={onClose}
				aria-hidden="true"
			/>
			<section
				role="dialog"
				aria-modal
				aria-label="Delivery date and time"
				className="fixed left-1/2 top-1/2 z-[81] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-black/[0.08] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.72)] outline-none dark:border-white/[0.1]"
			>
				<header className="flex items-start justify-between gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.1]">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
								Date & Time
							</h3>
							{truckBanActive && (
								<span
									role="img"
									title="Heavy Greater Cairo delivery. Night is recommended."
									aria-label="Delivery timing notice"
									className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-signal-amber)]/45 font-[family-name:var(--font-plex-mono)] text-[var(--color-signal-amber)]"
									style={{ fontSize: '9px', fontWeight: 700 }}
								>
									!
								</span>
							)}
						</div>
						<p className="mt-1 font-[family-name:var(--font-archivo)] text-[12px] italic text-[var(--color-text-subtle)]">
							{selectedDate
								? formatPickerDate(selectedDate, locale)
								: 'Select a delivery day'}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close delivery picker"
						className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-text-subtle)] outline-none transition-colors hover:bg-black/[0.04] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:bg-white/[0.05]"
					>
						<X size={15} strokeWidth={1.8} aria-hidden="true" />
					</button>
				</header>

				<Calendar
					aria-label="Delivery date"
					minValue={earliestDate}
					maxValue={latestDate}
					value={selectedDate}
					onChange={(date) => onDateChange(date?.toString() ?? '')}
				>
					<header className="flex items-center justify-between px-4 pt-3">
						<AriaButton
							slot="previous"
							aria-label="Previous month"
							className="inline-flex h-8 w-8 items-center justify-center rounded-md font-[family-name:var(--font-archivo)] text-[var(--color-text-muted)] outline-none transition-colors data-[hovered]:bg-black/[0.04] data-[hovered]:text-[var(--color-text)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/35"
						>
							←
						</AriaButton>
						<Heading
							className="font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]"
							style={{ letterSpacing: '0' }}
						/>
						<AriaButton
							slot="next"
							aria-label="Next month"
							className="inline-flex h-8 w-8 items-center justify-center rounded-md font-[family-name:var(--font-archivo)] text-[var(--color-text-muted)] outline-none transition-colors data-[hovered]:bg-black/[0.04] data-[hovered]:text-[var(--color-text)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/35"
						>
							→
						</AriaButton>
					</header>
					<CalendarGrid className="mx-4 w-[calc(100%-2rem)] table-fixed border-separate border-spacing-1">
						<CalendarGridHeader>
							{(day) => (
								<CalendarHeaderCell className="h-6 text-center font-[family-name:var(--font-archivo)] text-[10px] font-medium text-[var(--color-text-subtle)]">
									{day}
								</CalendarHeaderCell>
							)}
						</CalendarGridHeader>
						<CalendarGridBody>
							{(date) => (
								<CalendarCell
									date={date}
									className="h-9 w-9 rounded-md text-center align-middle font-[family-name:var(--font-plex-mono)] text-[12px] tabular-nums text-[var(--color-text)] outline-none transition-colors data-[disabled]:opacity-25 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/35 data-[hovered]:bg-[var(--color-primary)]/[0.08] data-[outside-month]:invisible data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white data-[unavailable]:opacity-25"
								/>
							)}
						</CalendarGridBody>
					</CalendarGrid>
				</Calendar>

				<div className="grid grid-cols-2 gap-2 px-4 pt-3">
					{ALL_WINDOWS.map((windowOption) => {
						const selected = selectedWindowId === windowOption.id
						return (
							<button
								key={windowOption.id}
								type="button"
								onClick={() => onWindowChange(windowOption.id)}
								aria-pressed={selected}
								className={`min-h-11 rounded-md border px-3 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
									selected
										? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/[0.08]'
										: 'border-[var(--color-border)] hover:border-[var(--color-primary)]/35 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]'
								}`}
							>
								<span className="block font-[family-name:var(--font-archivo)] text-[12px] font-semibold capitalize text-[var(--color-text)]">
									{windowOption.label}
								</span>
								<span className="mt-0.5 block font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
									{windowOption.range}
								</span>
							</button>
						)
					})}
				</div>

				<button
					type="button"
					onClick={onClose}
					className="mx-4 mb-4 mt-3 inline-flex h-9 w-[calc(100%-2rem)] items-center justify-center rounded-md bg-[var(--color-primary)] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					Done
				</button>
			</section>
		</>
	)

	return createPortal(content, document.body)
}

function parseDeliveryDate(value: string | null | undefined) {
	if (!value) return null
	try {
		return parseDate(value)
	} catch {
		return null
	}
}

function getWindowOption(value: string | null | undefined) {
	return (
		ALL_WINDOWS.find((windowOption) => windowOption.id === value) ?? WINDOWS[0]
	)
}

function formatAddressSummary(address: string) {
	const parts = address
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
	if (parts.length >= 2) return parts.slice(-2).join(', ')
	return address.trim() || 'Choose address'
}

function formatPickerDate(date: CalendarDate, locale: string) {
	const nativeDate = date.toDate(getLocalTimeZone())
	const month = nativeDate.toLocaleDateString(locale, { month: 'long' })
	if (locale.startsWith('en'))
		return `${ordinal(nativeDate.getDate())} ${month}`
	return nativeDate.toLocaleDateString(locale, {
		day: 'numeric',
		month: 'long',
	})
}

function ordinal(day: number) {
	const rem10 = day % 10
	const rem100 = day % 100
	if (rem10 === 1 && rem100 !== 11) return `${day}st`
	if (rem10 === 2 && rem100 !== 12) return `${day}nd`
	if (rem10 === 3 && rem100 !== 13) return `${day}rd`
	return `${day}th`
}

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

function isGreaterCairoAddress(address: string): boolean {
	const lower = address.toLowerCase()
	return CAIRO_PATTERNS.some((pattern) => lower.includes(pattern))
}

function hasHeavyMaterials(lineItems: { productName: string }[]): boolean {
	return lineItems.some((item) => {
		const lower = item.productName.toLowerCase()
		return HEAVY_CATEGORIES.some((category) => lower.includes(category))
	})
}
