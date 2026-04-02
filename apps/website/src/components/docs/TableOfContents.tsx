import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface TocItem {
	id: string
	level: 2 | 3
	textKey: string
}

interface TableOfContentsProps {
	headings: TocItem[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
	const { t } = useTranslation('website')
	const [activeId, setActiveId] = useState<string>('')
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		if (headings.length === 0) return

		observerRef.current?.disconnect()

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id)
					}
				}
			},
			{
				rootMargin: '-80px 0px -60% 0px',
				threshold: 0.1,
			},
		)

		observerRef.current = observer

		for (const heading of headings) {
			const el = document.getElementById(heading.id)
			if (el) observer.observe(el)
		}

		return () => observer.disconnect()
	}, [headings])

	if (headings.length === 0) return null

	return (
		<aside className="hidden xl:block w-44 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
			<p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-3">
				{t('docs.toc.label', { defaultValue: 'On this page' })}
			</p>
			<ul className="space-y-0.5">
				{headings.map((heading) => {
					const isActive = activeId === heading.id
					return (
						<li key={heading.id}>
							<a
								href={`#${heading.id}`}
								className={`relative block text-[13px] leading-snug py-1 transition-colors duration-150 ${
									heading.level === 3 ? 'ps-4' : 'ps-0'
								} ${
									isActive
										? 'text-[var(--color-text)] font-medium'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
								}`}
							>
								{t(heading.textKey)}
							</a>
						</li>
					)
				})}
			</ul>
		</aside>
	)
}
