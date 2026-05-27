import { useVisualViewportKeyboard } from '@hyperquote/ui/viewport/keyboard'
import { ArrowLeft, MessageCircle, Radio, Send } from 'lucide-react'
import { type CSSProperties, useMemo } from 'react'
import { Button } from 'react-aria-components/Button'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { TextField } from 'react-aria-components/TextField'
import { useTranslation } from 'react-i18next'
import type {
	DriverLanguage,
	DriverProfile,
	TeamMessage,
} from '../lib/driver-repository'
import { formatClock, localize } from '../lib/format'

export function TeamChatPanel({
	currentDriverId,
	drivers,
	draftMessage,
	focusedDriver,
	language,
	messages,
	onBack,
	onClearFocus,
	onDraftChange,
	onMentionDriver,
	onSendMessage,
	sendMessageError,
	sendMessagePending,
	showHeader = true,
}: {
	currentDriverId: string
	drivers: DriverProfile[]
	draftMessage: string
	focusedDriver: DriverProfile | null
	language: DriverLanguage
	messages: TeamMessage[]
	onBack: () => void
	onClearFocus: () => void
	onDraftChange: (message: string) => void
	onMentionDriver: (driver: DriverProfile) => void
	onSendMessage: () => void
	sendMessageError: string | null
	sendMessagePending: boolean
	showHeader?: boolean
}) {
	const { t } = useTranslation('driver')
	const keyboard = useVisualViewportKeyboard()
	const mentionableDrivers = drivers.filter(
		(driver) => driver.id !== currentDriverId,
	)
	const keyboardFrameStyle = useMemo<CSSProperties | undefined>(() => {
		if (!keyboard.isOpen) return undefined
		return {
			height: `${keyboard.height}px`,
			marginTop: keyboard.offsetTop > 0 ? `${keyboard.offsetTop}px` : undefined,
		}
	}, [keyboard.height, keyboard.isOpen, keyboard.offsetTop])

	return (
		<div
			className={`driver-chat-panel flex min-h-0 flex-col ${
				showHeader ? 'h-[calc(100dvh-8rem)]' : 'h-full'
			}`}
			style={keyboardFrameStyle}
		>
			{showHeader && (
				<section className="driver-chat-header border-b border-[var(--color-border)] p-3 sm:p-4">
					<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
								{focusedDriver ? t('fleet.chatFocus') : t('fleet.chatLive')}
							</p>
							<h3 className="mt-1 truncate font-[family-name:var(--font-archivo)] text-xl font-black">
								{focusedDriver
									? localize(focusedDriver.name, language)
									: t('fleet.chatRoom')}
							</h3>
							<p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
								{focusedDriver
									? localize(focusedDriver.vehicle, language)
									: t('fleet.chatRoomNote')}
							</p>
						</div>
						<div className="driver-chat-vector" aria-hidden="true">
							<Radio size={17} />
							<span />
							<MessageCircle size={17} />
						</div>
					</div>
					{focusedDriver && (
						<div className="mt-3 flex items-center justify-between gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
							<p className="min-w-0 truncate text-xs font-semibold text-[var(--color-text-muted)]">
								{t('fleet.directLane', {
									name: localize(focusedDriver.name, language),
								})}
							</p>
							<Button
								className="driver-secondary-button h-8 shrink-0 border px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
								onPress={onClearFocus}
							>
								{t('fleet.clearFocus')}
							</Button>
						</div>
					)}
					<div className="mt-3 flex items-center gap-2 overflow-x-auto">
						<span className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
							{t('fleet.mentionPeople')}
						</span>
						{mentionableDrivers.map((driver) => (
							<Button
								key={driver.id}
								onPress={() => onMentionDriver(driver)}
								className="driver-secondary-button h-8 shrink-0 border px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
							>
								@{localize(driver.name, language)}
							</Button>
						))}
					</div>
				</section>
			)}

			<div className="driver-chat-stream min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:p-4">
				{messages.map((message) => {
					const isMine = message.authorDriverId === currentDriverId
					return (
						<article
							key={message.id}
							className={`driver-chat-message ${isMine ? 'is-mine' : ''}`}
						>
							<div className="max-w-[min(34rem,84%)] border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
								<div className="flex items-baseline justify-between gap-3">
									<p className="truncate text-xs font-bold">
										{localize(message.authorName, language)}
									</p>
									<time className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[9px] text-[var(--color-text-subtle)]">
										{formatClock(message.createdAt, language)}
									</time>
								</div>
								<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
									{localize(message.body, language)}
								</p>
							</div>
						</article>
					)
				})}
			</div>

			<div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] p-2">
				{sendMessageError && (
					<p className="mb-2 border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-3 py-2 text-xs font-semibold text-[var(--color-danger)]">
						{sendMessageError}
					</p>
				)}
				<div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
					<Button
						aria-label={t('fleet.backFromChat')}
						onPress={onBack}
						className="driver-control-button grid h-12 w-12 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					>
						<ArrowLeft aria-hidden="true" size={17} />
					</Button>
					<TextField>
						<Label className="sr-only">{t('fleet.messageLabel')}</Label>
						<Input
							value={draftMessage}
							onChange={(event) => onDraftChange(event.target.value)}
							onKeyDown={(event) => {
								if (
									event.key === 'Enter' &&
									!event.shiftKey &&
									!event.nativeEvent.isComposing
								) {
									event.preventDefault()
									onSendMessage()
								}
							}}
							placeholder={t('fleet.messagePlaceholder')}
							className="h-12 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
						/>
					</TextField>
					<Button
						aria-label={t('fleet.send')}
						isDisabled={!draftMessage.trim() || sendMessagePending}
						onPress={onSendMessage}
						className="driver-action-button grid h-12 w-12 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Send aria-hidden="true" size={17} />
					</Button>
				</div>
			</div>
		</div>
	)
}
