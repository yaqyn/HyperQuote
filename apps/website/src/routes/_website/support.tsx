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
import { SectionNumber } from '../../components/shared/SectionNumber'
import { ContactForm } from '../../components/support/ContactForm'
import { ContactInfo } from '../../components/support/ContactInfo'
import { FAQ_DATA, FAQAccordion } from '../../components/support/FAQAccordion'
import { useChatWidget } from '../../hooks/useChatWidget'

export const Route = createFileRoute('/_website/support')({
	head: () => ({
		meta: [
			{ title: 'Support \u2014 HyperQuote' },
			{
				name: 'description',
				content:
					'Get help with HyperQuote. Contact us via WhatsApp, email, or phone. Browse frequently asked questions.',
			},
			{ property: 'og:title', content: 'Support \u2014 HyperQuote' },
			{
				property: 'og:description',
				content:
					'Get help with HyperQuote. Contact us via WhatsApp, email, or phone.',
			},
		],
	}),
	component: SupportPage,
})

function SupportPage() {
	const { t, i18n } = useTranslation('website')
	const isArabic = i18n.language === 'ar'
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
				className="flex min-h-[56svh] items-center justify-center px-4 pb-12 pt-28 sm:min-h-[52svh] sm:px-6 md:px-8 lg:min-h-[64vh] lg:px-12"
			>
				<div className="mx-auto max-w-[1200px] text-center">
					<h1 className="text-[clamp(2.4rem,11vw,4.5rem)] font-extrabold leading-[1] tracking-normal md:text-[clamp(3rem,6vw,4.5rem)]">
						{t('support.heading')}
					</h1>
					<p className="mx-auto mt-5 max-w-[400px] text-[15px] leading-[1.7] text-[var(--color-text-muted)]">
						{t('support.responseTime')}
					</p>
					<p className="mx-auto mt-2 max-w-[320px] font-[family-name:var(--font-mono)] text-[11px] leading-relaxed tracking-normal text-[var(--color-text-subtle)] sm:max-w-none sm:text-[12px]">
						{isArabic
							? '\u0627\u0644\u0623\u062D\u062F \u2013 \u0627\u0644\u062E\u0645\u064A\u0633 \u060C \u0668:\u0660\u0660 \u0635 \u2013 \u0666:\u0660\u0660 \u0645 \u0628\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0642\u0627\u0647\u0631\u0629'
							: 'Sun\u2013Thu, 8:00 AM \u2013 6:00 PM Cairo time'}
					</p>

					{/* Search */}
					<div className="mt-10 flex justify-center">
						<SearchDropdown
							items={faqItems}
							placeholder={t('support.searchPlaceholder', {
								defaultValue: 'Search for help...',
							})}
							askLyonLabel={t('support.askAI', { defaultValue: 'Ask Lyon' })}
							onSelect={handleSelect}
							onAskLyon={handleAskLyon}
							className="w-full max-w-[480px] [&_input]:placeholder:opacity-50 [&_svg]:opacity-40"
							idPrefix="support-search"
						/>
					</div>
				</div>
			</motion.section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Contact */}
			<motion.section
				id="contact"
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-24"
			>
				<div className="mx-auto max-w-[1200px]">
					<div
						id="support-contact-heading"
						ref={contactHeadingRef}
						className="mb-10 scroll-mt-24 text-center md:mb-12 lg:mb-14 lg:text-start"
					>
						<SectionNumber n={1} />
						<h2 className="mt-3 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-normal">
							{t('support.sectionContact')}
						</h2>
					</div>

					<div className="grid grid-cols-1 items-start justify-items-center gap-12 lg:grid-cols-[1fr_1fr] lg:justify-items-stretch lg:gap-24">
						<ContactForm onSubmitted={handleContactSubmitted} />
						<div className="h-px bg-[var(--color-text)] opacity-[0.07] lg:hidden" />
						<ContactInfo />
					</div>
				</div>
			</motion.section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* FAQ */}
			<motion.section
				id="faq"
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-24"
			>
				<div className="mx-auto max-w-[1200px]">
					<div className="mb-10 text-center md:mb-12 lg:mb-14 lg:text-start">
						<SectionNumber n={2} />
						<h2 className="mt-3 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-normal">
							{t('support.faq.heading')}
						</h2>
					</div>
					<div className="mx-auto max-w-[760px] lg:max-w-none">
						<FAQAccordion expandId={expandFaqId} />
					</div>

					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mt-16 border-t border-[var(--color-text)]/[0.07] pt-10 text-center"
					>
						<p className="text-[15px] opacity-40">
							{isArabic
								? '\u0644\u0633\u0647 \u0645\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629\u061F'
								: 'Still need help?'}
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
