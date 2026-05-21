import { ArrowLeft, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../hooks/chatSession'
import { useChatWidget } from '../../hooks/useChatWidget'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'

interface ChatPanelProps {
	messages: ChatMessage[]
	isLoading: boolean
	sendMessage: (content: string) => Promise<void>
}

function useUsesFullScreenPanel() {
	const [usesFullScreenPanel, setUsesFullScreenPanel] = useState(false)
	useEffect(() => {
		const mql = window.matchMedia('(max-width: 1023px)')
		setUsesFullScreenPanel(mql.matches)
		const handler = (e: MediaQueryListEvent) => {
			setUsesFullScreenPanel(e.matches)
		}
		mql.addEventListener('change', handler)
		return () => mql.removeEventListener('change', handler)
	}, [])
	return usesFullScreenPanel
}

function ChatHeader({ isFullScreen = false }: { isFullScreen?: boolean }) {
	const { t } = useTranslation('website')
	const close = useChatWidget((s) => s.close)

	if (isFullScreen) {
		return (
			<div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-text)]/[0.06] px-4 sm:px-6">
				<button
					type="button"
					onClick={close}
					aria-label={t('chat.closeLabel')}
					className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text)]/65 transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
				>
					<ArrowLeft size={20} />
				</button>
				<span className="text-[16px] font-semibold tracking-normal">
					{t('chat.header')}
				</span>
			</div>
		)
	}

	return (
		<div className="flex h-12 shrink-0 items-baseline justify-between px-5 pt-5">
			<span className="text-[15px] font-semibold tracking-normal">
				{t('chat.header')}
			</span>
			<button
				type="button"
				onClick={close}
				aria-label={t('chat.closeLabel')}
				className="cursor-pointer opacity-20 transition-opacity hover:opacity-50"
			>
				<X size={15} />
			</button>
		</div>
	)
}

function PanelShell({
	messages,
	isLoading,
	sendMessage,
	isFullScreen = false,
}: ChatPanelProps & { isFullScreen?: boolean }) {
	return (
		<>
			<ChatHeader isFullScreen={isFullScreen} />
			<div
				className={
					isFullScreen
						? 'mx-auto min-h-0 w-full max-w-[760px] flex-1'
						: 'min-h-0 flex-1'
				}
			>
				<ChatMessages messages={messages} isLoading={isLoading} />
			</div>
			<div
				className={isFullScreen ? 'mx-auto w-full max-w-[760px]' : undefined}
			>
				<ChatInput
					onSend={sendMessage}
					isLoading={isLoading}
					isFullScreen={isFullScreen}
				/>
			</div>
		</>
	)
}

const open = { opacity: 0, scale: 0.95, y: 10 }
const visible = { opacity: 1, scale: 1, y: 0 }
const closed = { opacity: 0, scale: 0.95, y: 10 }

function DesktopPanel(props: ChatPanelProps) {
	const isOpen = useChatWidget((s) => s.isOpen)

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={open}
					animate={visible}
					exit={closed}
					transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
					style={{ transformOrigin: 'bottom right' }}
					dir="ltr"
					className="fixed bottom-20 right-4 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_24px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
				>
					<PanelShell {...props} />
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function FullScreenPanel(props: ChatPanelProps) {
	const { isOpen, close } = useChatWidget()

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(o) => {
				if (!o) close()
			}}
			isDismissable
			className="fixed inset-0 z-50 bg-[var(--color-base)]"
		>
			<Modal
				dir="ltr"
				className="flex h-[100dvh] w-full flex-col bg-[var(--color-base)] pt-[env(safe-area-inset-top)] outline-none"
			>
				<PanelShell {...props} isFullScreen />
			</Modal>
		</ModalOverlay>
	)
}

export function ChatPanel(props: ChatPanelProps) {
	const usesFullScreenPanel = useUsesFullScreenPanel()
	return usesFullScreenPanel ? (
		<FullScreenPanel {...props} />
	) : (
		<DesktopPanel {...props} />
	)
}
