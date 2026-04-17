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
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import {
	Button,
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHeader,
	CalendarHeaderCell,
	DateInput,
	DatePicker,
	DateSegment,
	Dialog,
	Group,
	Heading,
	Label,
	Popover,
	TextArea,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { isDateUnavailable } from '../../../lib/business-days'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'
import { AddressComboBox } from './AddressComboBox'
import { AttachmentUpload } from './AttachmentUpload'

// ============================================================================
// Component
// ============================================================================

export function DetailsStep() {
	const { t, i18n } = useTranslation('portal')
	const isRTL = i18n.dir() === 'rtl'

	const deliveryAddressId = useQuoteBuilderStore((s) => s.deliveryAddressId)
	const deliveryDate = useQuoteBuilderStore((s) => s.deliveryDate)
	const notes = useQuoteBuilderStore((s) => s.notes)
	const setStep = useQuoteBuilderStore((s) => s.setStep)
	const setDeliveryDate = useQuoteBuilderStore((s) => s.setDeliveryDate)
	const setNotes = useQuoteBuilderStore((s) => s.setNotes)

	const BackArrow = isRTL ? ArrowRight : ArrowLeft
	const PrevChevron = isRTL ? ChevronRight : ChevronLeft
	const NextChevron = isRTL ? ChevronLeft : ChevronRight

	const minDate = today(getLocalTimeZone()).add({ days: 1 })
	const currentDateValue = deliveryDate ? parseDate(deliveryDate) : undefined

	const handleDateChange = useCallback(
		(value: DateValue | null) => {
			setDeliveryDate(value ? value.toString() : null)
		},
		[setDeliveryDate],
	)

	const handleNotesChange = useCallback(
		(value: string) => {
			setNotes(value)
		},
		[setNotes],
	)

	const canContinue = !!deliveryAddressId

	return (
		<div className="max-w-2xl mx-auto space-y-6 px-6 py-4">
			{/* Section: Delivery Address */}
			<section>
				<AddressComboBox />
			</section>

			{/* Section: Preferred Delivery Date */}
			<section>
				<DatePicker
					value={currentDateValue}
					onChange={handleDateChange}
					minValue={minDate}
					isDateUnavailable={isDateUnavailable}
					granularity="day"
					className="flex flex-col gap-1"
				>
					<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('quoteBuilder.deliveryDateLabel', 'Preferred Delivery Date')}
					</Label>
					<Group className="flex h-10 rounded-lg border border-[var(--color-border)] bg-transparent overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30 focus-within:border-[var(--color-primary)] transition-colors">
						<DateInput className="flex items-center flex-1 px-3 text-sm font-mono text-[var(--color-text)] outline-none">
							{(segment) => (
								<DateSegment
									segment={segment}
									className="px-0.5 rounded outline-none focus:bg-[var(--color-primary)]/10 focus:text-[var(--color-primary)] font-mono tabular-nums"
								/>
							)}
						</DateInput>
						<Button className="px-3 border-s border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer outline-none">
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
					<Popover className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg p-3 z-50">
						<Dialog className="outline-none">
							<Calendar className="w-[280px]">
								<header className="flex items-center justify-between mb-2">
									<Button
										slot="previous"
										className="p-1 rounded hover:bg-[var(--color-surface)] cursor-pointer outline-none transition-colors"
									>
										<PrevChevron size={16} />
									</Button>
									<Heading className="text-sm font-semibold text-[var(--color-text)]" />
									<Button
										slot="next"
										className="p-1 rounded hover:bg-[var(--color-surface)] cursor-pointer outline-none transition-colors"
									>
										<NextChevron size={16} />
									</Button>
								</header>
								<CalendarGrid className="w-full">
									<CalendarGridHeader>
										{(day) => (
											<CalendarHeaderCell className="text-[13px] font-medium text-[var(--color-text-muted)] p-1 text-center">
												{day}
											</CalendarHeaderCell>
										)}
									</CalendarGridHeader>
									<CalendarGridBody>
										{(date) => (
											<CalendarCell
												date={date}
												className="w-8 h-8 rounded-lg text-sm text-center flex items-center justify-center font-mono outline-none cursor-pointer
                          hover:bg-[var(--color-surface)]
                          selected:bg-[var(--color-primary)] selected:text-white selected:font-semibold
                          unavailable:text-[var(--color-text-muted)]/30 unavailable:line-through unavailable:cursor-not-allowed
                          disabled:text-[var(--color-text-muted)]/20 disabled:cursor-not-allowed
                          focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50
                          outside-month:text-[var(--color-text-muted)]/30"
											/>
										)}
									</CalendarGridBody>
								</CalendarGrid>
							</Calendar>
						</Dialog>
					</Popover>
					<p className="text-[13px] text-[var(--color-text-muted)]">
						{t(
							'quoteBuilder.fridayError',
							'Friday and Saturday are not delivery days. Please choose Sunday-Thursday.',
						)}
					</p>
				</DatePicker>
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

				<Button
					onPress={() => setStep(3)}
					isDisabled={!canContinue}
					className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
				>
					{t('quoteBuilder.continue', 'Continue')}
				</Button>
			</div>
		</div>
	)
}
