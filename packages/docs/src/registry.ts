// ── Types ──

export interface WizardStep {
	id: string
	titleKey: string
	bodyKey: string
	title: string // display text (used as i18n defaultValue)
	body: string // display text (used as i18n defaultValue)
	illustration: string
	tip?: string
	tipText?: string // display text for tip
	link?: { to: string; labelKey: string; label: string }
}

interface WizardDef {
	slug: string
	titleKey: string
	descriptionKey: string
	illustration: string
	steps: WizardStep[]
}

interface DocArticleDef {
	slug: string
	titleKey: string
	descriptionKey: string
}

interface DocCategoryDef {
	slug: string
	titleKey: string
	articles: DocArticleDef[]
}

// ── Display Names (used as defaultValue when i18n key is missing) ──

const DISPLAY_NAMES: Record<string, string> = {
	// Wizards
	'docs.wizard.gettingStarted.title': 'Platform Guide',
	'docs.wizard.gettingStarted.description':
		'Understand the market, portal, support channels, and quote request workflow.',
	'docs.wizard.for-customers.title': 'For Customers',
	'docs.wizard.for-customers.description':
		'Learn how to manage projects, request quotes, and track deliveries through the portal.',
	'docs.wizard.for-drivers.title': 'For Drivers',
	'docs.wizard.for-drivers.description':
		'Set up the driver app, manage deliveries, and capture proof of delivery.',

	// Categories
	'docs.category.platform.title': 'Platform Overview',
	'docs.category.website-market.title': 'Website & Market',
	'docs.category.quotes-orders.title': 'Quotes & Orders',
	'docs.category.customer-portal.title': 'Customer Portal',
	'docs.category.delivery.title': 'Delivery & Logistics',
	'docs.category.payments.title': 'Payments & Finance',
	'docs.category.ai-lyon.title': 'AI & Lyon',
	'docs.category.driver-app.title': 'Driver App',
	'docs.category.support.title': 'Support',

	// Articles — platform
	'docs.article.what-is-hyperquote.title': 'What is HyperQuote',
	'docs.article.what-is-hyperquote.description':
		'B2B building materials platform built for Egypt\u2019s construction industry.',
	'docs.article.order-flow.title': 'Order Flow',
	'docs.article.order-flow.description':
		'The 12-step quote-to-cash journey from discovery to payment.',

	// Articles — website-market
	'docs.article.browsing-catalog.title': 'Browsing the Catalog',
	'docs.article.browsing-catalog.description':
		'Navigate categories, check availability, and explore building materials.',
	'docs.article.search-products.title': 'Search & Filters',
	'docs.article.search-products.description':
		'Find specific materials using search, filters, and sorting.',
	'docs.article.product-pages.title': 'Product Pages',
	'docs.article.product-pages.description':
		'Specifications, price ranges, and requesting quotes from product details.',

	// Articles — quotes-orders
	'docs.article.rfq-flow.title': 'RFQ Flow',
	'docs.article.rfq-flow.description':
		'How the Request for Quote process works end to end.',
	'docs.article.quote-lifecycle.title': 'Quote Lifecycle',
	'docs.article.quote-lifecycle.description':
		'Quote states from draft through acceptance, negotiation, or expiry.',
	'docs.article.order-management.title': 'Order Management',
	'docs.article.order-management.description':
		'Managing orders after acceptance, PO generation, and status tracking.',
	'docs.article.change-orders.title': 'Change Orders',
	'docs.article.change-orders.description':
		'Requesting changes to existing orders with version tracking.',

	// Articles — customer-portal
	'docs.article.dashboard.title': 'Dashboard',
	'docs.article.dashboard.description':
		'Portal dashboard with key metrics and recent activity.',
	'docs.article.projects.title': 'Projects',
	'docs.article.projects.description':
		'Creating and managing construction projects with material organization.',
	'docs.article.quote-management.title': 'Quote Management',
	'docs.article.quote-management.description':
		'Viewing, comparing, negotiating, and accepting quotes.',
	'docs.article.order-tracking.title': 'Order Tracking',
	'docs.article.order-tracking.description':
		'Real-time order status, delivery GPS tracking, and updates.',

	// Articles — delivery
	'docs.article.scheduling-dispatch.title': 'Scheduling & Dispatch',
	'docs.article.scheduling-dispatch.description':
		'How deliveries are scheduled with Cairo truck ban compliance.',
	'docs.article.tracking-deliveries.title': 'Tracking Deliveries',
	'docs.article.tracking-deliveries.description':
		'Real-time GPS tracking and SMS delivery notifications.',
	'docs.article.delivery-windows.title': 'Delivery Windows',
	'docs.article.delivery-windows.description':
		'Time windows, Cairo restrictions, and scheduling flexibility.',
	'docs.article.proof-of-delivery.title': 'Proof of Delivery',
	'docs.article.proof-of-delivery.description':
		'Photo proof, signature capture, and damage reporting.',

	// Articles — payments
	'docs.article.payment-methods.title': 'Payment Methods',
	'docs.article.payment-methods.description':
		'Wire transfers, cheques, cash on delivery, and letters of credit.',
	'docs.article.invoicing.title': 'Invoicing',
	'docs.article.invoicing.description':
		'Invoice generation with 14% VAT and ETA e-invoicing compliance.',
	'docs.article.eta-compliance.title': 'ETA Compliance',
	'docs.article.eta-compliance.description':
		'Egyptian Tax Authority e-invoicing requirements and digital signatures.',
	'docs.article.credit-terms.title': 'Credit Terms',
	'docs.article.credit-terms.description':
		'Payment terms for new and established customer accounts.',

	// Articles — ai-lyon
	'docs.article.ai-assistant.title': 'Lyon AI Assistant',
	'docs.article.ai-assistant.description':
		'Chat with Lyon for help with materials, quotes, and platform navigation.',
	'docs.article.ai-quoting.title': 'AI-Powered Quoting',
	'docs.article.ai-quoting.description':
		'How AI accelerates quote generation and price prediction.',
	'docs.article.ai-recommendations.title': 'Smart Recommendations',
	'docs.article.ai-recommendations.description':
		'AI product recommendations and alternative material suggestions.',

	// Articles — driver-app
	'docs.article.getting-started-driver.title': 'Driver App Setup',
	'docs.article.getting-started-driver.description':
		'Installing the driver app, login, and initial setup.',
	'docs.article.delivery-operations.title': 'Delivery Operations',
	'docs.article.delivery-operations.description':
		'Daily workflow from assignments through completion.',
	'docs.article.offline-mode.title': 'Offline Mode',
	'docs.article.offline-mode.description':
		'How the app works without internet and syncs when reconnected.',

	// Articles — support
	'docs.article.help-channels.title': 'Help Channels',
	'docs.article.help-channels.description':
		'WhatsApp, phone, email, and in-app chat support options.',
	'docs.article.faq.title': 'FAQ',
	'docs.article.faq.description':
		'Frequently asked questions about the platform.',
	'docs.article.damaged-delivery.title': 'Damaged Delivery',
	'docs.article.damaged-delivery.description':
		'What to do when materials arrive damaged, Egyptian law compliance.',
}

/** Get display name for an i18n key */
export function displayName(key: string): string {
	return DISPLAY_NAMES[key] ?? key
}

// ── Wizard Data ──

export const WIZARDS: Omit<WizardDef, 'steps'>[] = [
	{
		slug: 'getting-started',
		titleKey: 'docs.wizard.gettingStarted.title',
		descriptionKey: 'docs.wizard.gettingStarted.description',
		illustration: 'getting-started',
	},
	{
		slug: 'for-customers',
		titleKey: 'docs.wizard.for-customers.title',
		descriptionKey: 'docs.wizard.for-customers.description',
		illustration: 'for-customers',
	},
	{
		slug: 'for-drivers',
		titleKey: 'docs.wizard.for-drivers.title',
		descriptionKey: 'docs.wizard.for-drivers.description',
		illustration: 'for-drivers',
	},
]

// ── Documentation Categories ──

export const DOC_CATEGORIES: DocCategoryDef[] = [
	{
		slug: 'platform',
		titleKey: 'docs.category.platform.title',
		articles: [
			{
				slug: 'what-is-hyperquote',
				titleKey: 'docs.article.what-is-hyperquote.title',
				descriptionKey: 'docs.article.what-is-hyperquote.description',
			},
			{
				slug: 'order-flow',
				titleKey: 'docs.article.order-flow.title',
				descriptionKey: 'docs.article.order-flow.description',
			},
		],
	},
	{
		slug: 'website-market',
		titleKey: 'docs.category.website-market.title',
		articles: [
			{
				slug: 'browsing-catalog',
				titleKey: 'docs.article.browsing-catalog.title',
				descriptionKey: 'docs.article.browsing-catalog.description',
			},
			{
				slug: 'search-products',
				titleKey: 'docs.article.search-products.title',
				descriptionKey: 'docs.article.search-products.description',
			},
			{
				slug: 'product-pages',
				titleKey: 'docs.article.product-pages.title',
				descriptionKey: 'docs.article.product-pages.description',
			},
		],
	},
	{
		slug: 'quotes-orders',
		titleKey: 'docs.category.quotes-orders.title',
		articles: [
			{
				slug: 'rfq-flow',
				titleKey: 'docs.article.rfq-flow.title',
				descriptionKey: 'docs.article.rfq-flow.description',
			},
			{
				slug: 'quote-lifecycle',
				titleKey: 'docs.article.quote-lifecycle.title',
				descriptionKey: 'docs.article.quote-lifecycle.description',
			},
			{
				slug: 'order-management',
				titleKey: 'docs.article.order-management.title',
				descriptionKey: 'docs.article.order-management.description',
			},
			{
				slug: 'change-orders',
				titleKey: 'docs.article.change-orders.title',
				descriptionKey: 'docs.article.change-orders.description',
			},
		],
	},
	{
		slug: 'customer-portal',
		titleKey: 'docs.category.customer-portal.title',
		articles: [
			{
				slug: 'dashboard',
				titleKey: 'docs.article.dashboard.title',
				descriptionKey: 'docs.article.dashboard.description',
			},
			{
				slug: 'projects',
				titleKey: 'docs.article.projects.title',
				descriptionKey: 'docs.article.projects.description',
			},
			{
				slug: 'quote-management',
				titleKey: 'docs.article.quote-management.title',
				descriptionKey: 'docs.article.quote-management.description',
			},
			{
				slug: 'order-tracking',
				titleKey: 'docs.article.order-tracking.title',
				descriptionKey: 'docs.article.order-tracking.description',
			},
		],
	},
	{
		slug: 'delivery',
		titleKey: 'docs.category.delivery.title',
		articles: [
			{
				slug: 'scheduling-dispatch',
				titleKey: 'docs.article.scheduling-dispatch.title',
				descriptionKey: 'docs.article.scheduling-dispatch.description',
			},
			{
				slug: 'tracking-deliveries',
				titleKey: 'docs.article.tracking-deliveries.title',
				descriptionKey: 'docs.article.tracking-deliveries.description',
			},
			{
				slug: 'delivery-windows',
				titleKey: 'docs.article.delivery-windows.title',
				descriptionKey: 'docs.article.delivery-windows.description',
			},
			{
				slug: 'proof-of-delivery',
				titleKey: 'docs.article.proof-of-delivery.title',
				descriptionKey: 'docs.article.proof-of-delivery.description',
			},
		],
	},
	{
		slug: 'payments',
		titleKey: 'docs.category.payments.title',
		articles: [
			{
				slug: 'payment-methods',
				titleKey: 'docs.article.payment-methods.title',
				descriptionKey: 'docs.article.payment-methods.description',
			},
			{
				slug: 'invoicing',
				titleKey: 'docs.article.invoicing.title',
				descriptionKey: 'docs.article.invoicing.description',
			},
			{
				slug: 'eta-compliance',
				titleKey: 'docs.article.eta-compliance.title',
				descriptionKey: 'docs.article.eta-compliance.description',
			},
			{
				slug: 'credit-terms',
				titleKey: 'docs.article.credit-terms.title',
				descriptionKey: 'docs.article.credit-terms.description',
			},
		],
	},
	{
		slug: 'ai-lyon',
		titleKey: 'docs.category.ai-lyon.title',
		articles: [
			{
				slug: 'ai-assistant',
				titleKey: 'docs.article.ai-assistant.title',
				descriptionKey: 'docs.article.ai-assistant.description',
			},
			{
				slug: 'ai-quoting',
				titleKey: 'docs.article.ai-quoting.title',
				descriptionKey: 'docs.article.ai-quoting.description',
			},
			{
				slug: 'ai-recommendations',
				titleKey: 'docs.article.ai-recommendations.title',
				descriptionKey: 'docs.article.ai-recommendations.description',
			},
		],
	},
	{
		slug: 'driver-app',
		titleKey: 'docs.category.driver-app.title',
		articles: [
			{
				slug: 'getting-started-driver',
				titleKey: 'docs.article.getting-started-driver.title',
				descriptionKey: 'docs.article.getting-started-driver.description',
			},
			{
				slug: 'delivery-operations',
				titleKey: 'docs.article.delivery-operations.title',
				descriptionKey: 'docs.article.delivery-operations.description',
			},
			{
				slug: 'offline-mode',
				titleKey: 'docs.article.offline-mode.title',
				descriptionKey: 'docs.article.offline-mode.description',
			},
		],
	},
	{
		slug: 'support',
		titleKey: 'docs.category.support.title',
		articles: [
			{
				slug: 'help-channels',
				titleKey: 'docs.article.help-channels.title',
				descriptionKey: 'docs.article.help-channels.description',
			},
			{
				slug: 'faq',
				titleKey: 'docs.article.faq.title',
				descriptionKey: 'docs.article.faq.description',
			},
			{
				slug: 'damaged-delivery',
				titleKey: 'docs.article.damaged-delivery.title',
				descriptionKey: 'docs.article.damaged-delivery.description',
			},
		],
	},
]

// ── Helpers ──

function getAllArticles(): Array<DocArticleDef & { categorySlug: string }> {
	return DOC_CATEGORIES.flatMap((cat) =>
		cat.articles.map((a) => ({ ...a, categorySlug: cat.slug })),
	)
}

export function findArticle(categorySlug: string, articleSlug: string) {
	const cat = DOC_CATEGORIES.find((c) => c.slug === categorySlug)
	if (!cat) return null
	const article = cat.articles.find((a) => a.slug === articleSlug)
	if (!article) return null
	return { category: cat, article }
}

export function getAdjacentArticles(categorySlug: string, articleSlug: string) {
	const all = getAllArticles()
	const idx = all.findIndex(
		(a) => a.categorySlug === categorySlug && a.slug === articleSlug,
	)
	return {
		prev: idx > 0 ? all[idx - 1] : null,
		next: idx < all.length - 1 ? all[idx + 1] : null,
	}
}
