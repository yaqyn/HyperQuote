import { useMutation } from '@tanstack/react-query'
import {
	ExternalLink,
	KeyRound,
	Loader2,
	Mail,
	MessageCircle,
	Phone,
	X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sendCustomerPasswordReset } from '../../lib/server/customer-service'
import { useOrderStatusStore } from '../../stores/order-status'
import type {
	Conversation,
	Customer,
	LinkedOrder,
	LinkedQuote,
} from '../../types/customer-service'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { SlidePanel } from '../shared/SlidePanel'

interface CustomerProfilePanelProps {
	conversation: Conversation | null
	isOpen: boolean
	onClose: () => void
}

function formatCurrency(amount: number, currency: string): string {
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

function formatRelativeDate(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime()
	const days = Math.floor(diff / 86_400_000)
	if (days < 1) return 'today'
	if (days < 30) return `${days}d ago`
	const months = Math.floor(days / 30)
	if (months < 12) return `${months}mo ago`
	const years = Math.floor(months / 12)
	return `${years}y ago`
}

function formatDateTime(iso: string): string {
	return new Intl.DateTimeFormat('en-EG', {
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
	}).format(new Date(iso))
}

function statusTone(status: string) {
	if (status === 'delivered' || status === 'accepted') return 'success' as const
	if (status === 'in_transit' || status === 'pending' || status === 'draft') {
		return 'warning' as const
	}
	return 'neutral' as const
}

function whatsappHref(phone: string): string {
	const digits = phone.replace(/[^0-9]/g, '')
	return `https://wa.me/${digits}`
}

export function CustomerProfilePanel({
	conversation,
	isOpen,
	onClose,
}: CustomerProfilePanelProps) {
	const { t, i18n } = useTranslation('customer-service')
	const openOrderStatus = useOrderStatusStore((state) => state.open)
	const linkedOrders = conversation?.linkedOrders ?? []
	const customerOrders = useMemo(
		() =>
			[...linkedOrders].sort(
				(a, b) =>
					new Date(b.lastActivityAt).getTime() -
					new Date(a.lastActivityAt).getTime(),
			),
		[linkedOrders],
	)

	if (!conversation) return null

	const customer = conversation.customer
	const name = i18n.language === 'ar' ? customer.nameAr : customer.name
	const company = i18n.language === 'ar' ? customer.companyAr : customer.company

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={440}
			panelKey="customer-profile"
			ariaLabel={`${name} — ${t('profile.title')}`}
			scope="customer-service"
			mobileTitle={name}
			mobileSubtitle={company}
		>
			<div className="flex h-full min-h-0 flex-col">
				<header className="hidden shrink-0 border-b border-black/[0.06] px-4 py-4 dark:border-white/[0.08] sm:px-6 lg:block lg:px-7">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
								Customer file
							</p>
							<h3 className="mt-2 break-words font-[family-name:var(--font-bricolage)] text-[28px] font-semibold leading-[1.05] text-[var(--color-text)]">
								{name}
							</h3>
							{company && (
								<p className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text-muted)]">
									{company}
								</p>
							)}
						</div>
						<EmployeeActionButton
							onClick={onClose}
							aria-label={t('profile.close')}
							tone="neutral"
							size="sm"
							leading={<X size={14} strokeWidth={2.2} />}
						>
							Close
						</EmployeeActionButton>
					</div>

					<div className="mt-4 flex flex-wrap gap-2">
						<EmployeeStatusPill tone="neutral">
							Customer since {formatRelativeDate(customer.firstContactAt)}
						</EmployeeStatusPill>
						<EmployeeStatusPill tone="neutral">
							{customer.totalConversations} conversations
						</EmployeeStatusPill>
						{conversation.ticketId && (
							<EmployeeStatusPill tone="warning">
								{conversation.ticketId}
							</EmployeeStatusPill>
						)}
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-7 lg:py-5">
					<CustomerActions customer={customer} />

					<section className="mt-6">
						<SectionHeader
							label="Current issue"
							trailing={conversation.status.replace('_', ' ')}
						/>
						<div className="rounded-md border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.1] dark:bg-white/[0.03]">
							<p className="break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold leading-snug text-[var(--color-text)]">
								{conversation.subject}
							</p>
							<p className="mt-2 break-words font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
								{conversation.lastMessagePreview}
							</p>
						</div>
					</section>

					<section className="mt-7">
						<SectionHeader
							label="Customer orders"
							trailing={`${customerOrders.length}`}
						/>
						{customerOrders.length > 0 ? (
							<ul className="space-y-3">
								{customerOrders.map((order) => (
									<LinkedOrderRow
										key={order.id}
										order={order}
										onOpenReport={(rfqId) => openOrderStatus(rfqId)}
									/>
								))}
							</ul>
						) : (
							<div className="rounded-md border border-dashed border-black/[0.12] bg-black/[0.015] p-3 dark:border-white/[0.14] dark:bg-white/[0.025]">
								<p className="font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
									No orders found for this customer.
								</p>
							</div>
						)}
					</section>

					{conversation.linkedQuotes.length > 0 && (
						<section className="mt-7">
							<SectionHeader
								label="Linked quotes"
								trailing={`${conversation.linkedQuotes.length}`}
							/>
							<ul className="space-y-3">
								{conversation.linkedQuotes.map((quote) => (
									<LinkedQuoteRow key={quote.id} quote={quote} />
								))}
							</ul>
						</section>
					)}
				</div>
			</div>
		</SlidePanel>
	)
}

function CustomerActions({ customer }: { customer: Customer }) {
	const [resetMessage, setResetMessage] = useState<string | null>(null)
	const resetMutation = useMutation({
		mutationFn: (channel: 'email' | 'sms') =>
			sendCustomerPasswordReset({
				data: {
					channel,
					customerId: customer.id,
				},
			}),
		onError: (error) => {
			setResetMessage(
				error instanceof Error
					? resetErrorMessage(error.message)
					: 'Password reset could not be sent.',
			)
		},
		onMutate: () => setResetMessage(null),
		onSuccess: (result) => {
			setResetMessage(
				result.channel === 'email'
					? `Password reset email sent to ${result.destination}.`
					: `Password reset SMS sent to ${result.destination}.`,
			)
		},
	})
	const resetDisabled =
		customer.recordType !== 'customer' || resetMutation.isPending
	return (
		<section className="space-y-4">
			<div className="hidden lg:block">
				<SectionHeader label="Contact" />
			</div>
			<div className="grid grid-cols-3 gap-2 lg:hidden">
				{customer.email && (
					<ContactIconLink
						href={`mailto:${customer.email}`}
						label="Email customer"
						icon={<Mail size={16} strokeWidth={2.2} />}
					/>
				)}
				{customer.phone && (
					<ContactIconLink
						href={`tel:${customer.phone.replace(/\s/g, '')}`}
						label="Call customer"
						icon={<Phone size={16} strokeWidth={2.2} />}
					/>
				)}
				{customer.phone && (
					<ContactIconLink
						href={whatsappHref(customer.phone)}
						label="Open WhatsApp"
						icon={<MessageCircle size={16} strokeWidth={2.2} />}
						external
					/>
				)}
			</div>
			<div className="hidden grid-cols-1 gap-2 sm:grid-cols-2 lg:grid">
				{customer.email && (
					<ContactLink
						href={`mailto:${customer.email}`}
						icon={<Mail size={15} strokeWidth={2.2} />}
						label="Email customer"
						value={customer.email}
					/>
				)}
				{customer.phone && (
					<ContactLink
						href={`tel:${customer.phone.replace(/\s/g, '')}`}
						icon={<Phone size={15} strokeWidth={2.2} />}
						label="Call customer"
						value={customer.phone}
					/>
				)}
				{customer.phone && (
					<ContactLink
						href={whatsappHref(customer.phone)}
						icon={<MessageCircle size={15} strokeWidth={2.2} />}
						label="Open WhatsApp"
						value={customer.phone}
						external
					/>
				)}
			</div>
			<div className="rounded-md border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.1] dark:bg-white/[0.03]">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)]">
							Password reset
						</p>
						<p className="mt-1 font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-muted)]">
							Send a secure portal reset link to the customer.
						</p>
					</div>
					<KeyRound
						aria-hidden="true"
						size={17}
						strokeWidth={2.1}
						className="shrink-0 text-[var(--color-text-subtle)]"
					/>
				</div>
				<div className="mt-3 grid gap-2 sm:grid-cols-2">
					<ResetButton
						disabled={resetDisabled || !customer.email}
						loading={
							resetMutation.isPending && resetMutation.variables === 'email'
						}
						onClick={() => resetMutation.mutate('email')}
					>
						Email reset link
					</ResetButton>
					<ResetButton
						disabled={resetDisabled || !customer.phone || !customer.email}
						loading={
							resetMutation.isPending && resetMutation.variables === 'sms'
						}
						onClick={() => resetMutation.mutate('sms')}
					>
						SMS reset link
					</ResetButton>
				</div>
				{resetMessage && (
					<p className="mt-2 font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-muted)]">
						{resetMessage}
					</p>
				)}
				{customer.recordType !== 'customer' && (
					<p className="mt-2 font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-subtle)]">
						Link this contact to a customer account before sending a reset.
					</p>
				)}
			</div>
		</section>
	)
}

function resetErrorMessage(message: string): string {
	switch (message) {
		case 'customer_email_required_for_password_reset':
			return 'This customer needs an email before a reset link can be created.'
		case 'customer_phone_required_for_sms_reset':
			return 'This customer needs a phone number before SMS reset can be sent.'
		case 'twilio_sms_not_configured':
		case 'twilio_sms_sender_not_configured':
			return 'SMS reset is not configured yet. Use email reset for this customer.'
		default:
			return 'Password reset could not be sent.'
	}
}

function ResetButton({
	children,
	disabled,
	loading,
	onClick,
}: {
	children: ReactNode
	disabled: boolean
	loading: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)] outline-none transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.12]"
		>
			{loading ? (
				<Loader2
					aria-hidden="true"
					size={14}
					strokeWidth={2.2}
					className="animate-spin"
				/>
			) : (
				<KeyRound aria-hidden="true" size={14} strokeWidth={2.2} />
			)}
			<span>{children}</span>
		</button>
	)
}

function ContactIconLink({
	href,
	icon,
	label,
	external,
}: {
	href: string
	icon: ReactNode
	label: string
	external?: boolean
}) {
	return (
		<a
			href={href}
			target={external ? '_blank' : undefined}
			rel={external ? 'noopener noreferrer' : undefined}
			aria-label={label}
			className="flex h-10 min-w-0 items-center justify-center rounded-md border border-black/[0.08] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:border-white/[0.1]"
		>
			{icon}
		</a>
	)
}

function ContactLink({
	href,
	icon,
	label,
	value,
	external,
}: {
	href: string
	icon: ReactNode
	label: string
	value: string
	external?: boolean
}) {
	return (
		<a
			href={href}
			target={external ? '_blank' : undefined}
			rel={external ? 'noopener noreferrer' : undefined}
			className="flex min-h-20 min-w-0 flex-col justify-between rounded-md border border-black/[0.1] bg-[var(--color-surface)] p-3 text-[var(--color-text)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.05] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:border-white/[0.12]"
		>
			<span className="flex items-center gap-2 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
				{icon}
				{label}
				{external && <ExternalLink size={12} strokeWidth={2.1} />}
			</span>
			<span className="mt-3 min-w-0 break-all font-[family-name:var(--font-archivo)] text-[13px] font-semibold leading-snug">
				{value}
			</span>
		</a>
	)
}

function LinkedOrderRow({
	order,
	onOpenReport,
}: {
	order: LinkedOrder
	onOpenReport: (rfqId: string) => void
}) {
	const openReport = () => {
		if (order.rfqId) onOpenReport(order.rfqId)
	}
	return (
		<li>
			<button
				type="button"
				disabled={!order.rfqId}
				onClick={openReport}
				className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-black/[0.08] bg-[var(--color-surface)] p-3 text-start outline-none transition-colors hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.045] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.1]"
			>
				<span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.055] px-2 font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold text-[var(--color-primary)]">
					L{order.level}
				</span>
				<span className="min-w-0">
					<span className="flex min-w-0 flex-wrap items-center gap-2">
						<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
							{order.displayId}
						</span>
						<EmployeeStatusPill
							tone={statusTone(order.orderStatus ?? order.status)}
							className="px-2 py-1 text-[10.5px]"
						>
							{(order.orderStatus ?? order.status).replace('_', ' ')}
						</EmployeeStatusPill>
					</span>
					<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
						{order.levelLabel}
					</span>
					<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[12px] italic text-[var(--color-text-muted)]">
						{order.summary}
					</span>
					{order.deliveryLocationName && (
						<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[11px] text-[var(--color-text-subtle)]">
							{order.deliveryLocationName}
						</span>
					)}
					<span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
						<span>
							{order.totalAmount > 0
								? formatCurrency(order.totalAmount, order.currency)
								: 'No total recorded'}
						</span>
						<span>{order.itemCount} lines</span>
						{order.paymentCount > 0 && (
							<span>{order.paymentCount} payments</span>
						)}
						<span>{formatDateTime(order.lastActivityAt)}</span>
					</span>
				</span>
			</button>
		</li>
	)
}

function LinkedQuoteRow({ quote }: { quote: LinkedQuote }) {
	return (
		<li className="rounded-md border border-black/[0.08] bg-[var(--color-surface)] p-3 dark:border-white/[0.1]">
			<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
							{quote.displayId}
						</span>
						<EmployeeStatusPill
							tone={statusTone(quote.status)}
							className="px-2 py-1 text-[10.5px]"
						>
							{quote.status}
						</EmployeeStatusPill>
					</div>
					<p className="mt-1 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text-subtle)]">
						Created {formatRelativeDate(quote.createdAt)}
					</p>
				</div>
				<span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
					{formatCurrency(quote.totalAmount, quote.currency)}
				</span>
			</div>
		</li>
	)
}

function SectionHeader({
	label,
	trailing,
}: {
	label: string
	trailing?: string
}) {
	return (
		<div className="mb-2 flex min-w-0 items-center justify-between gap-3">
			<span className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
				{label}
			</span>
			{trailing && (
				<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
					{trailing}
				</span>
			)}
		</div>
	)
}
