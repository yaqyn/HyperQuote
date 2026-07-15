import { standardSchemaResolver } from '@hyperquote/forms'
import { Check, Info, Loader2, Send } from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox'
import { Popover } from 'react-aria-components/Popover'
import { Select, SelectValue } from 'react-aria-components/Select'
import { TextArea } from 'react-aria-components/TextArea'
import { TextField as AriaTextField } from 'react-aria-components/TextField'
import { type Control, Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { getContactFormDefaults, submitContactForm } from '../../lib/contact'

const contactSchema = z.object({
	name: z
		.string()
		.min(2, 'Please enter at least 2 characters')
		.max(80, 'Name is too long')
		.regex(/^[^\d]+$/, 'Names can\u2019t contain numbers'),
	email: z.string().email('This doesn\u2019t look like a valid email'),
	phone: z
		.string()
		.regex(/^[0-9]{10}$/, 'Enter 10 digits after the country code')
		.optional()
		.or(z.literal('')),
	subject: z.enum(['general', 'quote', 'delivery', 'billing', 'other']),
	message: z
		.string()
		.min(10, 'A bit more detail would help us assist you')
		.max(2000, 'Message is too long'),
})

type ContactFormData = z.infer<typeof contactSchema>

const COUNTRY_CODE = '+20'

const inputClass = (compact: boolean) =>
	`${compact ? 'h-[38px]' : 'h-[48px]'} w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 pe-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40`
const labelClass = (compact: boolean) =>
	`${compact ? 'mb-1 text-[10px]' : 'mb-2 text-[11px]'} block font-medium uppercase tracking-[.1em] opacity-30`

function FieldHint({ message }: { message: string }) {
	return (
		<div className="mt-2 flex items-start gap-1.5">
			<Info
				size={13}
				className="mt-px shrink-0 text-[var(--color-primary)] opacity-60"
			/>
			<span className="text-[12px] leading-[1.4] text-[var(--color-primary)] opacity-70">
				{message}
			</span>
		</div>
	)
}

function MessageCharCount({ control }: { control: Control<ContactFormData> }) {
	const message = useWatch({ control, name: 'message', defaultValue: '' })
	const count = (message ?? '').length

	return (
		<span className="font-[family-name:var(--font-mono)] text-[11px] opacity-30">
			{count}/2000
		</span>
	)
}

type ContactTextName = Extract<
	keyof ContactFormData,
	'name' | 'email' | 'message'
>

type ContactFormProps = {
	onSubmitted?: () => void
	variant?: 'default' | 'hero'
}

function ContactTextField({
	control,
	name,
	label,
	fallbackMessage,
	disabled,
	type,
	multiline = false,
	footer,
	compact = false,
	className,
}: {
	control: Control<ContactFormData>
	name: ContactTextName
	label: string
	fallbackMessage: string
	disabled: boolean
	type?: 'email'
	multiline?: boolean
	footer?: ReactNode
	compact?: boolean
	className?: string
}) {
	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => {
				const hint = fieldState.error ? (
					<FieldHint message={fieldState.error.message ?? fallbackMessage} />
				) : null

				return (
					<AriaTextField
						className={className}
						value={field.value ?? ''}
						onChange={field.onChange}
						onBlur={field.onBlur}
						type={type}
						isRequired
						isInvalid={!!fieldState.error}
						isDisabled={disabled}
					>
						<Label className={labelClass(compact)}>{label}</Label>
						{multiline ? (
							<>
								<TextArea
									rows={compact ? 2 : 4}
									className={`${compact ? 'min-h-[62px]' : 'min-h-[120px]'} w-full resize-none border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent py-2 ps-0 pe-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40`}
								/>
								<div
									className={`${compact ? 'mt-1' : 'mt-1.5'} flex items-center justify-between`}
								>
									{hint ?? <span />}
									{footer}
								</div>
							</>
						) : (
							<>
								<Input className={inputClass(compact)} />
								{hint}
							</>
						)}
					</AriaTextField>
				)
			}}
		/>
	)
}

export function ContactForm({
	onSubmitted,
	variant = 'default',
}: ContactFormProps = {}) {
	const { t } = useTranslation('website')
	const [submitted, setSubmitted] = useState(false)
	const [ticketReference, setTicketReference] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const isHero = variant === 'hero'

	const form = useForm<ContactFormData>({
		resolver: standardSchemaResolver(contactSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			subject: 'general',
			message: '',
		},
		mode: 'onSubmit',
	})
	const { getValues, setValue } = form

	const subjectItems = [
		{ id: 'general', label: t('support.form.subjects.general') },
		{ id: 'quote', label: t('support.form.subjects.quote') },
		{ id: 'delivery', label: t('support.form.subjects.delivery') },
		{ id: 'billing', label: t('support.form.subjects.billing') },
		{ id: 'other', label: t('support.form.subjects.other') },
	]

	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let active = true
		getContactFormDefaults()
			.then((defaults) => {
				if (!active) return
				if (defaults.name && !getValues('name').trim()) {
					setValue('name', defaults.name, { shouldDirty: false })
				}
				if (defaults.email && !getValues('email').trim()) {
					setValue('email', defaults.email, { shouldDirty: false })
				}
				if (defaults.phone && !getValues('phone')?.trim()) {
					setValue('phone', contactPhoneInput(defaults.phone), {
						shouldDirty: false,
					})
				}
			})
			.catch(() => undefined)
		return () => {
			active = false
		}
	}, [getValues, setValue])

	// Strip country code if user types it manually
	const handlePhoneChange = useCallback(
		(value: string) => {
			let cleaned = value.replace(/[^0-9]/g, '')
			// Strip leading 20 if they typed the country code
			if (cleaned.startsWith('20') && cleaned.length > 10) {
				cleaned = cleaned.slice(2)
			}
			// Strip leading 0 (local format)
			if (cleaned.startsWith('0') && cleaned.length > 10) {
				cleaned = cleaned.slice(1)
			}
			// Cap at 10 digits
			cleaned = cleaned.slice(0, 10)
			form.setValue('phone', cleaned, { shouldValidate: false })
		},
		[form],
	)

	async function onSubmit(data: ContactFormData) {
		// Prepend country code for submission
		const submitData = {
			...data,
			phone: data.phone ? `${COUNTRY_CODE}${data.phone}` : '',
		}
		setSubmitting(true)
		setError(null)
		try {
			const result = await submitContactForm({ data: submitData })
			if ('error' in result) {
				setError(
					result.error === 'rate_limited'
						? t(
								'support.form.rateLimited',
								'Too many support requests. Please wait a minute and try again.',
							)
						: t('support.form.error'),
				)
				return
			}
			setTicketReference(result.ticketId)
			setSubmitted(true)
			onSubmitted?.()
		} catch {
			setError(t('support.form.error'))
		} finally {
			setSubmitting(false)
		}
	}

	if (submitted) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ type: 'spring', stiffness: 200, damping: 20 }}
				className="flex flex-col items-center gap-4 py-12"
			>
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]">
					<Check size={28} className="text-white" />
				</div>
				<p className="text-center text-[16px] font-bold">
					{t('support.form.success')}
				</p>
				{ticketReference && (
					<p className="font-[family-name:var(--font-mono)] text-[12px] opacity-60">
						{ticketReference}
					</p>
				)}
			</motion.div>
		)
	}

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			noValidate
			className={
				isHero
					? 'grid w-full grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2'
					: 'mx-auto flex w-full max-w-[560px] flex-col gap-7 lg:max-w-none lg:gap-8'
			}
		>
			<ContactTextField
				name="name"
				control={form.control}
				label={t('support.form.name')}
				fallbackMessage="Please enter your name"
				disabled={submitting}
				compact={isHero}
				className={isHero ? 'min-w-0' : undefined}
			/>

			<ContactTextField
				name="email"
				control={form.control}
				label={t('support.form.email')}
				fallbackMessage="Please enter a valid email"
				disabled={submitting}
				type="email"
				compact={isHero}
				className={isHero ? 'min-w-0' : undefined}
			/>

			{/* Phone */}
			<Controller
				name="phone"
				control={form.control}
				render={({ field, fieldState }) => (
					<AriaTextField
						className={isHero ? 'min-w-0' : undefined}
						value={field.value ?? ''}
						onChange={handlePhoneChange}
						onBlur={field.onBlur}
						type="tel"
						isInvalid={!!fieldState.error}
						isDisabled={submitting}
					>
						<Label className={labelClass(isHero)}>
							{t('support.form.phone')}
						</Label>
						<div className="flex items-center border-b border-[var(--color-text)]/[0.1] transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
							<span
								className={`flex ${isHero ? 'h-[38px]' : 'h-[48px]'} shrink-0 items-center pe-3 font-[family-name:var(--font-mono)] text-[16px] opacity-35`}
							>
								{COUNTRY_CODE}
							</span>
							<div className="h-5 w-px bg-[var(--color-text)]/[0.08]" />
							<Input
								className={`${isHero ? 'h-[38px]' : 'h-[48px]'} w-full border-0 bg-transparent ps-3 pe-0 font-[family-name:var(--font-mono)] text-[16px] outline-none`}
							/>
						</div>
						{fieldState.error && (
							<FieldHint
								message={
									fieldState.error.message ??
									'Enter 10 digits after the country code'
								}
							/>
						)}
					</AriaTextField>
				)}
			/>

			{/* Subject */}
			<Controller
				name="subject"
				control={form.control}
				render={({ field, fieldState }) => (
					<Select
						className={isHero ? 'min-w-0' : undefined}
						selectedKey={field.value ?? null}
						onSelectionChange={(key) => field.onChange(key as string)}
						onBlur={field.onBlur}
						isRequired
						isInvalid={!!fieldState.error}
						isDisabled={submitting}
					>
						<Label className={labelClass(isHero)}>
							{t('support.form.subject')}
						</Label>
						<Button
							className={`flex items-center justify-between ${inputClass(isHero)}`}
						>
							<SelectValue />
						</Button>
						<Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-text)]/[0.06] bg-[var(--color-card)] p-1 shadow-lg backdrop-blur-[20px]">
							<ListBox items={subjectItems}>
								{(item) => (
									<ListBoxItem
										id={item.id}
										className="cursor-pointer rounded-lg px-3 py-2.5 text-[14px] outline-none hover:bg-[var(--color-text)]/[0.04] focus:bg-[var(--color-text)]/[0.04]"
									>
										{item.label}
									</ListBoxItem>
								)}
							</ListBox>
						</Popover>
						{fieldState.error && (
							<FieldHint message="Please select a subject" />
						)}
					</Select>
				)}
			/>

			<ContactTextField
				name="message"
				control={form.control}
				label={t('support.form.message')}
				fallbackMessage="Please add more detail"
				disabled={submitting}
				multiline
				compact={isHero}
				className={isHero ? 'sm:col-span-2' : undefined}
				footer={
					<div className="flex items-center gap-3">
						<MessageCharCount control={form.control} />
						<span
							aria-hidden="true"
							className="h-3 w-px bg-[var(--site-rule)]"
						/>
						<Button
							type="submit"
							isDisabled={submitting}
							className="inline-flex h-7 items-center gap-2 rounded-sm px-1 text-[12px] font-semibold text-[var(--color-primary)] outline-none transition-colors hover:text-[var(--color-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 disabled:opacity-45"
						>
							{t('support.form.submit')}
							{submitting ? (
								<Loader2 size={13} className="animate-spin" />
							) : (
								<Send size={13} />
							)}
						</Button>
					</div>
				}
			/>

			{/* Server error */}
			{error && (
				<div
					className={`flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)]/[0.06] px-4 py-3 ${isHero ? 'sm:col-span-2' : ''}`}
				>
					<Info size={14} className="shrink-0 text-[var(--color-primary)]" />
					<p className="text-[13px] text-[var(--color-primary)]" role="alert">
						{error}
					</p>
				</div>
			)}
		</form>
	)
}

function contactPhoneInput(value: string): string {
	let cleaned = value.replace(/[^0-9]/g, '')
	if (cleaned.startsWith('20') && cleaned.length > 10)
		cleaned = cleaned.slice(2)
	if (cleaned.startsWith('0') && cleaned.length > 10) cleaned = cleaned.slice(1)
	return cleaned.slice(0, 10)
}
