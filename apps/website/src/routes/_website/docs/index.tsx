import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { Menu } from 'lucide-react'
import { DocsSidebar, DEFAULT_SLUG } from '../../../components/docs/DocsSidebar'
import { DocsContent, getDocHeadings } from '../../../components/docs/DocsContent'
import { TableOfContents } from '../../../components/docs/TableOfContents'

export const Route = createFileRoute('/_website/docs/')({
	head: () => ({
		meta: [
			{ title: 'Docs \u2014 HyperQuote' },
			{
				name: 'description',
				content: 'HyperQuote documentation. Learn how to source building materials, manage quotes, and track deliveries.',
			},
			{ property: 'og:title', content: 'Docs \u2014 HyperQuote' },
			{
				property: 'og:description',
				content: 'HyperQuote documentation. Learn how to source building materials, manage quotes, and track deliveries.',
			},
		],
	}),
	component: DocsIndexPage,
})

function DocsIndexPage() {
	const { t } = useTranslation('website')
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
	const headings = getDocHeadings(DEFAULT_SLUG)

	return (
		<div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12">
			{/* Mobile sidebar trigger */}
			<div className="md:hidden mb-6">
				<button
					type="button"
					onClick={() => setIsMobileSidebarOpen(true)}
					className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text)]"
					aria-label={t('docs.openSidebar', { defaultValue: 'Open documentation menu' })}
				>
					<Menu size={18} />
					{t('nav.docs')}
				</button>
			</div>

			{/* 3-column layout */}
			<div className="flex gap-8">
				{/* Sidebar - hidden on mobile */}
				<div className="hidden md:block">
					<DocsSidebar activeSlug={DEFAULT_SLUG} />
				</div>

				{/* Content */}
				<DocsContent slug={DEFAULT_SLUG} />

				{/* Table of Contents - only on wide screens */}
				<TableOfContents headings={headings} />
			</div>

			{/* Mobile sidebar bottom sheet */}
			{isMobileSidebarOpen && (
				<ModalOverlay
					isOpen={isMobileSidebarOpen}
					onOpenChange={(open) => {
						if (!open) setIsMobileSidebarOpen(false)
					}}
					isDismissable
					className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
				>
					<Modal className="fixed inset-x-0 bottom-0 z-50">
						<Dialog
							aria-label={t('docs.sidebarMenu', { defaultValue: 'Documentation menu' })}
							className="bg-[var(--color-base)] rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto outline-none"
						>
							<div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-4" />
							<DocsSidebar activeSlug={DEFAULT_SLUG} />
						</Dialog>
					</Modal>
				</ModalOverlay>
			)}
		</div>
	)
}
