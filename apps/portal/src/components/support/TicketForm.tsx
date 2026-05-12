/**
 * TicketForm — underline inputs, minimal. Data is the design.
 */
import type { ParseKeys } from 'i18next'
import { ChevronDown } from 'lucide-react'
import { type FormEvent, type Key, useState } from 'react'
import {
	Button,
	Form,
	Input,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { TicketCategory } from '../../types/support'

const CATEGORIES: TicketCategory[] = [
	'order_issue',
	'delivery_problem',
	'billing',
	'account',
	'other',
]

const CATEGORY_LABELS: Record<TicketCategory, string> = {
	order_issue: 'Order issue',
	delivery_problem: 'Delivery problem',
	billing: 'Billing',
	account: 'Account',
	other: 'Other',
}
const CATEGORY_SET = new Set<string>(CATEGORIES)

function isTicketCategory(key: Key | null): key is TicketCategory {
	return typeof key === 'string' && CATEGORY_SET.has(key)
}

interface TicketFormProps {
	onSubmit: (data: {
		subject: string
		category: TicketCategory
		message: string
		orderId?: string
	}) => void
	isSubmitting?: boolean
}

const labelClass =
	'mb-2.5 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-subtle)] sm:mb-3'
const inputClass =
	'w-full bg-transparent border-0 border-b border-[var(--color-border)] pb-2.5 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] sm:text-sm'

export function TicketForm({ onSubmit, isSubmitting }: TicketFormProps) {
	const { t } = useTranslation('portal')
	const [subject, setSubject] = useState('')
	const [category, setCategory] = useState<TicketCategory>('order_issue')
	const [message, setMessage] = useState('')
	const [orderId, setOrderId] = useState('')
	const getCategoryLabel = (cat: TicketCategory) =>
		t(`support.category.${cat}` as ParseKeys<'portal'>, {
			defaultValue: CATEGORY_LABELS[cat],
		})

	function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!subject.trim() || !message.trim()) return
		onSubmit({
			subject: subject.trim(),
			category,
			message: message.trim(),
			orderId: orderId.trim() || undefined,
		})
	}

	return (
		<Form onSubmit={handleSubmit} className="flex flex-col gap-8 sm:gap-10">
			{/* Subject */}
			<TextField isRequired value={subject} onChange={setSubject}>
				<Label className={labelClass}>{t('support.formSubject')}</Label>
				<Input
					placeholder={t('support.formSubjectPlaceholder')}
					className={`${inputClass} placeholder:text-[var(--color-border)]`}
				/>
			</TextField>

			{/* Category */}
			<Select
				selectedKey={category}
				onSelectionChange={(key) => {
					if (isTicketCategory(key)) setCategory(key)
				}}
			>
				<Label className={labelClass}>{t('support.formCategory')}</Label>
				<Button className="flex min-h-11 w-full cursor-pointer items-center justify-between border-0 border-b border-[var(--color-border)] bg-transparent pb-2.5 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] sm:min-h-0 sm:text-sm">
					<SelectValue />
					<ChevronDown
						aria-hidden
						size={14}
						strokeWidth={1.5}
						className="text-[var(--color-text-subtle)]"
					/>
				</Button>
				<Popover className="w-[var(--trigger-width)] max-h-[min(18rem,60vh)] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg">
					<ListBox className="p-1 outline-none">
						{CATEGORIES.map((cat) => (
							<ListBoxItem
								key={cat}
								id={cat}
								textValue={getCategoryLabel(cat)}
								className="min-h-11 cursor-pointer rounded-md px-3 py-3 text-[15px] text-[var(--color-text)] outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] sm:min-h-0 sm:py-2 sm:text-sm"
							>
								{getCategoryLabel(cat)}
							</ListBoxItem>
						))}
					</ListBox>
				</Popover>
			</Select>

			{/* Message */}
			<div>
				<span className={labelClass}>{t('support.formDescription')}</span>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder={t('support.formDescriptionPlaceholder')}
					rows={4}
					className={`${inputClass} min-h-28 resize-y placeholder:text-[var(--color-border)]`}
				/>
			</div>

			{/* Related order */}
			<TextField value={orderId} onChange={setOrderId}>
				<Label className={labelClass}>{t('support.formRelatedOrder')}</Label>
				<Input
					placeholder="ORD-2026-00042"
					className={`${inputClass} font-mono placeholder:text-[var(--color-border)]`}
				/>
			</TextField>

			{/* Submit */}
			<button
				type="submit"
				disabled={isSubmitting || !subject.trim() || !message.trim()}
				className="h-11 w-full self-start rounded-lg bg-[#0F172A] px-5 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-30 dark:bg-[#FAFAFA] dark:text-[#09090B] sm:h-9 sm:w-auto"
			>
				{isSubmitting ? t('support.submitting') : t('support.submitTicket')}
			</button>
		</Form>
	)
}
