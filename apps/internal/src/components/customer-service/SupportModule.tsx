import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getConversations } from '../../lib/server/customer-service'
import { useSupportStore } from '../../stores/customer-service'
import { ConversationView } from './ConversationView'
import { CustomerProfilePanel } from './CustomerProfilePanel'
import { SupportInbox } from './SupportInbox'

/**
 * Switchboard — the customer-service shell. Three zones:
 *   1. inbox  (260px)  — operator's logbook
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
	const [profileOpen, setProfileOpen] = useState(false)

	const { data, isLoading } = useQuery({
		queryKey: ['support-inbox'],
		queryFn: () => getConversations(),
		staleTime: 10_000,
	})

	const conversations = data?.conversations ?? []
	const selectedConversation =
		conversations.find((c) => c.id === selectedId) ?? null

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 overflow-hidden">
			{/* ── Inbox ─────────────────────────────────────── */}
			<div className="w-[320px] shrink-0 border-inline-end border-black/[0.06] dark:border-white/[0.08] flex flex-col min-h-0">
				<SupportInbox conversations={conversations} selectedId={selectedId} />
			</div>

			{/* ── Conversation ───────────────────────────────── */}
			<div className="flex-1 min-w-0 flex flex-col min-h-0">
				{selectedConversation ? (
					<ConversationView
						conversation={selectedConversation}
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
		<div className="flex flex-col items-center justify-center h-full gap-3 select-none bg-line-paper">
			<p
				className="font-[family-name:var(--font-literata)] italic text-[28px] text-[var(--color-text-muted)]"
				style={{ fontVariationSettings: '"opsz" 72, "wght" 400' }}
			>
				the line is quiet.
			</p>
			<p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p
				className="font-[family-name:var(--font-literata)] italic text-[13px] text-[var(--color-text-subtle)] max-w-[36ch] text-center"
				style={{ fontVariationSettings: '"opsz" 14, "wght" 400' }}
			>
				{hint}
			</p>
		</div>
	)
}
