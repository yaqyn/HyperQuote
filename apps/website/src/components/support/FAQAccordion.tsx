import type { ParseKeys } from 'i18next'
import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface FAQItem {
	id: string
	questionKey: string
	answerKey: string
	tagKey: string
}

const FAQ_ITEM_COUNT = 10

export const FAQ_DATA: FAQItem[] = Array.from(
	{ length: FAQ_ITEM_COUNT },
	(_, i) => {
		const n = i + 1
		return {
			id: `faq-${n}`,
			questionKey: `support.faq.items.${n}.question`,
			answerKey: `support.faq.items.${n}.answer`,
			tagKey: `support.faq.items.${n}.tag`,
		}
	},
)

interface FAQAccordionProps {
	expandId?: string | null
}

export function FAQAccordion({ expandId }: FAQAccordionProps) {
	const { t } = useTranslation('website')
	const [openIds, setOpenIds] = useState<Set<string>>(new Set())
	const [highlightId, setHighlightId] = useState<string | null>(null)
	const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

	// React to expandId prop from parent
	useEffect(() => {
		if (!expandId) return
		setOpenIds((prev) => {
			const next = new Set(prev)
			next.add(expandId)
			return next
		})
		setHighlightId(expandId)
		setTimeout(() => {
			itemRefs.current[expandId]?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			})
		}, 80)
		setTimeout(() => setHighlightId(null), 2500)
	}, [expandId])

	function toggleItem(id: string) {
		setOpenIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	return (
		<div>
			{FAQ_DATA.map((item) => {
				const isOpen = openIds.has(item.id)

				return (
					<div
						key={item.id}
						ref={(el) => {
							itemRefs.current[item.id] = el
						}}
						className={`border-b border-[var(--color-text)]/[0.07] transition-[border-color] duration-700 ${
							highlightId === item.id ? 'border-[var(--color-primary)]/25' : ''
						}`}
					>
						<button
							type="button"
							onClick={() => toggleItem(item.id)}
							aria-expanded={isOpen}
							className="flex w-full items-center justify-between gap-8 py-8 text-start outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
						>
							<span
								className={`text-[17px] font-semibold leading-snug tracking-[-0.015em] transition-colors duration-700 ${
									highlightId === item.id ? 'text-[var(--color-primary)]' : ''
								}`}
							>
								{t(item.questionKey as ParseKeys<'website'>)}
							</span>
							<span
								className={`shrink-0 transition-colors duration-200 ${
									isOpen ? 'text-[var(--color-primary)]' : 'opacity-25'
								}`}
							>
								{isOpen ? (
									<Minus size={16} strokeWidth={1.5} />
								) : (
									<Plus size={16} strokeWidth={1.5} />
								)}
							</span>
						</button>

						<div
							className="grid transition-[grid-template-rows,opacity] duration-250 ease-out"
							style={{
								gridTemplateRows: isOpen ? '1fr' : '0fr',
								opacity: isOpen ? 1 : 0,
							}}
						>
							<div className="overflow-hidden">
								<div className="pb-9 pe-16 text-[15px] leading-[1.8] opacity-65">
									{t(item.answerKey as ParseKeys<'website'>)}
								</div>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}
