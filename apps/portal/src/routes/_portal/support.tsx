/**
 * Support — premium bento grid.
 * Section 1: 4 tall service cards with icon showcase + text below
 * Section 2: Wide resource cards for address, docs, FAQ
 */
import { createFileRoute } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
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
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { portalHead } from '../../lib/page-meta'

export const Route = createFileRoute('/_portal/support')({
	head: () =>
		portalHead({
			title: 'Support — HyperQuote Portal',
			description:
				'Private HyperQuote support hub for email, WhatsApp, phone, help resources, FAQs, and account help.',
			path: '/support',
		}),
	component: SupportPage,
})

const SUPPORT_EMAIL =
	import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@hyperquote.net'
const SUPPORT_WHATSAPP_E164 = import.meta.env.VITE_SUPPORT_WHATSAPP_E164 ?? ''
const SUPPORT_PHONE_E164 = import.meta.env.VITE_SUPPORT_PHONE_E164 ?? ''
type SupportCard = {
	icon: typeof Mail
	labelKey: ParseKeys<'portal'>
	descKey: ParseKeys<'portal'>
	href?: string
}

function SupportPage() {
	const { t } = useTranslation('portal')
	const serviceCardOptions: Array<SupportCard | null> = [
		{
			icon: Mail,
			labelKey: 'support.contactUs' as const,
			descKey: 'support.contactDesc' as const,
			href: `mailto:${SUPPORT_EMAIL}`,
		},
		SUPPORT_WHATSAPP_E164
			? {
					icon: MessageCircle,
					labelKey: 'support.liveChat' as const,
					descKey: 'support.liveChatDesc' as const,
					href: `https://wa.me/${SUPPORT_WHATSAPP_E164.replace('+', '')}`,
				}
			: null,
		{
			icon: TicketPlus,
			labelKey: 'support.submitTicket' as const,
			descKey: 'support.ticketDesc' as const,
		},
		SUPPORT_PHONE_E164
			? {
					icon: Phone,
					labelKey: 'support.directCall' as const,
					descKey: 'support.callDesc' as const,
					href: `tel:${SUPPORT_PHONE_E164}`,
				}
			: null,
	]
	const serviceCards = serviceCardOptions.filter((card): card is SupportCard =>
		Boolean(card),
	)

	return (
		<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
			<div className="mx-auto w-full max-w-[960px] px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-8">
				<PortalTitleRow
					title={t('support.pageTitle')}
					fixed
					className="-mx-4 mb-6 px-4 sm:-mx-6 sm:mb-8 sm:px-6 lg:-mx-8 lg:px-8"
				/>

				{/* Service Grid */}
				<div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
					{serviceCards.map((card) => (
						<ServiceCard
							key={card.labelKey}
							icon={card.icon}
							labelKey={card.labelKey}
							descKey={card.descKey}
							href={card.href}
						/>
					))}
				</div>

				{/* Resources — wide cards */}
				<div className="mb-10">
					<h2 className="mb-3 break-words text-[12px] uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
						{t('support.resources')}
					</h2>

					{/* Two-column row for docs + faq */}
					<div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
						<ResourceCard
							icon={FileText}
							labelKey="support.docs"
							descKey="support.docsDesc"
							href="https://www.hyperquote.net/docs"
						/>
						<ResourceCard
							icon={HelpCircle}
							labelKey="support.faq"
							descKey="support.faqDesc"
							href="https://www.hyperquote.net/support#faq"
						/>
					</div>

					{/* Full-width address card */}
					<a
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
						<div className="min-w-0 flex-1">
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
					</a>
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Service Card
// ============================================================================

function ServiceCard({
	icon: Icon,
	labelKey,
	descKey,
	href,
}: {
	icon: typeof Mail
	labelKey: ParseKeys<'portal'>
	descKey: ParseKeys<'portal'>
	href?: string
}) {
	const { t } = useTranslation('portal')

	const content = (
		<>
			{/* Icon */}
			<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-elevated)]">
				<Icon
					size={19}
					strokeWidth={1}
					className="text-[var(--p-text-secondary)] transition-all duration-500 ease-out group-hover:scale-105 group-hover:text-[var(--p-text)]"
				/>
			</div>

			{/* Text */}
			<div className="min-w-0 flex-1">
				<h3 className="break-words text-[14px] font-medium text-[var(--p-text)]">
					{t(labelKey)}
				</h3>
				<p className="mt-0.5 break-words text-[13px] leading-5 text-[var(--p-text-muted)]">
					{t(descKey)}
				</p>
			</div>
		</>
	)

	const className =
		'group relative flex min-h-20 items-start gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 transition-all duration-500 ease-out hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--p-accent)] sm:min-h-24'

	if (href) {
		return (
			<a
				href={href}
				target={href.startsWith('http') ? '_blank' : undefined}
				rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
				className={className}
			>
				{content}
			</a>
		)
	}

	return (
		<button type="button" className={`${className} text-start`}>
			{content}
		</button>
	)
}

// ============================================================================
// Resource Card
// ============================================================================

function ResourceCard({
	icon: Icon,
	labelKey,
	descKey,
	href,
}: {
	icon: typeof FileText
	labelKey: ParseKeys<'portal'>
	descKey: ParseKeys<'portal'>
	href: string
}) {
	const { t } = useTranslation('portal')

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex min-h-20 items-start gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 transition-all hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] sm:items-center"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-elevated)]">
				<Icon
					size={16}
					strokeWidth={1.5}
					className="text-[var(--p-text-muted)]"
				/>
			</div>
			<div className="min-w-0 flex-1">
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
		</a>
	)
}
