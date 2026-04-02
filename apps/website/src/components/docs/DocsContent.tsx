import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { DOCS_SECTIONS, getAllSlugs } from './DocsSidebar'

interface DocsContentProps {
	slug: string
}

interface DocHeading {
	id: string
	level: 2 | 3
	textKey: string
}

interface DocSection {
	titleKey: string
	descriptionKey: string
	headings: DocHeading[]
}

const SECTION_MAP: Record<string, DocSection> = {
	'what-is-hyperquote': {
		titleKey: 'docs.content.whatIsHyperquote.title',
		descriptionKey: 'docs.content.whatIsHyperquote.description',
		headings: [
			{ id: 'overview', level: 2, textKey: 'docs.content.whatIsHyperquote.overview' },
			{ id: 'how-it-works', level: 2, textKey: 'docs.content.whatIsHyperquote.howItWorks' },
			{ id: 'key-features', level: 2, textKey: 'docs.content.whatIsHyperquote.keyFeatures' },
		],
	},
	'creating-an-account': {
		titleKey: 'docs.content.creatingAccount.title',
		descriptionKey: 'docs.content.creatingAccount.description',
		headings: [
			{ id: 'sign-up', level: 2, textKey: 'docs.content.creatingAccount.signUp' },
			{ id: 'verification', level: 2, textKey: 'docs.content.creatingAccount.verification' },
		],
	},
	'your-first-quote': {
		titleKey: 'docs.content.yourFirstQuote.title',
		descriptionKey: 'docs.content.yourFirstQuote.description',
		headings: [
			{ id: 'adding-materials', level: 2, textKey: 'docs.content.yourFirstQuote.addingMaterials' },
			{ id: 'submitting', level: 2, textKey: 'docs.content.yourFirstQuote.submitting' },
			{ id: 'receiving-response', level: 2, textKey: 'docs.content.yourFirstQuote.receivingResponse' },
		],
	},
	'building-material-lists': {
		titleKey: 'docs.content.buildingMaterialLists.title',
		descriptionKey: 'docs.content.buildingMaterialLists.description',
		headings: [
			{ id: 'catalog-search', level: 2, textKey: 'docs.content.buildingMaterialLists.catalogSearch' },
			{ id: 'custom-items', level: 2, textKey: 'docs.content.buildingMaterialLists.customItems' },
		],
	},
	'tracking-orders': {
		titleKey: 'docs.content.trackingOrders.title',
		descriptionKey: 'docs.content.trackingOrders.description',
		headings: [
			{ id: 'order-status', level: 2, textKey: 'docs.content.trackingOrders.orderStatus' },
			{ id: 'delivery-tracking', level: 2, textKey: 'docs.content.trackingOrders.deliveryTracking' },
		],
	},
	'managing-projects': {
		titleKey: 'docs.content.managingProjects.title',
		descriptionKey: 'docs.content.managingProjects.description',
		headings: [
			{ id: 'create-project', level: 2, textKey: 'docs.content.managingProjects.createProject' },
			{ id: 'budgets', level: 2, textKey: 'docs.content.managingProjects.budgets' },
		],
	},
	'publishing-your-catalog': {
		titleKey: 'docs.content.publishingCatalog.title',
		descriptionKey: 'docs.content.publishingCatalog.description',
		headings: [
			{ id: 'upload-products', level: 2, textKey: 'docs.content.publishingCatalog.uploadProducts' },
			{ id: 'ai-parsing', level: 2, textKey: 'docs.content.publishingCatalog.aiParsing' },
		],
	},
	'managing-prices': {
		titleKey: 'docs.content.managingPrices.title',
		descriptionKey: 'docs.content.managingPrices.description',
		headings: [
			{ id: 'price-lists', level: 2, textKey: 'docs.content.managingPrices.priceLists' },
			{ id: 'bulk-updates', level: 2, textKey: 'docs.content.managingPrices.bulkUpdates' },
		],
	},
	'handling-pos': {
		titleKey: 'docs.content.handlingPOs.title',
		descriptionKey: 'docs.content.handlingPOs.description',
		headings: [
			{ id: 'po-inbox', level: 2, textKey: 'docs.content.handlingPOs.poInbox' },
			{ id: 'fulfillment', level: 2, textKey: 'docs.content.handlingPOs.fulfillment' },
		],
	},
}

export function getDocHeadings(slug: string) {
	return SECTION_MAP[slug]?.headings ?? []
}

/** Get the next and previous slugs for navigation */
function getAdjacentSlugs(slug: string) {
	const allSlugs = getAllSlugs()
	const idx = allSlugs.indexOf(slug)
	return {
		prev: idx > 0 ? allSlugs[idx - 1] : null,
		next: idx < allSlugs.length - 1 ? allSlugs[idx + 1] : null,
	}
}

function getSectionTitle(slug: string) {
	return SECTION_MAP[slug]?.titleKey ?? slug
}

export function DocsContent({ slug }: DocsContentProps) {
	const { t } = useTranslation('website')
	const section = SECTION_MAP[slug]

	if (!section) {
		return (
			<article className="flex-1 min-w-0 max-w-[680px]">
				<h1 className="text-[28px] font-bold tracking-[-0.02em]">
					{t('docs.content.notFound', { defaultValue: 'Page not found' })}
				</h1>
				<p className="mt-3 text-[15px] text-[var(--color-text-muted)] leading-relaxed">
					{t('docs.content.notFoundBody', {
						defaultValue: 'This documentation page doesn\u2019t exist. Select a topic from the sidebar.',
					})}
				</p>
			</article>
		)
	}

	// Find which section group this belongs to
	const parentSection = DOCS_SECTIONS.find((s) => s.items.some((i) => i.slug === slug))
	const { prev, next } = getAdjacentSlugs(slug)

	return (
		<article className="flex-1 min-w-0 max-w-[680px]">
			{/* Breadcrumb */}
			{parentSection && (
				<div className="flex items-center gap-2 text-[12px] text-[var(--color-text-subtle)] mb-6">
					<Link to="/docs" className="hover:text-[var(--color-text)] transition-colors">
						{t('nav.docs')}
					</Link>
					<span className="opacity-40">/</span>
					<span>{t(parentSection.sectionKey)}</span>
				</div>
			)}

			{/* Title */}
			<h1
				className="font-bold tracking-[-0.03em] leading-[1.1]"
				style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}
			>
				{t(section.titleKey)}
			</h1>

			{/* Description */}
			<p className="mt-4 text-[15px] leading-[1.7] text-[var(--color-text-muted)] max-w-[560px]">
				{t(section.descriptionKey, {
					defaultValue:
						'This section covers everything you need to know. Follow along step by step.',
				})}
			</p>

			{/* Divider */}
			<div className="mt-8 mb-10 h-px bg-[var(--color-text)] opacity-[0.07]" />

			{/* Content sections */}
			{section.headings.map((heading, idx) => {
				const HeadingTag = heading.level === 2 ? 'h2' : 'h3'
				return (
					<section key={heading.id} id={heading.id} className="mb-12 last:mb-0 scroll-mt-24">
						<div className="flex items-baseline gap-3 mb-4">
							<span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
								{String(idx + 1).padStart(2, '0')}
							</span>
							<HeadingTag className="text-[18px] font-semibold tracking-[-0.01em]">
								{t(heading.textKey)}
							</HeadingTag>
						</div>
						<div className="ps-8">
							<p className="text-[15px] leading-[1.8] text-[var(--color-text-muted)]">
								{t(
									`docs.content.${slug.replace(/-/g, '')}.${heading.id.replace(/-/g, '')}Body`,
									{
										defaultValue:
											'Detailed documentation for this section is being prepared. Check back soon for comprehensive guides, examples, and best practices.',
									},
								)}
							</p>
						</div>
					</section>
				)
			})}

			{/* Bottom navigation */}
			<div className="mt-16 pt-8 border-t border-[var(--color-text)]/[0.07]">
				<div className="flex items-stretch justify-between gap-4">
					{prev ? (
						<Link
							to="/docs/$sectionSlug"
							params={{ sectionSlug: prev }}
							className="group flex flex-col items-start text-start"
						>
							<span className="text-[11px] text-[var(--color-text-subtle)] mb-1">
								{t('docs.nav.previous', { defaultValue: 'Previous' })}
							</span>
							<span className="text-[14px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
								{t(getSectionTitle(prev))}
							</span>
						</Link>
					) : (
						<div />
					)}

					{next && (
						<Link
							to="/docs/$sectionSlug"
							params={{ sectionSlug: next }}
							className="group flex flex-col items-end text-end"
						>
							<span className="text-[11px] text-[var(--color-text-subtle)] mb-1">
								{t('docs.nav.next', { defaultValue: 'Next' })}
							</span>
							<span className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
								{t(getSectionTitle(next))}
								<ArrowRight size={14} className="icon-end" />
							</span>
						</Link>
					)}
				</div>
			</div>
		</article>
	)
}
