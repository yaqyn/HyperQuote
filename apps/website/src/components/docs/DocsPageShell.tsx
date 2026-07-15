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
			className="hq-action hq-action--outline hq-action--compact"
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
			<div className="mb-8 flex justify-start lg:hidden">
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
			className={`mx-auto ${maxWidthClass} px-4 pb-16 pt-28 sm:px-6 sm:pt-32 md:px-8 lg:px-12 lg:pb-24 lg:pt-36`}
		>
			<div className="border-t border-[var(--site-rule)] pt-5">
				<DocsMobileBrowseControls
					activeCategorySlug={activeCategorySlug}
					activeArticleSlug={activeArticleSlug}
					activeGuideSlug={activeGuideSlug}
				/>

				<motion.div
					initial="hidden"
					animate="visible"
					variants={reveal}
					className="flex min-w-0 gap-10 xl:gap-16"
				>
					<div className="hidden shrink-0 border-e border-[var(--site-rule)] pe-8 lg:block xl:pe-10">
						<DocsSidebar
							activeCategorySlug={activeCategorySlug}
							activeArticleSlug={activeArticleSlug}
							activeGuideSlug={activeGuideSlug}
						/>
					</div>
					{children}
				</motion.div>
			</div>
		</div>
	)
}
