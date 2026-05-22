// Centralized content imports for all markdown articles.
// Both the article route and DocsSearch read from here.
// To add an article: add the import + entry to CONTENT below.

import arWebsite from '@hyperquote/i18n/locales/ar/website'
import { DOC_CATEGORIES, displayName } from '../registry'
import aiAssistantAr from './ar/ai-lyon/ai-assistant.md?raw'
import aiQuotingAr from './ar/ai-lyon/ai-quoting.md?raw'
import aiRecommendationsAr from './ar/ai-lyon/ai-recommendations.md?raw'
import dashboardAr from './ar/customer-portal/dashboard.md?raw'
import orderTrackingAr from './ar/customer-portal/order-tracking.md?raw'
import projectsAr from './ar/customer-portal/projects.md?raw'
import quoteManagementAr from './ar/customer-portal/quote-management.md?raw'
import deliveryWindowsAr from './ar/delivery/delivery-windows.md?raw'
import proofOfDeliveryAr from './ar/delivery/proof-of-delivery.md?raw'
import schedulingDispatchAr from './ar/delivery/scheduling-dispatch.md?raw'
import trackingDeliveriesAr from './ar/delivery/tracking-deliveries.md?raw'
import deliveryOperationsAr from './ar/driver-app/delivery-operations.md?raw'
import gettingStartedDriverAr from './ar/driver-app/getting-started-driver.md?raw'
import offlineModeAr from './ar/driver-app/offline-mode.md?raw'
import creditTermsAr from './ar/payments/credit-terms.md?raw'
import etaComplianceAr from './ar/payments/eta-compliance.md?raw'
import invoicingAr from './ar/payments/invoicing.md?raw'
import paymentMethodsAr from './ar/payments/payment-methods.md?raw'
import orderFlowAr from './ar/platform/order-flow.md?raw'
import whatIsHyperquoteAr from './ar/platform/what-is-hyperquote.md?raw'
import whiteLabelModelAr from './ar/platform/white-label-model.md?raw'
import changeOrdersAr from './ar/quotes-orders/change-orders.md?raw'
import orderManagementAr from './ar/quotes-orders/order-management.md?raw'
import quoteLifecycleAr from './ar/quotes-orders/quote-lifecycle.md?raw'
import rfqFlowAr from './ar/quotes-orders/rfq-flow.md?raw'
import deliveryFulfillmentAr from './ar/supplier-portal/delivery-fulfillment.md?raw'
import managingPricesAr from './ar/supplier-portal/managing-prices.md?raw'
import publishingCatalogAr from './ar/supplier-portal/publishing-catalog.md?raw'
import purchaseOrdersAr from './ar/supplier-portal/purchase-orders.md?raw'
import damagedDeliveryAr from './ar/support/damaged-delivery.md?raw'
import faqAr from './ar/support/faq.md?raw'
import helpChannelsAr from './ar/support/help-channels.md?raw'
import browsingCatalogAr from './ar/website-market/browsing-catalog.md?raw'
import productPagesAr from './ar/website-market/product-pages.md?raw'
import searchProductsAr from './ar/website-market/search-products.md?raw'
// ai-lyon
import aiAssistantEn from './en/ai-lyon/ai-assistant.md?raw'
import aiQuotingEn from './en/ai-lyon/ai-quoting.md?raw'
import aiRecommendationsEn from './en/ai-lyon/ai-recommendations.md?raw'
// customer-portal
import dashboardEn from './en/customer-portal/dashboard.md?raw'
import orderTrackingEn from './en/customer-portal/order-tracking.md?raw'
import projectsEn from './en/customer-portal/projects.md?raw'
import quoteManagementEn from './en/customer-portal/quote-management.md?raw'
import deliveryWindowsEn from './en/delivery/delivery-windows.md?raw'
import proofOfDeliveryEn from './en/delivery/proof-of-delivery.md?raw'
// delivery
import schedulingDispatchEn from './en/delivery/scheduling-dispatch.md?raw'
import trackingDeliveriesEn from './en/delivery/tracking-deliveries.md?raw'
import deliveryOperationsEn from './en/driver-app/delivery-operations.md?raw'
// driver-app
import gettingStartedDriverEn from './en/driver-app/getting-started-driver.md?raw'
import offlineModeEn from './en/driver-app/offline-mode.md?raw'
import creditTermsEn from './en/payments/credit-terms.md?raw'
import etaComplianceEn from './en/payments/eta-compliance.md?raw'
import invoicingEn from './en/payments/invoicing.md?raw'
// payments
import paymentMethodsEn from './en/payments/payment-methods.md?raw'
import orderFlowEn from './en/platform/order-flow.md?raw'
// platform
import whatIsHyperquoteEn from './en/platform/what-is-hyperquote.md?raw'
import whiteLabelModelEn from './en/platform/white-label-model.md?raw'
import changeOrdersEn from './en/quotes-orders/change-orders.md?raw'
import orderManagementEn from './en/quotes-orders/order-management.md?raw'
import quoteLifecycleEn from './en/quotes-orders/quote-lifecycle.md?raw'
// quotes-orders
import rfqFlowEn from './en/quotes-orders/rfq-flow.md?raw'
import deliveryFulfillmentEn from './en/supplier-portal/delivery-fulfillment.md?raw'
import managingPricesEn from './en/supplier-portal/managing-prices.md?raw'
// supplier-portal
import publishingCatalogEn from './en/supplier-portal/publishing-catalog.md?raw'
import purchaseOrdersEn from './en/supplier-portal/purchase-orders.md?raw'
import damagedDeliveryEn from './en/support/damaged-delivery.md?raw'
import faqEn from './en/support/faq.md?raw'
// support
import helpChannelsEn from './en/support/help-channels.md?raw'
// website-market
import browsingCatalogEn from './en/website-market/browsing-catalog.md?raw'
import productPagesEn from './en/website-market/product-pages.md?raw'
import searchProductsEn from './en/website-market/search-products.md?raw'

// Content map: key is "categorySlug/articleSlug"
const CONTENT: Record<string, { en: string; ar: string }> = {
	'platform/what-is-hyperquote': {
		en: whatIsHyperquoteEn,
		ar: whatIsHyperquoteAr,
	},
	'platform/white-label-model': {
		en: whiteLabelModelEn,
		ar: whiteLabelModelAr,
	},
	'platform/order-flow': { en: orderFlowEn, ar: orderFlowAr },
	'website-market/browsing-catalog': {
		en: browsingCatalogEn,
		ar: browsingCatalogAr,
	},
	'website-market/search-products': {
		en: searchProductsEn,
		ar: searchProductsAr,
	},
	'website-market/product-pages': { en: productPagesEn, ar: productPagesAr },
	'quotes-orders/rfq-flow': { en: rfqFlowEn, ar: rfqFlowAr },
	'quotes-orders/quote-lifecycle': {
		en: quoteLifecycleEn,
		ar: quoteLifecycleAr,
	},
	'quotes-orders/order-management': {
		en: orderManagementEn,
		ar: orderManagementAr,
	},
	'quotes-orders/change-orders': { en: changeOrdersEn, ar: changeOrdersAr },
	'customer-portal/dashboard': { en: dashboardEn, ar: dashboardAr },
	'customer-portal/projects': { en: projectsEn, ar: projectsAr },
	'customer-portal/quote-management': {
		en: quoteManagementEn,
		ar: quoteManagementAr,
	},
	'customer-portal/order-tracking': {
		en: orderTrackingEn,
		ar: orderTrackingAr,
	},
	'supplier-portal/publishing-catalog': {
		en: publishingCatalogEn,
		ar: publishingCatalogAr,
	},
	'supplier-portal/managing-prices': {
		en: managingPricesEn,
		ar: managingPricesAr,
	},
	'supplier-portal/purchase-orders': {
		en: purchaseOrdersEn,
		ar: purchaseOrdersAr,
	},
	'supplier-portal/delivery-fulfillment': {
		en: deliveryFulfillmentEn,
		ar: deliveryFulfillmentAr,
	},
	'delivery/scheduling-dispatch': {
		en: schedulingDispatchEn,
		ar: schedulingDispatchAr,
	},
	'delivery/tracking-deliveries': {
		en: trackingDeliveriesEn,
		ar: trackingDeliveriesAr,
	},
	'delivery/delivery-windows': { en: deliveryWindowsEn, ar: deliveryWindowsAr },
	'delivery/proof-of-delivery': {
		en: proofOfDeliveryEn,
		ar: proofOfDeliveryAr,
	},
	'payments/payment-methods': { en: paymentMethodsEn, ar: paymentMethodsAr },
	'payments/invoicing': { en: invoicingEn, ar: invoicingAr },
	'payments/eta-compliance': { en: etaComplianceEn, ar: etaComplianceAr },
	'payments/credit-terms': { en: creditTermsEn, ar: creditTermsAr },
	'ai-lyon/ai-assistant': { en: aiAssistantEn, ar: aiAssistantAr },
	'ai-lyon/ai-quoting': { en: aiQuotingEn, ar: aiQuotingAr },
	'ai-lyon/ai-recommendations': {
		en: aiRecommendationsEn,
		ar: aiRecommendationsAr,
	},
	'driver-app/getting-started-driver': {
		en: gettingStartedDriverEn,
		ar: gettingStartedDriverAr,
	},
	'driver-app/delivery-operations': {
		en: deliveryOperationsEn,
		ar: deliveryOperationsAr,
	},
	'driver-app/offline-mode': { en: offlineModeEn, ar: offlineModeAr },
	'support/help-channels': { en: helpChannelsEn, ar: helpChannelsAr },
	'support/faq': { en: faqEn, ar: faqAr },
	'support/damaged-delivery': { en: damagedDeliveryEn, ar: damagedDeliveryAr },
}

export type DocsLocale = 'en' | 'ar'

export interface LocalizedDocContent {
	categorySlug: string
	articleSlug: string
	locale: DocsLocale
	title: string
	description: string
	categoryTitle: string
	href: string
	content: string
}

export function getContent(
	categorySlug: string,
	articleSlug: string,
	locale: DocsLocale,
): string {
	const entry = CONTENT[`${categorySlug}/${articleSlug}`]
	if (!entry) return ''
	return entry[locale] || entry.en
}

export function getAllContent(): Array<{
	categorySlug: string
	articleSlug: string
	content: string
}> {
	return Object.entries(CONTENT).map(([key, val]) => {
		const [categorySlug, articleSlug] = key.split('/')
		return { categorySlug, articleSlug, content: val.en }
	})
}

export function getAllLocalizedContent(): LocalizedDocContent[] {
	return DOC_CATEGORIES.flatMap((category) =>
		category.articles.flatMap((article) =>
			(['en', 'ar'] as const).map((locale) => ({
				categorySlug: category.slug,
				articleSlug: article.slug,
				locale,
				title: localizedDisplayName(article.titleKey, locale),
				description: localizedDisplayName(article.descriptionKey, locale),
				categoryTitle: localizedDisplayName(category.titleKey, locale),
				href: `/docs/${category.slug}/${article.slug}`,
				content: getContent(category.slug, article.slug, locale),
			})),
		),
	)
}

function localizedDisplayName(key: string, locale: DocsLocale): string {
	if (locale === 'en') return displayName(key)
	return resourceText(arWebsite, key) ?? displayName(key)
}

function resourceText(resource: unknown, key: string): string | null {
	let current = resource
	for (const part of key.split('.')) {
		if (!isRecord(current) || !(part in current)) return null
		current = current[part]
	}
	return typeof current === 'string' ? current : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}
