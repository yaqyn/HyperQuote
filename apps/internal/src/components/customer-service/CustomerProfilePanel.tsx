import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
	Conversation,
	LinkedOrder,
	LinkedQuote,
} from '../../types/customer-service'
import { ReportViewerModal } from '../shared/ReportViewer'
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

/**
 * The dossier — a switchboard operator's reference card for whoever's
 * on the line. Big Bricolage name at the top, mono grid of particulars,
 * followed by indexed lists of linked orders and quotes. No avatars
 * (they'd feel off-key here); just typography and hairlines.
 */
export function CustomerProfilePanel({
	conversation,
	isOpen,
	onClose,
}: CustomerProfilePanelProps) {
	const { t, i18n } = useTranslation('customer-service')
	const [reportRfqId, setReportRfqId] = useState<string | null>(null)

	if (!conversation) return null

	const customer = conversation.customer
	const name = i18n.language === 'ar' ? customer.nameAr : customer.name
	const company = i18n.language === 'ar' ? customer.companyAr : customer.company

	return (
		<>
			<SlidePanel
				isOpen={isOpen}
				onClose={onClose}
				maxWidth={400}
				panelKey="customer-profile"
				ariaLabel={`${name} — ${t('profile.title')}`}
				scope="customer-service"
			>
				{/* ── Header bar ─────────────────────────────────────
            No inner X — the module's outer close button dismisses this
            panel first via the SlidePanel scope='customer-service'
            overlay-close handler. */}
				<div className="px-8 pt-7 pb-4 shrink-0">
					<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-subtle)]">
						dossier · {t('profile.title').toLowerCase()}
					</span>
				</div>

				{/* ── Scrollable content ─────────────────────────── */}
				<div className="flex-1 overflow-y-auto min-h-0">
					{/* Identity */}
					<div className="px-8 pb-5">
						<h3
							className="font-[family-name:var(--font-bricolage)] text-[32px] leading-[1.05] tracking-[-0.015em] text-[var(--color-text)]"
							style={{ fontVariationSettings: '"opsz" 72, "wght" 520' }}
						>
							{name}
						</h3>
						{company && (
							<p
								className="mt-1.5 font-[family-name:var(--font-literata)] italic text-[14px] text-[var(--color-text-muted)]"
								style={{ fontVariationSettings: '"opsz" 16, "wght" 420' }}
							>
								{company}
							</p>
						)}
						<p className="mt-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)] flex items-center gap-2">
							<span>
								{t('context.customerSince')}{' '}
								{formatRelativeDate(customer.firstContactAt)}
							</span>
							<span aria-hidden className="text-[var(--color-border)]">
								·
							</span>
							<span className="tabular-nums">
								{customer.totalConversations} {t('profile.orders')}
							</span>
						</p>
					</div>

					{/* Particulars grid */}
					<div className="mx-8 border-y border-[var(--color-border)]/60 py-4 space-y-2.5">
						{customer.email && (
							<DetailRow
								label="email"
								value={customer.email}
								href={`mailto:${customer.email}`}
							/>
						)}
						{customer.phone && (
							<DetailRow
								label="phone"
								value={customer.phone}
								href={`tel:${customer.phone.replace(/\s/g, '')}`}
								mono
							/>
						)}
						{customer.phone && (
							<DetailRow
								label="whatsapp"
								value={customer.phone}
								href={`https://wa.me/${customer.phone.replace(/[^0-9+]/g, '')}`}
								mono
								external
							/>
						)}
					</div>

					{/* Linked orders */}
					{conversation.linkedOrders.length > 0 && (
						<section className="px-8 pt-6">
							<SectionHeader label={t('context.orders')} />
							<ul className="divide-y divide-[var(--color-border)]/60">
								{conversation.linkedOrders.map((order: LinkedOrder) => (
									<li key={order.id}>
										<button
											type="button"
											disabled={!order.rfqId}
											onClick={() => order.rfqId && setReportRfqId(order.rfqId)}
											className={`w-full text-start flex items-baseline justify-between gap-3 py-3 transition-colors
                        ${
													order.rfqId
														? 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]'
														: ''
												}`}
										>
											<div className="min-w-0">
												<span className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-medium text-[var(--color-text)] tabular-nums">
													{order.displayId}
												</span>
												<div className="mt-1 flex items-center gap-2">
													<span
														className={`font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] ${
															order.status === 'delivered'
																? 'text-[var(--color-text-muted)]'
																: order.status === 'in_transit'
																	? 'text-[var(--color-primary)]'
																	: 'text-[var(--color-text-subtle)]'
														}`}
													>
														{order.status.replace('_', ' ')}
													</span>
													<span
														aria-hidden
														className="text-[var(--color-border)]"
													>
														·
													</span>
													<span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] tabular-nums text-[var(--color-text-subtle)]">
														{formatRelativeDate(order.createdAt)}
													</span>
												</div>
											</div>
											<span
												className="font-[family-name:var(--font-bricolage)] text-[14.5px] tabular-nums text-[var(--color-text)] shrink-0"
												style={{
													fontVariationSettings: '"opsz" 14, "wght" 500',
												}}
											>
												{formatCurrency(order.totalAmount, order.currency)}
											</span>
										</button>
									</li>
								))}
							</ul>
						</section>
					)}

					{/* Linked quotes */}
					{conversation.linkedQuotes.length > 0 && (
						<section className="px-8 pt-6">
							<SectionHeader label={t('context.quotes')} />
							<ul className="divide-y divide-[var(--color-border)]/60">
								{conversation.linkedQuotes.map((quote: LinkedQuote) => (
									<li
										key={quote.id}
										className="flex items-baseline justify-between gap-3 py-3"
									>
										<div className="min-w-0">
											<span className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-medium text-[var(--color-text)] tabular-nums">
												{quote.displayId}
											</span>
											<div className="mt-1 flex items-center gap-2">
												<span
													className={`font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] ${
														quote.status === 'accepted'
															? 'text-[var(--color-primary)]'
															: 'text-[var(--color-text-subtle)]'
													}`}
												>
													{quote.status}
												</span>
												<span
													aria-hidden
													className="text-[var(--color-border)]"
												>
													·
												</span>
												<span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] tabular-nums text-[var(--color-text-subtle)]">
													{formatRelativeDate(quote.createdAt)}
												</span>
											</div>
										</div>
										<span
											className="font-[family-name:var(--font-bricolage)] text-[14.5px] tabular-nums text-[var(--color-text)] shrink-0"
											style={{ fontVariationSettings: '"opsz" 14, "wght" 500' }}
										>
											{formatCurrency(quote.totalAmount, quote.currency)}
										</span>
									</li>
								))}
							</ul>
						</section>
					)}

					{/* Ticket reference footer */}
					{conversation.ticketId && (
						<div className="mt-8 mx-8 border-t border-[var(--color-border)]/60 py-5 flex items-center justify-between">
							<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								{t('profile.ticketRef')}
							</span>
							<span className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-medium tabular-nums text-[var(--color-text)]">
								{conversation.ticketId}
							</span>
						</div>
					)}
				</div>
			</SlidePanel>
			<ReportViewerModal
				rfqId={reportRfqId}
				onClose={() => setReportRfqId(null)}
			/>
		</>
	)
}

function SectionHeader({ label }: { label: string }) {
	return (
		<div className="mb-2 flex items-baseline gap-3">
			<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
				{label}
			</span>
			<span className="flex-1 h-px bg-[var(--color-border)]/60" />
		</div>
	)
}

function DetailRow({
	label,
	value,
	href,
	mono,
	external,
}: {
	label: string
	value: string
	href?: string
	mono?: boolean
	external?: boolean
}) {
	const valueClass = mono
		? 'font-[family-name:var(--font-jetbrains-mono)] text-[12px] tabular-nums'
		: 'font-[family-name:var(--font-inter)] text-[13px]'
	const inner = (
		<span
			className={`text-[var(--color-text)] ${valueClass} ${
				href ? 'hover:text-[var(--color-primary)] transition-colors' : ''
			}`}
			dir={mono ? 'ltr' : undefined}
		>
			{value}
		</span>
	)
	return (
		<div className="flex items-baseline justify-between gap-4">
			<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)] w-20 shrink-0">
				{label}
			</span>
			{href ? (
				<a
					href={href}
					target={external ? '_blank' : undefined}
					rel={external ? 'noopener noreferrer' : undefined}
					className="truncate"
				>
					{inner}
				</a>
			) : (
				<span className="truncate">{inner}</span>
			)}
		</div>
	)
}
