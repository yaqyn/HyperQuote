import { useTranslation } from 'react-i18next'

interface DocsContentProps {
	slug: string
}

interface DocSection {
	titleKey: string
	headings: { id: string; level: 2 | 3; textKey: string }[]
}

const SECTION_MAP: Record<string, DocSection> = {
	'what-is-hyperquote': {
		titleKey: 'docs.content.whatIsHyperquote.title',
		headings: [
			{ id: 'overview', level: 2, textKey: 'docs.content.whatIsHyperquote.overview' },
			{ id: 'how-it-works', level: 2, textKey: 'docs.content.whatIsHyperquote.howItWorks' },
			{ id: 'key-features', level: 2, textKey: 'docs.content.whatIsHyperquote.keyFeatures' },
		],
	},
	'creating-an-account': {
		titleKey: 'docs.content.creatingAccount.title',
		headings: [
			{ id: 'sign-up', level: 2, textKey: 'docs.content.creatingAccount.signUp' },
			{ id: 'verification', level: 2, textKey: 'docs.content.creatingAccount.verification' },
		],
	},
	'your-first-quote': {
		titleKey: 'docs.content.yourFirstQuote.title',
		headings: [
			{ id: 'adding-materials', level: 2, textKey: 'docs.content.yourFirstQuote.addingMaterials' },
			{ id: 'submitting', level: 2, textKey: 'docs.content.yourFirstQuote.submitting' },
			{ id: 'receiving-response', level: 2, textKey: 'docs.content.yourFirstQuote.receivingResponse' },
		],
	},
	'building-material-lists': {
		titleKey: 'docs.content.buildingMaterialLists.title',
		headings: [
			{ id: 'catalog-search', level: 2, textKey: 'docs.content.buildingMaterialLists.catalogSearch' },
			{ id: 'custom-items', level: 2, textKey: 'docs.content.buildingMaterialLists.customItems' },
		],
	},
	'tracking-orders': {
		titleKey: 'docs.content.trackingOrders.title',
		headings: [
			{ id: 'order-status', level: 2, textKey: 'docs.content.trackingOrders.orderStatus' },
			{ id: 'delivery-tracking', level: 2, textKey: 'docs.content.trackingOrders.deliveryTracking' },
		],
	},
	'managing-projects': {
		titleKey: 'docs.content.managingProjects.title',
		headings: [
			{ id: 'create-project', level: 2, textKey: 'docs.content.managingProjects.createProject' },
			{ id: 'budgets', level: 2, textKey: 'docs.content.managingProjects.budgets' },
		],
	},
	'publishing-your-catalog': {
		titleKey: 'docs.content.publishingCatalog.title',
		headings: [
			{ id: 'upload-products', level: 2, textKey: 'docs.content.publishingCatalog.uploadProducts' },
			{ id: 'ai-parsing', level: 2, textKey: 'docs.content.publishingCatalog.aiParsing' },
		],
	},
	'managing-prices': {
		titleKey: 'docs.content.managingPrices.title',
		headings: [
			{ id: 'price-lists', level: 2, textKey: 'docs.content.managingPrices.priceLists' },
			{ id: 'bulk-updates', level: 2, textKey: 'docs.content.managingPrices.bulkUpdates' },
		],
	},
	'handling-pos': {
		titleKey: 'docs.content.handlingPOs.title',
		headings: [
			{ id: 'po-inbox', level: 2, textKey: 'docs.content.handlingPOs.poInbox' },
			{ id: 'fulfillment', level: 2, textKey: 'docs.content.handlingPOs.fulfillment' },
		],
	},
}

export function getDocHeadings(slug: string) {
	return SECTION_MAP[slug]?.headings ?? []
}

export function DocsContent({ slug }: DocsContentProps) {
	const { t } = useTranslation('website')
	const section = SECTION_MAP[slug]

	if (!section) {
		return (
			<div className="prose-docs">
				<h1>{t('docs.content.notFound')}</h1>
				<p>{t('docs.content.notFoundBody')}</p>
			</div>
		)
	}

	return (
		<article className="flex-1 min-w-0 max-w-[720px]">
			<h1 className="text-[30px] font-bold leading-[1.2] mb-8">{t(section.titleKey)}</h1>
			{section.headings.map((heading) => {
				const HeadingTag = heading.level === 2 ? 'h2' : 'h3'
				const headingClass =
					heading.level === 2
						? 'text-base font-bold mt-8 mb-4'
						: 'text-base font-bold mt-6 mb-3'
				return (
					<section key={heading.id} id={heading.id}>
						<HeadingTag className={headingClass}>{t(heading.textKey)}</HeadingTag>
						<p className="text-base leading-[1.75] mb-4 text-[var(--color-text-muted)]">
							{t(`docs.content.${slug.replace(/-/g, '')}.${heading.id.replace(/-/g, '')}Body`, {
								defaultValue:
									'This section will be populated with detailed documentation. Check back soon for comprehensive guides and examples.',
							})}
						</p>
					</section>
				)
			})}
		</article>
	)
}
