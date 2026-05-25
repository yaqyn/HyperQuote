import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import { getConversations } from '../../lib/server/customer-service'
import { useSupportStore } from '../../stores/customer-service'
import { EmployeeStatusPill } from '../shared/EmployeeControls'
import { ConversationView } from './ConversationView'
import { CustomerProfilePanel } from './CustomerProfilePanel'
import { SupportInbox } from './SupportInbox'

/**
 * Switchboard — the customer-service shell. Three zones:
 *   1. inbox  (desktop rail) — operator's logbook
 *   2. center (flex)   — correspondence with whoever is on the line
 *   3. dossier (slide) — customer reference card, triggered from the header
 *
 * The line-paper backdrop is applied inside the scroll zones, not on
 * the shell itself, so the separators between inbox and thread stay
 * crisp.
 */
export function CustomerServiceModule() {
	const { t } = useTranslation('customer-service')
	const selectedId = useSupportStore((s) => s.selectedConversationId)
	const [isDesktop, setIsDesktop] = useState(false)
	const [inboxOpen, setInboxOpen] = useState(false)
	const [profileOpen, setProfileOpen] = useState(false)
	const [composeRequestKey, setComposeRequestKey] = useState(0)

	const { data, isLoading, isError } = useQuery({
		queryKey: ['support-inbox'],
		queryFn: () => getConversations(),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const conversations = data?.conversations ?? []
	const selectedConversation =
		conversations.find((c) => c.id === selectedId) ?? null

	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return
		const query = window.matchMedia('(min-width: 1024px)')
		const update = () => setIsDesktop(query.matches)
		update()
		query.addEventListener('change', update)
		return () => query.removeEventListener('change', update)
	}, [])

	useEffect(() => {
		if (isDesktop) setInboxOpen(false)
	}, [isDesktop])

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center bg-line-paper px-4">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
					<p className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
						Loading customer conversations
					</p>
				</div>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center bg-line-paper px-4">
				<div className="flex max-w-sm flex-col items-center gap-3 text-center">
					<EmployeeStatusPill
						tone="danger"
						leading={<AlertTriangle size={14} strokeWidth={2.2} />}
					>
						Customer service queue did not load
					</EmployeeStatusPill>
					<p className="font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
						Refresh the panel before replying to customers. No messages were
						changed.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="relative flex h-full min-h-0 overflow-hidden bg-[var(--color-surface)] lg:flex-row">
			{/* ── Inbox ─────────────────────────────────────── */}
			<div
				className={`min-h-0 w-full shrink-0 flex-col border-black/[0.06] dark:border-white/[0.08] lg:flex lg:w-[320px] lg:border-inline-end ${
					selectedConversation && !inboxOpen ? 'hidden lg:flex' : 'flex'
				}`}
			>
				<SupportInbox
					conversations={conversations}
					selectedId={selectedId}
					selectedConversation={selectedConversation}
					autoSelect={isDesktop}
					onComposeEmail={() => setComposeRequestKey((key) => key + 1)}
					onConversationSelect={() => {
						if (!isDesktop) setInboxOpen(false)
					}}
				/>
			</div>

			{/* ── Conversation ───────────────────────────────── */}
			<div
				className={`min-h-0 min-w-0 flex-1 flex-col lg:flex ${
					selectedConversation && !inboxOpen ? 'flex' : 'hidden lg:flex'
				}`}
			>
				{selectedConversation ? (
					<ConversationView
						composeRequestKey={composeRequestKey}
						conversation={selectedConversation}
						onOpenInbox={() => setInboxOpen(true)}
						onOpenProfile={() => setProfileOpen(true)}
					/>
				) : (
					<EmptyLine
						label={t('empty.selectConversation')}
						hint={t('empty.selectConversationDesc')}
					/>
				)}
			</div>

			{/* ── Dossier (slide) ────────────────────────────── */}
			<CustomerProfilePanel
				conversation={selectedConversation}
				isOpen={profileOpen}
				onClose={() => setProfileOpen(false)}
			/>
		</div>
	)
}

function EmptyLine({ label, hint }: { label: string; hint: string }) {
	return (
		<div className="flex h-full select-none flex-col items-center justify-center gap-3 bg-line-paper px-5 text-center">
			<EmployeeStatusPill tone="neutral">
				No conversation open
			</EmployeeStatusPill>
			<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text)]">
				{label}
			</p>
			<p className="max-w-[36ch] font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
				{hint}
			</p>
		</div>
	)
}
