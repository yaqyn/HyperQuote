/**
 * ActionButton -- Inline action button in AI chat responses.
 *
 * Compact inline button for portal routes, chat events, and external links.
 * Shows localized label based on current language.
 */

import { useNavigate } from '@tanstack/react-router'
import {
	BookOpen,
	Command,
	ExternalLink,
	HelpCircle,
	Mail,
	MessageCircle,
	PackageSearch,
	Phone,
	ReceiptText,
	Route,
	ShoppingCart,
	SquarePen,
	UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Dialog, Heading } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'
import {
	type ActionButtonData,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	PORTAL_CHAT_RUN_COMMAND_EVENT,
} from '../../lib/chat-types'
import { usePortalStore } from '../../stores/portal'

interface ActionButtonProps {
	data: ActionButtonData
}

const ACTION_ICONS = {
	book: BookOpen,
	cart: ShoppingCart,
	command: Command,
	draft: SquarePen,
	external: ExternalLink,
	help: HelpCircle,
	mail: Mail,
	market: PackageSearch,
	orders: ReceiptText,
	phone: Phone,
	profile: UserRound,
	support: MessageCircle,
	track: Route,
} satisfies Record<NonNullable<ActionButtonData['icon']>, typeof BookOpen>

export function ActionButton({ data }: ActionButtonProps) {
	const { i18n } = useTranslation()
	const navigate = useNavigate()
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [unavailableOpen, setUnavailableOpen] = useState(false)
	const isArabic = i18n.language === 'ar'
	const label = isArabic ? data.labelAr : data.label
	const confirmMessage = isArabic
		? (data.confirmMessageAr ?? data.confirmMessage)
		: data.confirmMessage
	const unavailableMessage = isArabic
		? (data.unavailableMessageAr ?? data.unavailableMessage)
		: data.unavailableMessage
	const unavailableTitle = isArabic
		? (data.unavailableTitleAr ?? data.unavailableTitle)
		: data.unavailableTitle
	const unavailableActionLabel = isArabic
		? (data.unavailableActionLabelAr ?? data.unavailableActionLabel)
		: data.unavailableActionLabel
	const Icon = data.icon ? ACTION_ICONS[data.icon] : undefined
	const className =
		'inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:min-h-8'
	const unavailableActionExternal =
		data.unavailableActionHref?.startsWith('http')

	if (data.href && !unavailableMessage) {
		return (
			<a
				href={data.href}
				target={data.href.startsWith('http') ? '_blank' : undefined}
				rel={data.href.startsWith('http') ? 'noopener noreferrer' : undefined}
				className={className}
			>
				{Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
				<span className="truncate">{label}</span>
			</a>
		)
	}

	const runAction = () => {
		if (data.command) {
			window.dispatchEvent(
				new CustomEvent(PORTAL_CHAT_RUN_COMMAND_EVENT, {
					detail: { command: data.command, run: data.runCommand === true },
				}),
			)
			return
		}
		if (data.event === 'open_draft_panel') {
			window.dispatchEvent(
				new CustomEvent(PORTAL_CHAT_OPEN_DRAFT_EVENT, {
					detail: { draftId: data.params?.draftId },
				}),
			)
			return
		}
		if (data.event === 'open_cart') {
			usePortalStore.getState().setDraftQuoteOpen(true)
			return
		}
		if (data.route) {
			navigate({ to: data.route, search: data.params ?? {} })
		}
	}

	const handlePress = () => {
		if (unavailableMessage) {
			setUnavailableOpen(true)
			return
		}
		if (data.command && data.runCommand && confirmMessage) {
			setConfirmOpen(true)
			return
		}
		runAction()
	}

	const handleConfirm = () => {
		setConfirmOpen(false)
		runAction()
	}

	return (
		<>
			<Button
				onPress={handlePress}
				data-unavailable={unavailableMessage ? true : undefined}
				className={`${className} ${unavailableMessage ? 'opacity-60' : ''}`}
			>
				{Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
				<span className="truncate">{label}</span>
			</Button>
			{unavailableMessage ? (
				<ModalOverlay
					isDismissable
					isOpen={unavailableOpen}
					onOpenChange={setUnavailableOpen}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
				>
					<Modal className="w-full max-w-sm rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] shadow-2xl">
						<Dialog className="outline-none">
							<div className="border-b border-[var(--p-rule)] px-5 py-4">
								<Heading
									slot="title"
									className="text-[14px] font-semibold text-[var(--p-text)]"
								>
									{unavailableTitle ??
										(isArabic ? 'الإجراء غير متاح' : 'Action unavailable')}
								</Heading>
							</div>
							<div className="px-5 py-4">
								<p className="text-[13px] leading-6 text-[var(--p-text-muted)]">
									{unavailableMessage}
								</p>
							</div>
							<div className="flex flex-wrap justify-end gap-2 border-t border-[var(--p-rule)] px-5 py-3">
								<Button
									onPress={() => setUnavailableOpen(false)}
									className="min-h-9 rounded-lg px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
								>
									{isArabic ? 'حسناً' : 'OK'}
								</Button>
								{data.unavailableActionHref && unavailableActionLabel ? (
									<a
										href={data.unavailableActionHref}
										target={unavailableActionExternal ? '_blank' : undefined}
										rel={
											unavailableActionExternal
												? 'noopener noreferrer'
												: undefined
										}
										className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
										onClick={() => setUnavailableOpen(false)}
									>
										{unavailableActionLabel}
									</a>
								) : null}
							</div>
						</Dialog>
					</Modal>
				</ModalOverlay>
			) : null}
			{confirmMessage ? (
				<ModalOverlay
					isDismissable
					isOpen={confirmOpen}
					onOpenChange={setConfirmOpen}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
				>
					<Modal className="w-full max-w-sm rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] shadow-2xl">
						<Dialog className="outline-none">
							<div className="border-b border-[var(--p-rule)] px-5 py-4">
								<Heading
									slot="title"
									className="text-[14px] font-semibold text-[var(--p-text)]"
								>
									{isArabic ? 'تأكيد الإجراء' : 'Confirm action'}
								</Heading>
							</div>
							<div className="px-5 py-4">
								<p className="text-[13px] leading-6 text-[var(--p-text-muted)]">
									{confirmMessage}
								</p>
							</div>
							<div className="flex justify-end gap-2 border-t border-[var(--p-rule)] px-5 py-3">
								<Button
									onPress={() => setConfirmOpen(false)}
									className="min-h-9 rounded-lg px-3 text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)]"
								>
									{isArabic ? 'إلغاء' : 'Cancel'}
								</Button>
								<Button
									onPress={handleConfirm}
									className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
								>
									{Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
									<span>{label}</span>
								</Button>
							</div>
						</Dialog>
					</Modal>
				</ModalOverlay>
			) : null}
		</>
	)
}
