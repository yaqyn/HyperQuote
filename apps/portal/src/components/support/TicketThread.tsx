/**
 * TicketThread — conversation as text, not bubbles.
 * Same "data is the design" as the AI chat:
 * Customer: right-aligned, medium weight.
 * Support: left-aligned, muted.
 * Timestamps on hover.
 */

import { ArrowLeft, ArrowUp } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Ticket, TicketReply } from '../../types/support'

interface TicketThreadProps {
	ticket: Ticket
	replies: TicketReply[]
	onReply: (message: string) => void
	onBack: () => void
	isReplying?: boolean
}

export function TicketThread({
	ticket,
	replies,
	onReply,
	onBack,
	isReplying,
}: TicketThreadProps) {
	const { t, i18n } = useTranslation('portal')
	const [replyText, setReplyText] = useState('')
	const isArabic = i18n.language === 'ar'

	function handleSubmitReply() {
		if (!replyText.trim()) return
		onReply(replyText.trim())
		setReplyText('')
	}

	const isClosedOrResolved =
		ticket.status === 'closed' || ticket.status === 'resolved'

	return (
		<div className="flex min-w-0 flex-col">
			{/* Back + subject */}
			<div className="mb-8 flex items-start gap-3 sm:mb-10 sm:items-baseline sm:gap-4">
				<button
					type="button"
					onClick={onBack}
					className="flex min-h-10 shrink-0 items-center text-[13px] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text-muted)] sm:min-h-0"
					aria-label={t('support.backToTickets')}
				>
					<ArrowLeft size={14} strokeWidth={1.5} className="rtl:rotate-180" />
				</button>
				<div className="min-w-0">
					<h2 className="break-words text-sm font-normal text-[var(--color-text)]">
						{ticket.subject}
					</h2>
					<span className="break-words text-[13px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
						{ticket.status.replace('_', ' ').toUpperCase()}
					</span>
				</div>
			</div>

			{/* Messages — same style as AI chat */}
			<div className="flex flex-col gap-6 mb-10">
				{replies.map((reply) => {
					const isCustomer = reply.sender === 'customer'
					const time = new Date(reply.createdAt).toLocaleTimeString(
						isArabic ? 'ar-EG' : 'en-US',
						{ hour: '2-digit', minute: '2-digit' },
					)

					return (
						<motion.div
							key={reply.id}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ type: 'spring', stiffness: 260, damping: 24 }}
							className={`group flex max-w-full flex-col ${
								isCustomer
									? 'items-end self-end sm:max-w-[75%]'
									: 'items-start self-start sm:max-w-[80%]'
							}`}
						>
							<p
								className={[
									'break-words text-[14px] leading-[1.65] whitespace-pre-wrap',
									isCustomer
										? 'text-[var(--color-text)] font-medium'
										: 'text-[var(--color-text-muted)]',
								].join(' ')}
							>
								{reply.message}
							</p>

							{/* Attachments */}
							{reply.attachments && reply.attachments.length > 0 && (
								<div className="mt-1 flex flex-wrap gap-2">
									{reply.attachments.map((url, i) => (
										<a
											key={`${reply.id}-${url}`}
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[13px] text-[var(--color-text-subtle)] underline underline-offset-2 hover:text-[var(--color-text-muted)]"
										>
											{t('support.attachment')} {i + 1}
										</a>
									))}
								</div>
							)}

							{/* Time — hover reveal */}
							<span className="mt-1 font-mono text-[13px] text-[var(--color-text-subtle)] opacity-60 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-60">
								{time}
							</span>
						</motion.div>
					)
				})}
			</div>

			{/* Reply input — underline style */}
			{!isClosedOrResolved && (
				<div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-end">
					<textarea
						value={replyText}
						onChange={(e) => setReplyText(e.target.value)}
						placeholder={t('support.replyPlaceholder')}
						rows={2}
						aria-label={t('support.replyLabel')}
						spellCheck={false}
						className="min-h-24 flex-1 resize-none border-0 border-b border-[var(--color-border)] bg-transparent pb-2 text-[16px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-border)] focus:border-[#2563EB] sm:min-h-0 sm:text-sm"
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault()
								handleSubmitReply()
							}
						}}
					/>
					{replyText.trim() && (
						<button
							type="button"
							onClick={handleSubmitReply}
							disabled={isReplying}
							className="mb-0.5 flex h-11 w-full shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] disabled:opacity-30 sm:w-11"
							aria-label={t('support.sendReply')}
						>
							<ArrowUp size={16} strokeWidth={1.5} aria-hidden />
						</button>
					)}
				</div>
			)}
		</div>
	)
}
