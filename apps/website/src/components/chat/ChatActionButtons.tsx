import {
	BookOpen,
	BriefcaseBusiness,
	Building2,
	ExternalLink,
	FileText,
	LifeBuoy,
	LogIn,
	PackageSearch,
	ShoppingCart,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { WebsiteChatAction } from '../../hooks/chatSession'

interface ChatActionButtonsProps {
	actions?: WebsiteChatAction[]
}

const ACTION_ICONS = {
	book: BookOpen,
	briefcase: BriefcaseBusiness,
	building: Building2,
	file: FileText,
	login: LogIn,
	market: PackageSearch,
	quote: ShoppingCart,
	support: LifeBuoy,
} as const

export function ChatActionButtons({ actions }: ChatActionButtonsProps) {
	const { i18n } = useTranslation('website')
	if (!actions?.length) return null
	const isArabic = i18n.language.startsWith('ar')

	return (
		<div className="mt-3 flex flex-wrap gap-2">
			{actions.map((action) => {
				const Icon = ACTION_ICONS[action.icon]
				const isExternal = /^https?:\/\//i.test(action.href)
				const label = isArabic ? action.labelAr : action.label
				return (
					<a
						key={`${action.href}:${label}`}
						href={action.href}
						target={isExternal ? '_blank' : undefined}
						rel={isExternal ? 'noopener noreferrer' : undefined}
						className="inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-[var(--color-text)]/[0.12] bg-[var(--color-surface)] px-3 text-[13px] font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
					>
						<Icon aria-hidden="true" size={15} strokeWidth={1.8} />
						<span className="min-w-0 truncate">{label}</span>
						{isExternal && (
							<ExternalLink aria-hidden="true" size={13} strokeWidth={1.8} />
						)}
					</a>
				)
			})}
		</div>
	)
}
