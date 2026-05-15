/**
 * Support — premium bento grid.
 * Section 1: 4 tall service cards with icon showcase + text below
 * Section 2: Wide resource cards for address, docs, FAQ
 */
import { createFileRoute } from '@tanstack/react-router'
import {
	ExternalLink,
	FileText,
	HelpCircle,
	Mail,
	MapPin,
	MessageCircle,
	Phone,
	TicketPlus,
} from 'lucide-react'
import { cubicBezier, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'

export const Route = createFileRoute('/_portal/support')({
	component: SupportPage,
})

const smoothEase = cubicBezier(0.22, 1, 0.36, 1)

const stagger = (i: number) => ({
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	transition: {
		duration: 0.35,
		delay: 0.05 + i * 0.06,
		ease: smoothEase,
	},
})

function SupportPage() {
	const { t } = useTranslation('portal')

	return (
		<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
			<div className="w-full max-w-[960px] mx-auto px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-8">
				<PortalTitleRow
					title={t('support.pageTitle')}
					fixed
					className="-mx-4 mb-8 px-4 sm:-mx-6 sm:mb-10 sm:px-6 lg:-mx-8 lg:px-8"
				/>

				{/* Service Grid — 4 tall cards */}
				<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
					<ServiceCard
						index={0}
						icon={Mail}
						labelKey="support.contactUs"
						descKey="support.contactDesc"
						href="mailto:support@hyperquote.net"
					/>
					<ServiceCard
						index={1}
						icon={MessageCircle}
						labelKey="support.liveChat"
						descKey="support.liveChatDesc"
						href="https://wa.me/201000000000"
					/>
					<ServiceCard
						index={2}
						icon={TicketPlus}
						labelKey="support.submitTicket"
						descKey="support.ticketDesc"
					/>
					<ServiceCard
						index={3}
						icon={Phone}
						labelKey="support.directCall"
						descKey="support.callDesc"
						href="tel:+201000000000"
					/>
				</div>

				{/* Resources — wide cards */}
				<motion.div {...stagger(5)} className="mb-10">
					<h2 className="mb-4 break-words text-[13px] uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
						{t('support.resources')}
					</h2>

					{/* Two-column row for docs + faq */}
					<div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
						<ResourceCard
							index={6}
							icon={FileText}
							labelKey="support.docs"
							descKey="support.docsDesc"
							href="https://www.hyperquote.net/docs"
						/>
						<ResourceCard
							index={7}
							icon={HelpCircle}
							labelKey="support.faq"
							descKey="support.faqDesc"
							href="https://www.hyperquote.net/support#faq"
						/>
					</div>

					{/* Full-width address card */}
					<motion.a
						{...stagger(8)}
						href="https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt"
						target="_blank"
						rel="noopener noreferrer"
						className="group flex min-h-20 items-start gap-4 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 transition-all hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] sm:items-center sm:gap-5 sm:p-5"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-elevated)] sm:h-12 sm:w-12">
							<MapPin
								size={20}
								strokeWidth={1.5}
								className="text-[var(--p-text-muted)]"
							/>
						</div>
						<div className="flex-1 min-w-0">
							<p className="break-words text-sm font-medium text-[var(--p-text)]">
								{t('support.address')}
							</p>
							<p className="mt-0.5 break-words text-[13px] text-[var(--p-text-muted)]">
								{t('support.addressValue')}
							</p>
						</div>
						<ExternalLink
							size={14}
							strokeWidth={1.5}
							className="shrink-0 text-[var(--p-text-muted)] opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
						/>
					</motion.a>
				</motion.div>
			</div>
		</div>
	)
}

// ============================================================================
// Service Card — tall with icon showcase
// ============================================================================

function ServiceCard({
	index,
	icon: Icon,
	labelKey,
	descKey,
	href,
}: {
	index: number
	icon: typeof Mail
	labelKey: string
	descKey: string
	href?: string
}) {
	const { t } = useTranslation('portal')

	const content = (
		<>
			{/* Top glow */}
			<div
				className="absolute inset-x-0 top-0 h-px rounded-t-xl"
				style={{
					background:
						'linear-gradient(90deg, transparent 10%, var(--p-card-top-glow) 50%, transparent 90%)',
				}}
			/>

			{/* Icon */}
			<div className="mb-3 flex h-16 items-center justify-center sm:mb-4 sm:h-24 lg:h-28">
				<Icon
					size={32}
					strokeWidth={1}
					className="text-[var(--p-text-secondary)] transition-all duration-500 ease-out group-hover:scale-110 group-hover:text-[var(--p-text)] sm:size-[38px]"
				/>
			</div>

			{/* Text */}
			<h3 className="mb-1.5 break-words text-[14px] font-medium text-[var(--p-text)]">
				{t(labelKey)}
			</h3>
			<p className="break-words text-[13px] leading-relaxed text-[var(--p-text-muted)]">
				{t(descKey)}
			</p>
		</>
	)

	const className =
		'group relative flex min-h-[168px] flex-col rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 transition-all duration-500 ease-out hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--p-accent)] sm:min-h-[212px] sm:p-5 sm:pb-6'

	if (href) {
		return (
			<motion.a
				{...stagger(1 + index)}
				href={href}
				target={href.startsWith('http') ? '_blank' : undefined}
				rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
				className={className}
			>
				{content}
			</motion.a>
		)
	}

	return (
		<motion.button
			{...stagger(1 + index)}
			type="button"
			className={`${className} text-start`}
		>
			{content}
		</motion.button>
	)
}

// ============================================================================
// Resource Card
// ============================================================================

function ResourceCard({
	index,
	icon: Icon,
	labelKey,
	descKey,
	href,
}: {
	index: number
	icon: typeof FileText
	labelKey: string
	descKey: string
	href: string
}) {
	const { t } = useTranslation('portal')

	return (
		<motion.a
			{...stagger(index)}
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex min-h-20 items-start gap-4 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 transition-all hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] sm:items-center sm:p-5"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-elevated)]">
				<Icon
					size={16}
					strokeWidth={1.5}
					className="text-[var(--p-text-muted)]"
				/>
			</div>
			<div className="flex-1 min-w-0">
				<p className="break-words text-sm font-medium text-[var(--p-text)]">
					{t(labelKey)}
				</p>
				<p className="mt-0.5 break-words text-[13px] text-[var(--p-text-muted)]">
					{t(descKey)}
				</p>
			</div>
			<ExternalLink
				size={14}
				strokeWidth={1.5}
				className="shrink-0 text-[var(--p-text-muted)] opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
			/>
		</motion.a>
	)
}
