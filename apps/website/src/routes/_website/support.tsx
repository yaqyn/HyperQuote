import { createFileRoute } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { revealUp, viewportOnce } from '../../components/shared/motionVariants'
import {
	SearchDropdown,
	type SearchEntry,
} from '../../components/shared/SearchDropdown'
import { ContactForm } from '../../components/support/ContactForm'
import { ContactInfo } from '../../components/support/ContactInfo'
import { FAQ_DATA, FAQAccordion } from '../../components/support/FAQAccordion'
import { useChatWidget } from '../../hooks/useChatWidget'
import { websiteHead } from '../../lib/seo'

export const Route = createFileRoute('/_website/support')({
	head: () =>
		websiteHead({
			title: 'Support — HyperQuote',
			description:
				'Get HyperQuote help through email, phone, WhatsApp, FAQs, and Lyon guidance for quotes, deliveries, payments, and account questions.',
			path: '/support',
		}),
	component: SupportPage,
})

function SupportPage() {
	const { t } = useTranslation('website')
	const [expandFaqId, setExpandFaqId] = useState<string | null>(null)
	const contactHeadingRef = useRef<HTMLDivElement | null>(null)
	const openWithMessage = useChatWidget((s) => s.openWithMessage)

	const faqItems: SearchEntry[] = useMemo(
		() =>
			FAQ_DATA.map((faq) => ({
				id: faq.id,
				title: t(faq.questionKey as ParseKeys<'website'>),
				subtitle: t(
					`support.faq.tags.${t(faq.tagKey as ParseKeys<'website'>)}` as ParseKeys<'website'>,
				),
				body: t(faq.answerKey as ParseKeys<'website'>),
			})),
		[t],
	)

	const handleSelect = useCallback((item: SearchEntry) => {
		setExpandFaqId(item.id)
		setTimeout(() => {
			document
				.getElementById(item.id)
				?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}, 100)
	}, [])

	const handleAskLyon = useCallback(
		(q: string) => {
			openWithMessage(q)
		},
		[openWithMessage],
	)

	const handleContactSubmitted = useCallback(() => {
		window.requestAnimationFrame(() => {
			const target = contactHeadingRef.current
			if (!target) return

			const top = Math.max(
				0,
				target.getBoundingClientRect().top + window.scrollY - 96,
			)
			window.scrollTo({ top, behavior: 'smooth' })
		})
	}, [])

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<motion.section
				initial="hidden"
				animate="visible"
				variants={revealUp}
				className="px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-12 lg:pb-16 lg:pt-40"
			>
				<div className="mx-auto grid max-w-[1400px] gap-10 border-t border-[var(--site-rule)] pt-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-end lg:gap-20">
					<div>
						<p className="hq-kicker mb-5 text-[var(--color-primary)]">
							{t('support.sectionMessage')}
						</p>
						<h1 className="hq-display hq-title-hero max-w-[900px] font-bold text-[var(--color-text)]">
							{t('support.heading')}
						</h1>
					</div>
					<div className="border-s border-[var(--site-rule)] ps-5">
						<div className="border-b border-[var(--site-rule)] pb-4">
							<p className="text-[14px] font-semibold text-[var(--color-text)]">
								{t('support.responseTime')}
							</p>
						</div>
						<p className="mt-4 font-mono text-[11px] leading-relaxed text-[var(--color-text-subtle)]">
							{t('support.hoursLine')}
						</p>
						<div className="mt-7">
							<SearchDropdown
								items={faqItems}
								placeholder={t('support.searchPlaceholder', {
									defaultValue: 'Search for help...',
								})}
								askLyonLabel={t('support.askAI', {
									defaultValue: 'Ask Lyon',
								})}
								onSelect={handleSelect}
								onAskLyon={handleAskLyon}
								className="w-full [&_input]:placeholder:opacity-50 [&_svg]:opacity-40"
								idPrefix="support-search"
							/>
						</div>
					</div>
				</div>
			</motion.section>

			{/* Contact */}
			<motion.section
				id="contact"
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="scroll-mt-24 border-t border-[var(--site-rule)] px-4 py-16 sm:px-6 lg:px-12 lg:py-24"
			>
				<div className="mx-auto max-w-[1400px]">
					<div
						id="support-contact-heading"
						ref={contactHeadingRef}
						className="mb-10 scroll-mt-24 border-b border-[var(--site-rule)] pb-6 md:mb-12 lg:mb-14"
					>
						<h2 className="hq-display hq-title-subsection font-bold">
							{t('support.sectionContact')}
						</h2>
					</div>

					<div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.38fr)] lg:gap-24">
						<ContactForm onSubmitted={handleContactSubmitted} />
						<div className="h-px bg-[var(--color-text)] opacity-[0.07] lg:hidden" />
						<ContactInfo />
					</div>
				</div>
			</motion.section>

			{/* FAQ */}
			<motion.section
				id="faq"
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="scroll-mt-24 bg-[var(--site-concrete)] px-4 py-16 sm:px-6 lg:px-12 lg:py-24"
			>
				<div className="mx-auto max-w-[1400px]">
					<div className="mb-10 border-b border-[var(--site-rule)] pb-6 md:mb-12 lg:mb-14">
						<h2 className="hq-display hq-title-subsection font-bold">
							{t('support.faq.heading')}
						</h2>
					</div>
					<div className="mx-auto max-w-[920px] lg:mx-0">
						<FAQAccordion expandId={expandFaqId} />
					</div>

					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mt-16 border-t border-[var(--color-text)]/[0.07] pt-10 text-center"
					>
						<p className="text-[15px] text-[var(--color-text-muted)]">
							{t('support.stillNeedHelp')}
						</p>
						<button
							type="button"
							onClick={() => openWithMessage('')}
							className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)] transition-opacity hover:opacity-70"
						>
							{t('support.askAI', { defaultValue: 'Ask Lyon' })}
						</button>
					</motion.div>
				</div>
			</motion.section>
		</div>
	)
}
