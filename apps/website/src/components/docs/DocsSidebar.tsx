import { ListBox, ListBoxItem, ListBoxSection, Header } from 'react-aria-components'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export interface DocsSidebarSection {
	sectionKey: string
	items: { slug: string; labelKey: string }[]
}

export const DOCS_SECTIONS: DocsSidebarSection[] = [
	{
		sectionKey: 'docs.sidebar.gettingStarted',
		items: [
			{ slug: 'what-is-hyperquote', labelKey: 'docs.sidebar.whatIsHyperquote' },
			{ slug: 'creating-an-account', labelKey: 'docs.sidebar.creatingAccount' },
			{ slug: 'your-first-quote', labelKey: 'docs.sidebar.yourFirstQuote' },
		],
	},
	{
		sectionKey: 'docs.sidebar.usingPortal',
		items: [
			{ slug: 'building-material-lists', labelKey: 'docs.sidebar.buildingMaterialLists' },
			{ slug: 'tracking-orders', labelKey: 'docs.sidebar.trackingOrders' },
			{ slug: 'managing-projects', labelKey: 'docs.sidebar.managingProjects' },
		],
	},
	{
		sectionKey: 'docs.sidebar.forSuppliers',
		items: [
			{ slug: 'publishing-your-catalog', labelKey: 'docs.sidebar.publishingCatalog' },
			{ slug: 'managing-prices', labelKey: 'docs.sidebar.managingPrices' },
			{ slug: 'handling-pos', labelKey: 'docs.sidebar.handlingPOs' },
		],
	},
]

export const DEFAULT_SLUG = 'what-is-hyperquote'

export function getAllSlugs(): string[] {
	return DOCS_SECTIONS.flatMap((s) => s.items.map((i) => i.slug))
}

interface DocsSidebarProps {
	activeSlug: string
}

export function DocsSidebar({ activeSlug }: DocsSidebarProps) {
	const { t } = useTranslation('website')
	const navigate = useNavigate()

	return (
		<nav className="w-64 shrink-0 sticky top-20 self-start bg-[var(--color-surface)] rounded-xl p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
			<ListBox
				aria-label={t('nav.docs')}
				selectionMode="single"
				selectedKeys={new Set([activeSlug])}
				onSelectionChange={(keys) => {
					const selected = [...keys][0] as string | undefined
					if (selected) {
						navigate({ to: '/docs/$sectionSlug', params: { sectionSlug: selected } })
					}
				}}
			>
				{DOCS_SECTIONS.map((section) => (
					<ListBoxSection key={section.sectionKey}>
						<Header className="text-xs font-bold uppercase text-[var(--color-text-subtle)] mb-2 px-2 pt-3 first:pt-0">
							{t(section.sectionKey)}
						</Header>
						{section.items.map((item) => (
							<ListBoxItem
								key={item.slug}
								id={item.slug}
								textValue={t(item.labelKey)}
								className={({ isSelected }) =>
									`text-sm px-2 py-1.5 rounded-md cursor-pointer outline-none transition-colors ${
										isSelected
											? 'text-[var(--color-primary)] font-bold border-is-2 border-[var(--color-primary)]'
											: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-base)]'
									}`
								}
							>
								{t(item.labelKey)}
							</ListBoxItem>
						))}
					</ListBoxSection>
				))}
			</ListBox>
		</nav>
	)
}
