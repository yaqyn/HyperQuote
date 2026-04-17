import { useState } from 'react'
import { Switch } from 'react-aria-components'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { sendQuote } from '../../../lib/server/sales-send'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'
import { Pill, PillGroup, Button as UiButton, UnderlineInput } from '../../ui'
import type { QuoteFormValues } from './types'

interface SendQuoteProps {
	quoteId: string
	quoteNumber: string
	customerName: string
	onSent: () => void
}

export function SendQuote({
	quoteId,
	quoteNumber,
	customerName,
	onSent,
}: SendQuoteProps) {
	const { i18n } = useTranslation('internal')
	const { control } = useFormContext<QuoteFormValues>()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

	const lineItems = useWatch({ control, name: 'lineItems' })
	const coverNote = useWatch({ control, name: 'coverNote' })

	const [isSending, setIsSending] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [scheduleSend, setScheduleSend] = useState(false)
	const [sendMethod, setSendMethod] = useState<'portal' | 'email' | 'both'>(
		'portal',
	)
	const [scheduledDate, setScheduledDate] = useState<string | null>(null)

	const missingItems = (lineItems ?? []).filter(
		(item) => item.freshnessIndicator === 'missing',
	)
	const hasMissingPricing = missingItems.length > 0

	async function handleSend() {
		setIsSending(true)
		try {
			await sendQuote({
				data: {
					quoteId,
					method: sendMethod,
					// Recipients default to the customer's primary contact — the
					// server resolves it off db.customers. When multi-recipient
					// selection ships, pass the selected ids here.
					coverNote: coverNote || undefined,
					scheduledAt:
						scheduleSend && scheduledDate ? scheduledDate : undefined,
				},
			})
			setShowConfirm(false)
			onSent()
		} catch (err) {
			console.error('Failed to send quote:', err)
		} finally {
			setIsSending(false)
		}
	}

	return (
		<div className="space-y-3">
			{/* Missing pricing -- compact */}
			{hasMissingPricing && (
				<p className="text-[12px] text-yellow-700 dark:text-yellow-300">
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
						{missingItems.length}
					</span>{' '}
					item{missingItems.length > 1 ? 's' : ''} will show "Price on
					Application"
				</p>
			)}

			{/* Recipients + Cover Note + Send Via -- compact rows */}
			<div className="flex items-center gap-3">
				{/* Recipients as tags */}
				<span className="text-[12px] font-medium text-[var(--color-text)]">
					Primary Contact
				</span>
				{/* Send via pills */}
				<PillGroup
					aria-label="Send method"
					value={sendMethod}
					onChange={(val) => setSendMethod(val as 'portal' | 'email' | 'both')}
				>
					<Pill value="portal" className="px-2.5 py-0.5">
						Portal
					</Pill>
					<Pill value="email" className="px-2.5 py-0.5">
						Email
					</Pill>
					<Pill value="both" className="px-2.5 py-0.5">
						Both
					</Pill>
				</PillGroup>

				{/* Schedule toggle */}
				<Switch
					isSelected={scheduleSend}
					onChange={setScheduleSend}
					className="group flex items-center gap-1.5"
				>
					<div className="h-4 w-7 rounded-full bg-black/[0.06] p-0.5 transition-colors group-data-[selected]:bg-[var(--color-primary)] dark:bg-white/[0.08]">
						<div className="h-3 w-3 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-3 dark:bg-black" />
					</div>
					<span className="text-[12px] text-[var(--color-text-muted)]">
						Schedule
					</span>
				</Switch>

				{scheduleSend && (
					<>
						<UiButton
							variant="ghost"
							onPress={() => {
								const tomorrow = new Date()
								tomorrow.setDate(tomorrow.getDate() + 1)
								tomorrow.setHours(8, 0, 0, 0)
								setScheduledDate(tomorrow.toISOString())
							}}
						>
							Tomorrow 8 AM
						</UiButton>
						{scheduledDate && (
							<span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
								{new Date(scheduledDate).toLocaleString(locale)}
							</span>
						)}
					</>
				)}
			</div>

			{/* Cover note -- single line input that can expand */}
			<Controller
				control={control}
				name="coverNote"
				render={({ field }) => (
					<UnderlineInput
						value={field.value ?? ''}
						onChange={(val) => field.onChange(val)}
						placeholder="Cover note (optional)..."
						label="Cover note"
					/>
				)}
			/>

			{/* Send */}
			<UiButton
				variant="subtle"
				className="w-full rounded-lg py-2.5"
				onPress={() => setShowConfirm(true)}
				isDisabled={isSending}
			>
				{scheduleSend ? 'Schedule Send' : 'Send Quote'}
			</UiButton>

			{/* Confirmation Dialog */}
			<DispatchDialog
				isOpen={showConfirm}
				onClose={() => setShowConfirm(false)}
				size="sm"
				eyebrow={
					<span>
						Quote ·{' '}
						<span className="font-[family-name:var(--font-plex-mono)]">
							{quoteNumber}
						</span>
					</span>
				}
				title={`Send to ${customerName}?`}
				caption={
					scheduleSend && scheduledDate
						? `Scheduled for ${new Date(scheduledDate).toLocaleString(locale)}`
						: `Via ${sendMethod === 'both' ? 'Portal + Email' : sendMethod === 'portal' ? 'Portal' : 'Email'}`
				}
				dismissDisabled={isSending}
			>
				<DispatchBody>
					{hasMissingPricing ? (
						<div className="border border-[#D97706]/40 bg-[#D97706]/[0.06] px-4 py-3">
							<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[#D97706]">
								Missing pricing
							</p>
							<p className="mt-1 font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)]">
								{missingItems.length} item{missingItems.length > 1 ? 's' : ''}{' '}
								will show &ldquo;Price on Application&rdquo;.
							</p>
						</div>
					) : (
						<p className="font-[family-name:var(--font-archivo)] italic text-[13.5px] text-[var(--color-text-muted)]">
							Everything is in order. Confirm to transmit.
						</p>
					)}
				</DispatchBody>
				<DispatchFooter>
					<DispatchAction
						tone="ghost"
						onPress={() => setShowConfirm(false)}
						isDisabled={isSending}
					>
						Cancel
					</DispatchAction>
					<DispatchAction onPress={handleSend} isDisabled={isSending}>
						{isSending ? 'Sending…' : 'Confirm'}
					</DispatchAction>
				</DispatchFooter>
			</DispatchDialog>
		</div>
	)
}
