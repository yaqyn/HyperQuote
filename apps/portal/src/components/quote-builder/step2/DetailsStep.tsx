/**
 * Step 2: Delivery details.
 * Collects delivery address, preferred date (business days only),
 * notes, and file attachments.
 */

import {
	type DateValue,
	getLocalTimeZone,
	parseDate,
	today,
} from '@internationalized/date'
import {
	ArrowLeft,
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	Plus,
	Trash2,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import {
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHeader,
	CalendarHeaderCell,
} from 'react-aria-components/Calendar'
import { DateInput, DateSegment } from 'react-aria-components/DateField'
import { DatePicker } from 'react-aria-components/DatePicker'
import { Dialog, Heading } from 'react-aria-components/Dialog'
import { Group } from 'react-aria-components/Group'
import { Label } from 'react-aria-components/Label'
import { Popover } from 'react-aria-components/Popover'
import { TextArea } from 'react-aria-components/TextArea'
import { TextField } from 'react-aria-components/TextField'
import { useTranslation } from 'react-i18next'
import { useQuoteBuilderOrderability } from '../../../hooks/useQuoteBuilderOrderability'
import { isDateUnavailable } from '../../../lib/business-days'
import { ORDER_ASSOCIATE_COUNTRY_CODES } from '../../../lib/country-codes'
import { toQuoteDraftPayload } from '../../../lib/quote-request-payload'
import { saveDraft } from '../../../lib/server/quote-requests'
import {
	DEFAULT_QUOTE_LOCATION_CLIENT_ID,
	type QuoteLocation,
	useQuoteBuilderStore,
} from '../../../stores/quote-builder'
import { AddressComboBox } from './AddressComboBox'
import { AttachmentUpload } from './AttachmentUpload'

// ============================================================================
// Component
// ============================================================================

export function DetailsStep() {
	const { t, i18n } = useTranslation('portal')
	const isRTL = i18n.dir() === 'rtl'

	const items = useQuoteBuilderStore((s) => s.items)
	const locations = useQuoteBuilderStore((s) => s.locations)
	const associates = useQuoteBuilderStore((s) => s.associates)
	const notes = useQuoteBuilderStore((s) => s.notes)
	const setStep = useQuoteBuilderStore((s) => s.setStep)
	const addLocation = useQuoteBuilderStore((s) => s.addLocation)
	const updateLocation = useQuoteBuilderStore((s) => s.updateLocation)
	const removeLocation = useQuoteBuilderStore((s) => s.removeLocation)
	const applyDeliveryToAllLocations = useQuoteBuilderStore(
		(s) => s.applyDeliveryToAllLocations,
	)
	const addAssociate = useQuoteBuilderStore((s) => s.addAssociate)
	const updateAssociate = useQuoteBuilderStore((s) => s.updateAssociate)
	const removeAssociate = useQuoteBuilderStore((s) => s.removeAssociate)
	const setNotes = useQuoteBuilderStore((s) => s.setNotes)
	const [draftFeedback, setDraftFeedback] = useState<'saved' | 'error' | null>(
		null,
	)
	const [savingDraft, setSavingDraft] = useState(false)

	const BackArrow = isRTL ? ArrowRight : ArrowLeft

	const minDate = today(getLocalTimeZone()).add({ days: 1 })
	const normalizedLocations =
		locations.length > 0
			? locations
			: [
					{
						clientId: DEFAULT_QUOTE_LOCATION_CLIENT_ID,
						addressId: null,
						deliveryDate: null,
						deliveryHour: null,
						deliveryPeriod: null,
					},
				]
	const fallbackLocationClientId =
		normalizedLocations[0]?.clientId ?? DEFAULT_QUOTE_LOCATION_CLIENT_ID
	const itemCountByLocation = new Map<string, number>()
	for (const item of items) {
		const key = item.locationClientId ?? fallbackLocationClientId
		itemCountByLocation.set(key, (itemCountByLocation.get(key) ?? 0) + 1)
	}
	const locationsRequiringAddress = normalizedLocations.filter(
		(location) =>
			normalizedLocations.length === 1 ||
			(itemCountByLocation.get(location.clientId) ?? 0) > 0,
	)

	const handleNotesChange = useCallback(
		(value: string) => {
			setNotes(value)
		},
		[setNotes],
	)

	const {
		isBlocked: isOrderabilityBlocked,
		isValidationFailed,
		unavailableItems,
	} = useQuoteBuilderOrderability(items)
	const canContinue =
		locationsRequiringAddress.length > 0 &&
		locationsRequiringAddress.every((location) => location.addressId) &&
		!isOrderabilityBlocked

	const handleSaveDraft = useCallback(async () => {
		if (isOrderabilityBlocked) return
		setSavingDraft(true)
		setDraftFeedback(null)
		try {
			const state = useQuoteBuilderStore.getState()
			const result = await saveDraft({
				data: toQuoteDraftPayload(state),
			})
			if (result.draftId && !state.draftId) {
				useQuoteBuilderStore.getState().setDraftId(result.draftId)
			}
			setDraftFeedback('saved')
		} catch {
			setDraftFeedback('error')
		} finally {
			setSavingDraft(false)
		}
	}, [isOrderabilityBlocked])

	return (
		<div className="max-w-2xl mx-auto space-y-6 px-6 py-4">
			<section className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-sm font-semibold text-[var(--color-text)]">
						{t('quoteBuilder.deliveryLocations', 'Delivery locations')}
					</h3>
					<Button
						onPress={() => addLocation()}
						className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface)]"
					>
						<Plus size={14} />
						{t('quoteBuilder.addLocation', 'Add location')}
					</Button>
				</div>
				{normalizedLocations.map((location, index) => (
					<LocationDeliverySection
						key={location.clientId}
						location={location}
						index={index}
						itemCount={itemCountByLocation.get(location.clientId) ?? 0}
						canRemove={normalizedLocations.length > 1}
						minDate={minDate}
						onUpdate={(updates) => updateLocation(location.clientId, updates)}
						onRemove={() => removeLocation(location.clientId)}
					/>
				))}
				{normalizedLocations.length > 1 && (
					<Button
						onPress={() => {
							const first = normalizedLocations[0]
							applyDeliveryToAllLocations({
								deliveryDate: first?.deliveryDate ?? null,
								deliveryHour: first?.deliveryHour ?? null,
								deliveryPeriod: first?.deliveryPeriod ?? null,
							})
						}}
						className="h-9 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
					>
						{t('quoteBuilder.applyDeliveryToAll', 'Apply first time to all')}
					</Button>
				)}
			</section>

			<section className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-sm font-semibold text-[var(--color-text)]">
						{t('quoteBuilder.associates', 'Associates')}
					</h3>
					<Button
						onPress={() => addAssociate()}
						className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface)]"
					>
						<Plus size={14} />
						{t('quoteBuilder.addAssociate', 'Add associate')}
					</Button>
				</div>
				<p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
					{isRTL
						? 'أضف مرافقًا فقط إذا كنت تثق به لمناقشة هذا الطلب والتصرف نيابةً عنك. ستتعامل هايبركُوت مع تعليماته على أنها مصرح بها من طرفك لهذا الطلب، وتبقى مسؤولية هذا الاختيار عليك.'
						: 'Add an associate only if you trust them to discuss this order and act on your behalf. HyperQuote will treat their instructions as authorized by you for this request, and you remain responsible for that choice.'}
				</p>
				{associates.map((associate, index) => (
					<div
						key={associate.id}
						className="grid gap-2 rounded-xl border border-[var(--color-border)] p-3 sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto]"
					>
						<label className="flex flex-col gap-1">
							<span className="text-[13px] font-medium text-[var(--color-text-muted)]">
								{t('quoteBuilder.associateName', 'Name')}
							</span>
							<input
								value={associate.name}
								onChange={(event) =>
									updateAssociate(associate.id, {
										name: event.currentTarget.value,
									})
								}
								placeholder={t('quoteBuilder.associateName', 'Name')}
								className="h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-[13px] font-medium text-[var(--color-text-muted)]">
								{t('quoteBuilder.countryCode', 'Country code')}
							</span>
							<select
								value={associate.countryCode}
								onChange={(event) =>
									updateAssociate(associate.id, {
										countryCode: event.currentTarget.value,
									})
								}
								className="h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
							>
								{ORDER_ASSOCIATE_COUNTRY_CODES.map((country) => (
									<option key={country.code} value={country.code}>
										{country.code} {country.label}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-[13px] font-medium text-[var(--color-text-muted)]">
								{t('quoteBuilder.phoneNumber', 'Phone number')}
							</span>
							<input
								value={associate.number}
								onChange={(event) =>
									updateAssociate(associate.id, {
										number: event.currentTarget.value,
									})
								}
								placeholder={t('quoteBuilder.phoneNumber', 'Phone number')}
								className="h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
							/>
						</label>
						<Button
							onPress={() => removeAssociate(associate.id)}
							aria-label={t('quoteBuilder.removeAssociate', {
								defaultValue: 'Remove associate {{index}}',
								index: index + 1,
							})}
							className="flex h-10 w-10 items-center justify-center self-end rounded-lg text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
						>
							<Trash2 size={16} />
						</Button>
					</div>
				))}
			</section>

			{/* Section: Notes */}
			<section>
				<TextField
					value={notes}
					onChange={handleNotesChange}
					className="flex flex-col gap-1"
				>
					<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('quoteBuilder.notesLabel', 'Notes')}
					</Label>
					<TextArea
						rows={3}
						className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-colors resize-none"
						placeholder={t(
							'quoteBuilder.notesStep2Placeholder',
							'Any special delivery instructions, site access details, or additional requirements...',
						)}
					/>
				</TextField>
			</section>

			{/* Section: Attachments */}
			<section>
				<AttachmentUpload />
			</section>

			{/* Navigation */}
			<div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
				<Button
					onPress={() => setStep(1)}
					className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer flex items-center gap-1.5"
				>
					<BackArrow size={16} />
					{t('quoteBuilder.back', 'Back')}
				</Button>

				<div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
					{draftFeedback && (
						<span
							role={draftFeedback === 'error' ? 'alert' : 'status'}
							className={`text-[13px] ${
								draftFeedback === 'error'
									? 'text-[#B91C1C]'
									: 'text-[var(--color-text-muted)]'
							}`}
						>
							{draftFeedback === 'error'
								? t('quoteBuilder.draftSaveFailed')
								: t('quoteBuilder.draftSaved')}
						</span>
					)}
					{(unavailableItems.length > 0 || isValidationFailed) && (
						<span className="text-end text-[13px] text-[#B91C1C]">
							{isValidationFailed
								? t(
										'orders.validationFailed',
										'Could not confirm catalog availability. Try again.',
									)
								: t('orders.unavailableItems', {
										items: unavailableItems.join(', '),
									})}
						</span>
					)}
					<Button
						onPress={handleSaveDraft}
						isDisabled={savingDraft || isOrderabilityBlocked}
						className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
					>
						{savingDraft
							? t('quoteBuilder.savingDraft')
							: t('quoteBuilder.saveAsDraft')}
					</Button>
					<Button
						onPress={() => setStep(3)}
						isDisabled={!canContinue}
						className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
					>
						{t('quoteBuilder.continue', 'Continue')}
					</Button>
				</div>
			</div>
		</div>
	)
}

function LocationDeliverySection({
	location,
	index,
	itemCount,
	canRemove,
	minDate,
	onUpdate,
	onRemove,
}: {
	location: QuoteLocation
	index: number
	itemCount: number
	canRemove: boolean
	minDate: DateValue
	onUpdate: (updates: Partial<Omit<QuoteLocation, 'clientId'>>) => void
	onRemove: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const isRTL = i18n.dir() === 'rtl'
	const PrevChevron = isRTL ? ChevronRight : ChevronLeft
	const NextChevron = isRTL ? ChevronLeft : ChevronRight
	const currentDateValue = parseDeliveryDateValue(location.deliveryDate)

	return (
		<div className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h4 className="text-sm font-semibold text-[var(--color-text)]">
						{t('quoteBuilder.locationNumber', {
							defaultValue: 'Location {{number}}',
							number: index + 1,
						})}
					</h4>
					<p className="text-[13px] text-[var(--color-text-muted)]">
						{t('quoteBuilder.locationItemCount', {
							count: itemCount,
							defaultValue: '{{count}} items',
						})}
					</p>
				</div>
				{canRemove && (
					<Button
						onPress={onRemove}
						aria-label={t('quoteBuilder.removeLocation', {
							defaultValue: 'Remove location {{number}}',
							number: index + 1,
						})}
						className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
					>
						<Trash2 size={16} />
					</Button>
				)}
			</div>

			<AddressComboBox
				value={location.addressId}
				onChange={(addressId) => onUpdate({ addressId })}
				label={t('quoteBuilder.deliveryAddress', 'Delivery Address')}
			/>

			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
				<DatePicker
					value={currentDateValue}
					onChange={(value) =>
						onUpdate({ deliveryDate: value ? value.toString() : null })
					}
					minValue={minDate}
					isDateUnavailable={isDateUnavailable}
					granularity="day"
					className="flex flex-col gap-1"
				>
					<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('quoteBuilder.deliveryDateLabel', 'Preferred Delivery Date')}
					</Label>
					<Group className="flex h-10 overflow-hidden rounded-lg border border-[var(--color-border)] bg-transparent transition-colors focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30">
						<DateInput className="flex flex-1 items-center px-3 font-mono text-sm text-[var(--color-text)] outline-none">
							{(segment) => (
								<DateSegment
									segment={segment}
									className="rounded px-0.5 font-mono tabular-nums outline-none focus:bg-[var(--color-primary)]/10 focus:text-[var(--color-primary)]"
								/>
							)}
						</DateInput>
						<Button className="border-s border-[var(--color-border)] px-3 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] cursor-pointer outline-none">
							<svg
								aria-hidden="true"
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
							>
								<rect
									x="2"
									y="3"
									width="12"
									height="11"
									rx="1.5"
									stroke="currentColor"
									strokeWidth="1.2"
								/>
								<path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.2" />
								<path
									d="M5.5 1.5v3M10.5 1.5v3"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinecap="round"
								/>
							</svg>
						</Button>
					</Group>
					<Popover className="z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg">
						<Dialog className="outline-none">
							<Calendar className="w-[280px]">
								<header className="mb-2 flex items-center justify-between">
									<Button
										slot="previous"
										className="rounded p-1 transition-colors hover:bg-[var(--color-surface)] cursor-pointer outline-none"
									>
										<PrevChevron size={16} />
									</Button>
									<Heading className="text-sm font-semibold text-[var(--color-text)]" />
									<Button
										slot="next"
										className="rounded p-1 transition-colors hover:bg-[var(--color-surface)] cursor-pointer outline-none"
									>
										<NextChevron size={16} />
									</Button>
								</header>
								<CalendarGrid className="w-full">
									<CalendarGridHeader>
										{(day) => (
											<CalendarHeaderCell className="p-1 text-center text-[13px] font-medium text-[var(--color-text-muted)]">
												{day}
											</CalendarHeaderCell>
										)}
									</CalendarGridHeader>
									<CalendarGridBody>
										{(date) => (
											<CalendarCell
												date={date}
												className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-center font-mono text-sm outline-none hover:bg-[var(--color-surface)] selected:bg-[var(--color-primary)] selected:font-semibold selected:text-[var(--color-primary-contrast)] unavailable:cursor-not-allowed unavailable:text-[var(--color-text-muted)]/30 unavailable:line-through disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]/20 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 outside-month:text-[var(--color-text-muted)]/30"
											/>
										)}
									</CalendarGridBody>
								</CalendarGrid>
							</Calendar>
						</Dialog>
					</Popover>
				</DatePicker>

				<label className="flex flex-col gap-1">
					<span className="text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('quoteBuilder.deliveryHour', 'Hour')}
					</span>
					<select
						value={location.deliveryHour ?? ''}
						onChange={(event) =>
							onUpdate({
								deliveryHour: event.currentTarget.value
									? Number(event.currentTarget.value)
									: null,
							})
						}
						className="h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 font-mono text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
					>
						<option value="">{t('quoteBuilder.deliveryHour', 'Hour')}</option>
						{Array.from({ length: 12 }, (_, hour) => hour + 1).map((hour) => (
							<option key={hour} value={hour}>
								{hour}
							</option>
						))}
					</select>
				</label>

				<label className="flex flex-col gap-1">
					<span className="text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('quoteBuilder.deliveryPeriod', 'AM/PM')}
					</span>
					<select
						value={location.deliveryPeriod ?? ''}
						onChange={(event) =>
							onUpdate({
								deliveryPeriod:
									event.currentTarget.value === 'AM' ||
									event.currentTarget.value === 'PM'
										? event.currentTarget.value
										: null,
							})
						}
						className="h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 font-mono text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
					>
						<option value="">
							{t('quoteBuilder.deliveryPeriod', 'AM/PM')}
						</option>
						<option value="AM">AM</option>
						<option value="PM">PM</option>
					</select>
				</label>
			</div>
			<p className="text-[13px] text-[var(--color-text-muted)]">
				{t(
					'quoteBuilder.fridayError',
					'Friday and Saturday are not delivery days. Please choose Sunday-Thursday.',
				)}
			</p>
		</div>
	)
}

function parseDeliveryDateValue(value: string | null): DateValue | undefined {
	if (!value) return undefined
	try {
		return parseDate(value)
	} catch {
		return undefined
	}
}
