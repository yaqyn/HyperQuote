import { Menu } from 'lucide-react'
import { cubicBezier, motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocsMobileSidebar, DocsSidebar } from './DocsSidebar'

interface DocsActiveRoute {
	activeCategorySlug?: string
	activeArticleSlug?: string
	activeGuideSlug?: string
}

interface DocsPageShellProps extends DocsActiveRoute {
	children: ReactNode
	maxWidth?: 'standard' | 'article'
}

const reveal = {
	hidden: { opacity: 0, y: 12 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.35, ease: cubicBezier(0.25, 0.1, 0.25, 1) },
	},
}

function DocsBrowseButton({ onClick }: { onClick: () => void }) {
	const { t } = useTranslation('website')

	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--color-text)]/[0.08] px-3 text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text)]/[0.16] hover:text-[var(--color-text)]"
			aria-label={t('docs.openSidebar')}
		>
			<Menu size={16} />
			{t('docs.browseAll', { defaultValue: 'Browse all topics' })}
		</button>
	)
}

export function DocsMobileBrowseControls({
	activeCategorySlug,
	activeArticleSlug,
	activeGuideSlug,
}: DocsActiveRoute) {
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

	return (
		<>
			<div className="mb-8 flex justify-center lg:hidden">
				<DocsBrowseButton onClick={() => setIsMobileSidebarOpen(true)} />
			</div>
			<DocsMobileSidebar
				isOpen={isMobileSidebarOpen}
				onOpenChange={setIsMobileSidebarOpen}
				activeCategorySlug={activeCategorySlug}
				activeArticleSlug={activeArticleSlug}
				activeGuideSlug={activeGuideSlug}
			/>
		</>
	)
}

export function DocsPageShell({
	children,
	maxWidth = 'standard',
	activeCategorySlug,
	activeArticleSlug,
	activeGuideSlug,
}: DocsPageShellProps) {
	const maxWidthClass =
		maxWidth === 'article' ? 'max-w-[1400px]' : 'max-w-[1200px]'

	return (
		<div
			className={`mx-auto ${maxWidthClass} px-4 pb-16 pt-24 sm:px-6 md:px-8 lg:px-12 lg:pb-24 lg:pt-32`}
		>
			<DocsMobileBrowseControls
				activeCategorySlug={activeCategorySlug}
				activeArticleSlug={activeArticleSlug}
				activeGuideSlug={activeGuideSlug}
			/>

			<motion.div
				initial="hidden"
				animate="visible"
				variants={reveal}
				className="flex gap-10 xl:gap-16"
			>
				<div className="hidden lg:block">
					<DocsSidebar
						activeCategorySlug={activeCategorySlug}
						activeArticleSlug={activeArticleSlug}
						activeGuideSlug={activeGuideSlug}
					/>
				</div>
				{children}
			</motion.div>
		</div>
	)
}
