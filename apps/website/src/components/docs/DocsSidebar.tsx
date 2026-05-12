import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { DOC_CATEGORIES, displayName, WIZARDS } from '../../content/registry'

interface DocsSidebarProps {
	activeCategorySlug?: string
	activeArticleSlug?: string
	activeGuideSlug?: string
	variant?: 'rail' | 'drawer'
}

export function DocsSidebar({
	activeCategorySlug,
	activeArticleSlug,
	activeGuideSlug,
	variant = 'rail',
}: DocsSidebarProps) {
	const { t } = useTranslation('website')
	const isDrawer = variant === 'drawer'

	return (
		<nav
			className={
				isDrawer
					? 'w-full'
					: 'sticky top-24 w-56 shrink-0 self-start overflow-y-auto max-h-[calc(100vh-8rem)]'
			}
		>
			<div className={isDrawer ? 'space-y-6 pb-6' : 'space-y-8'}>
				{/* Guides section */}
				<div>
					<div className="flex items-baseline gap-2.5 mb-3">
						<span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
							00
						</span>
						<span className="text-[11px] font-semibold uppercase tracking-normal text-[var(--color-text-subtle)]">
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
										className={`relative block w-full text-start text-[14px] py-2 ps-4 transition-colors duration-150 ${
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
							<span className="text-[11px] font-semibold uppercase tracking-normal text-[var(--color-text-subtle)]">
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
											className={`relative block w-full text-start text-[14px] py-2 ps-4 transition-colors duration-150 ${
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

interface DocsMobileSidebarProps extends Omit<DocsSidebarProps, 'variant'> {
	isOpen: boolean
	onOpenChange: (isOpen: boolean) => void
}

export function DocsMobileSidebar({
	isOpen,
	onOpenChange,
	activeCategorySlug,
	activeArticleSlug,
	activeGuideSlug,
}: DocsMobileSidebarProps) {
	const { t } = useTranslation('website')

	if (!isOpen) return null

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			isDismissable
			className="fixed inset-0 z-50 bg-[var(--color-base)]"
		>
			<Modal className="fixed inset-0 outline-none">
				<Dialog
					aria-label={t('docs.sidebarMenu')}
					className="flex h-full flex-col outline-none"
				>
					<div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-text)]/[0.07] px-4 sm:px-6">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							aria-label={t('a11y.close')}
							className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
						>
							<ArrowLeft size={18} className="icon-end" />
						</button>
						<p className="text-[13px] font-medium text-[var(--color-text-muted)]">
							{t('docs.browseAll')}
						</p>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
						<DocsSidebar
							activeCategorySlug={activeCategorySlug}
							activeArticleSlug={activeArticleSlug}
							activeGuideSlug={activeGuideSlug}
							variant="drawer"
						/>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
