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

		// Clean up previous observer
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

		// Observe all heading elements
		for (const heading of headings) {
			const el = document.getElementById(heading.id)
			if (el) {
				observer.observe(el)
			}
		}

		return () => observer.disconnect()
	}, [headings])

	if (headings.length === 0) return null

	return (
		<aside className="hidden 2xl:block w-[200px] shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
			<nav aria-label={t('docs.toc.label', { defaultValue: 'Table of Contents' })}>
				<ul className="space-y-1">
					{headings.map((heading) => (
						<li key={heading.id}>
							<a
								href={`#${heading.id}`}
								className={`block text-xs leading-relaxed transition-colors ${
									heading.level === 3 ? 'ps-3' : ''
								} ${
									activeId === heading.id
										? 'text-[var(--color-primary)] font-bold'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
								}`}
							>
								{t(heading.textKey)}
							</a>
						</li>
					))}
				</ul>
			</nav>
		</aside>
	)
}
