import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DOC_CATEGORIES, displayName, WIZARDS } from '../../content/registry'

interface DocsSidebarProps {
	activeCategorySlug?: string
	activeArticleSlug?: string
	activeGuideSlug?: string
}

export function DocsSidebar({
	activeCategorySlug,
	activeArticleSlug,
	activeGuideSlug,
}: DocsSidebarProps) {
	const { t } = useTranslation('website')

	return (
		<nav className="w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
			<div className="space-y-8">
				{/* Guides section */}
				<div>
					<div className="flex items-baseline gap-2.5 mb-3">
						<span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
							00
						</span>
						<span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
							{t('docs.guides', { defaultValue: 'Guides' })}
						</span>
					</div>
					<ul className="space-y-0.5">
						{WIZARDS.map((w) => {
							const isActive = activeGuideSlug === w.slug
							return (
								<li key={w.slug}>
									<Link
										to="/docs/guide/$guideSlug"
										params={{ guideSlug: w.slug }}
										className={`relative block w-full text-start text-[14px] py-1.5 ps-4 transition-colors duration-150 ${
											isActive
												? 'text-[var(--color-text)] font-medium'
												: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
										}`}
									>
										<span
											className={`absolute start-0 top-1/2 -translate-y-1/2 h-4 w-px transition-all duration-200 ${
												isActive
													? 'bg-[var(--color-primary)] opacity-100'
													: 'bg-[var(--color-border)] opacity-0'
											}`}
										/>
										{t(w.titleKey, { defaultValue: displayName(w.titleKey) })}
									</Link>
								</li>
							)
						})}
					</ul>
				</div>

				{/* Doc categories */}
				{DOC_CATEGORIES.map((cat, catIdx) => (
					<div key={cat.slug}>
						<div className="flex items-baseline gap-2.5 mb-3">
							<span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
								{String(catIdx + 1).padStart(2, '0')}
							</span>
							<span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
								{t(cat.titleKey, { defaultValue: displayName(cat.titleKey) })}
							</span>
						</div>
						<ul className="space-y-0.5">
							{cat.articles.map((article) => {
								const isActive =
									activeCategorySlug === cat.slug &&
									activeArticleSlug === article.slug
								return (
									<li key={article.slug}>
										<Link
											to="/docs/$categorySlug/$articleSlug"
											params={{
												categorySlug: cat.slug,
												articleSlug: article.slug,
											}}
											className={`relative block w-full text-start text-[14px] py-1.5 ps-4 transition-colors duration-150 ${
												isActive
													? 'text-[var(--color-text)] font-medium'
													: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
											}`}
										>
											<span
												className={`absolute start-0 top-1/2 -translate-y-1/2 h-4 w-px transition-all duration-200 ${
													isActive
														? 'bg-[var(--color-primary)] opacity-100'
														: 'bg-[var(--color-border)] opacity-0'
												}`}
											/>
											{t(article.titleKey, {
												defaultValue: displayName(article.titleKey),
											})}
										</Link>
									</li>
								)
							})}
						</ul>
					</div>
				))}
			</div>
		</nav>
	)
}
