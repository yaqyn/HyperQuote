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
	ReceiptText,
	Route,
	SquarePen,
	UserRound,
} from 'lucide-react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import {
	type ActionButtonData,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	PORTAL_CHAT_RUN_COMMAND_EVENT,
} from '../../lib/chat-types'

interface ActionButtonProps {
	data: ActionButtonData
}

const ACTION_ICONS = {
	book: BookOpen,
	command: Command,
	draft: SquarePen,
	external: ExternalLink,
	help: HelpCircle,
	mail: Mail,
	market: PackageSearch,
	orders: ReceiptText,
	profile: UserRound,
	support: MessageCircle,
	track: Route,
} satisfies Record<NonNullable<ActionButtonData['icon']>, typeof BookOpen>

export function ActionButton({ data }: ActionButtonProps) {
	const { i18n } = useTranslation()
	const navigate = useNavigate()
	const isArabic = i18n.language === 'ar'
	const label = isArabic ? data.labelAr : data.label
	const Icon = data.icon ? ACTION_ICONS[data.icon] : undefined
	const className =
		'inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:min-h-8'

	if (data.href) {
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

	const handlePress = () => {
		if (data.command) {
			window.dispatchEvent(
				new CustomEvent(PORTAL_CHAT_RUN_COMMAND_EVENT, {
					detail: { command: data.command },
				}),
			)
			return
		}
		if (data.event === 'open_draft_panel') {
			window.dispatchEvent(new CustomEvent(PORTAL_CHAT_OPEN_DRAFT_EVENT))
			return
		}
		if (data.route) {
			navigate({ to: data.route, search: data.params ?? {} })
		}
	}

	return (
		<Button onPress={handlePress} className={className}>
			{Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
			<span className="truncate">{label}</span>
		</Button>
	)
}
