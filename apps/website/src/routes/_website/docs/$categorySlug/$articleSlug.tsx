import { useState, useMemo, useEffect, useRef } from 'react'
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { motion } from 'motion/react'
import { Menu } from 'lucide-react'
import { findArticle, getAdjacentArticles, displayName } from '../../../../content/registry'
import { ArticleRenderer, extractHeadings, type ExtractedHeading } from '../../../../components/docs/ArticleRenderer'
import { DocsSidebar } from '../../../../components/docs/DocsSidebar'

// Eagerly import all markdown content.
// Vite's ?raw imports are resolved at build time.
// When adding articles, add imports here and to the CONTENT_MAP.

// platform
import whatIsHyperquoteEn from '../../../../content/docs/en/platform/what-is-hyperquote.md?raw'
import whatIsHyperquoteAr from '../../../../content/docs/ar/platform/what-is-hyperquote.md?raw'
import whiteLabelModelEn from '../../../../content/docs/en/platform/white-label-model.md?raw'
import whiteLabelModelAr from '../../../../content/docs/ar/platform/white-label-model.md?raw'
import orderFlowEn from '../../../../content/docs/en/platform/order-flow.md?raw'
import orderFlowAr from '../../../../content/docs/ar/platform/order-flow.md?raw'

// website-market
import browsingCatalogEn from '../../../../content/docs/en/website-market/browsing-catalog.md?raw'
import browsingCatalogAr from '../../../../content/docs/ar/website-market/browsing-catalog.md?raw'
import searchProductsEn from '../../../../content/docs/en/website-market/search-products.md?raw'
import searchProductsAr from '../../../../content/docs/ar/website-market/search-products.md?raw'
import productPagesEn from '../../../../content/docs/en/website-market/product-pages.md?raw'
import productPagesAr from '../../../../content/docs/ar/website-market/product-pages.md?raw'

// quotes-orders
import rfqFlowEn from '../../../../content/docs/en/quotes-orders/rfq-flow.md?raw'
import rfqFlowAr from '../../../../content/docs/ar/quotes-orders/rfq-flow.md?raw'
import quoteLifecycleEn from '../../../../content/docs/en/quotes-orders/quote-lifecycle.md?raw'
import quoteLifecycleAr from '../../../../content/docs/ar/quotes-orders/quote-lifecycle.md?raw'
import orderManagementEn from '../../../../content/docs/en/quotes-orders/order-management.md?raw'
import orderManagementAr from '../../../../content/docs/ar/quotes-orders/order-management.md?raw'
import changeOrdersEn from '../../../../content/docs/en/quotes-orders/change-orders.md?raw'
import changeOrdersAr from '../../../../content/docs/ar/quotes-orders/change-orders.md?raw'

// customer-portal
import dashboardEn from '../../../../content/docs/en/customer-portal/dashboard.md?raw'
import dashboardAr from '../../../../content/docs/ar/customer-portal/dashboard.md?raw'
import projectsEn from '../../../../content/docs/en/customer-portal/projects.md?raw'
import projectsAr from '../../../../content/docs/ar/customer-portal/projects.md?raw'
import quoteManagementEn from '../../../../content/docs/en/customer-portal/quote-management.md?raw'
import quoteManagementAr from '../../../../content/docs/ar/customer-portal/quote-management.md?raw'
import orderTrackingEn from '../../../../content/docs/en/customer-portal/order-tracking.md?raw'
import orderTrackingAr from '../../../../content/docs/ar/customer-portal/order-tracking.md?raw'

// supplier-portal
import publishingCatalogEn from '../../../../content/docs/en/supplier-portal/publishing-catalog.md?raw'
import publishingCatalogAr from '../../../../content/docs/ar/supplier-portal/publishing-catalog.md?raw'
import managingPricesEn from '../../../../content/docs/en/supplier-portal/managing-prices.md?raw'
import managingPricesAr from '../../../../content/docs/ar/supplier-portal/managing-prices.md?raw'
import purchaseOrdersEn from '../../../../content/docs/en/supplier-portal/purchase-orders.md?raw'
import purchaseOrdersAr from '../../../../content/docs/ar/supplier-portal/purchase-orders.md?raw'
import deliveryFulfillmentEn from '../../../../content/docs/en/supplier-portal/delivery-fulfillment.md?raw'
import deliveryFulfillmentAr from '../../../../content/docs/ar/supplier-portal/delivery-fulfillment.md?raw'

// delivery
import schedulingDispatchEn from '../../../../content/docs/en/delivery/scheduling-dispatch.md?raw'
import schedulingDispatchAr from '../../../../content/docs/ar/delivery/scheduling-dispatch.md?raw'
import trackingDeliveriesEn from '../../../../content/docs/en/delivery/tracking-deliveries.md?raw'
import trackingDeliveriesAr from '../../../../content/docs/ar/delivery/tracking-deliveries.md?raw'
import deliveryWindowsEn from '../../../../content/docs/en/delivery/delivery-windows.md?raw'
import deliveryWindowsAr from '../../../../content/docs/ar/delivery/delivery-windows.md?raw'
import proofOfDeliveryEn from '../../../../content/docs/en/delivery/proof-of-delivery.md?raw'
import proofOfDeliveryAr from '../../../../content/docs/ar/delivery/proof-of-delivery.md?raw'

// payments
import paymentMethodsEn from '../../../../content/docs/en/payments/payment-methods.md?raw'
import paymentMethodsAr from '../../../../content/docs/ar/payments/payment-methods.md?raw'
import invoicingEn from '../../../../content/docs/en/payments/invoicing.md?raw'
import invoicingAr from '../../../../content/docs/ar/payments/invoicing.md?raw'
import etaComplianceEn from '../../../../content/docs/en/payments/eta-compliance.md?raw'
import etaComplianceAr from '../../../../content/docs/ar/payments/eta-compliance.md?raw'
import creditTermsEn from '../../../../content/docs/en/payments/credit-terms.md?raw'
import creditTermsAr from '../../../../content/docs/ar/payments/credit-terms.md?raw'

// ai-lyon
import aiAssistantEn from '../../../../content/docs/en/ai-lyon/ai-assistant.md?raw'
import aiAssistantAr from '../../../../content/docs/ar/ai-lyon/ai-assistant.md?raw'
import aiQuotingEn from '../../../../content/docs/en/ai-lyon/ai-quoting.md?raw'
import aiQuotingAr from '../../../../content/docs/ar/ai-lyon/ai-quoting.md?raw'
import aiRecommendationsEn from '../../../../content/docs/en/ai-lyon/ai-recommendations.md?raw'
import aiRecommendationsAr from '../../../../content/docs/ar/ai-lyon/ai-recommendations.md?raw'

// driver-app
import gettingStartedDriverEn from '../../../../content/docs/en/driver-app/getting-started-driver.md?raw'
import gettingStartedDriverAr from '../../../../content/docs/ar/driver-app/getting-started-driver.md?raw'
import deliveryOperationsEn from '../../../../content/docs/en/driver-app/delivery-operations.md?raw'
import deliveryOperationsAr from '../../../../content/docs/ar/driver-app/delivery-operations.md?raw'
import offlineModeEn from '../../../../content/docs/en/driver-app/offline-mode.md?raw'
import offlineModeAr from '../../../../content/docs/ar/driver-app/offline-mode.md?raw'

// support
import helpChannelsEn from '../../../../content/docs/en/support/help-channels.md?raw'
import helpChannelsAr from '../../../../content/docs/ar/support/help-channels.md?raw'
import faqEn from '../../../../content/docs/en/support/faq.md?raw'
import faqAr from '../../../../content/docs/ar/support/faq.md?raw'
import damagedDeliveryEn from '../../../../content/docs/en/support/damaged-delivery.md?raw'
import damagedDeliveryAr from '../../../../content/docs/ar/support/damaged-delivery.md?raw'

const CONTENT_MAP: Record<string, Record<string, string>> = {
  // platform
  'platform/what-is-hyperquote': { en: whatIsHyperquoteEn, ar: whatIsHyperquoteAr },
  'platform/white-label-model': { en: whiteLabelModelEn, ar: whiteLabelModelAr },
  'platform/order-flow': { en: orderFlowEn, ar: orderFlowAr },
  // website-market
  'website-market/browsing-catalog': { en: browsingCatalogEn, ar: browsingCatalogAr },
  'website-market/search-products': { en: searchProductsEn, ar: searchProductsAr },
  'website-market/product-pages': { en: productPagesEn, ar: productPagesAr },
  // quotes-orders
  'quotes-orders/rfq-flow': { en: rfqFlowEn, ar: rfqFlowAr },
  'quotes-orders/quote-lifecycle': { en: quoteLifecycleEn, ar: quoteLifecycleAr },
  'quotes-orders/order-management': { en: orderManagementEn, ar: orderManagementAr },
  'quotes-orders/change-orders': { en: changeOrdersEn, ar: changeOrdersAr },
  // customer-portal
  'customer-portal/dashboard': { en: dashboardEn, ar: dashboardAr },
  'customer-portal/projects': { en: projectsEn, ar: projectsAr },
  'customer-portal/quote-management': { en: quoteManagementEn, ar: quoteManagementAr },
  'customer-portal/order-tracking': { en: orderTrackingEn, ar: orderTrackingAr },
  // supplier-portal
  'supplier-portal/publishing-catalog': { en: publishingCatalogEn, ar: publishingCatalogAr },
  'supplier-portal/managing-prices': { en: managingPricesEn, ar: managingPricesAr },
  'supplier-portal/purchase-orders': { en: purchaseOrdersEn, ar: purchaseOrdersAr },
  'supplier-portal/delivery-fulfillment': { en: deliveryFulfillmentEn, ar: deliveryFulfillmentAr },
  // delivery
  'delivery/scheduling-dispatch': { en: schedulingDispatchEn, ar: schedulingDispatchAr },
  'delivery/tracking-deliveries': { en: trackingDeliveriesEn, ar: trackingDeliveriesAr },
  'delivery/delivery-windows': { en: deliveryWindowsEn, ar: deliveryWindowsAr },
  'delivery/proof-of-delivery': { en: proofOfDeliveryEn, ar: proofOfDeliveryAr },
  // payments
  'payments/payment-methods': { en: paymentMethodsEn, ar: paymentMethodsAr },
  'payments/invoicing': { en: invoicingEn, ar: invoicingAr },
  'payments/eta-compliance': { en: etaComplianceEn, ar: etaComplianceAr },
  'payments/credit-terms': { en: creditTermsEn, ar: creditTermsAr },
  // ai-lyon
  'ai-lyon/ai-assistant': { en: aiAssistantEn, ar: aiAssistantAr },
  'ai-lyon/ai-quoting': { en: aiQuotingEn, ar: aiQuotingAr },
  'ai-lyon/ai-recommendations': { en: aiRecommendationsEn, ar: aiRecommendationsAr },
  // driver-app
  'driver-app/getting-started-driver': { en: gettingStartedDriverEn, ar: gettingStartedDriverAr },
  'driver-app/delivery-operations': { en: deliveryOperationsEn, ar: deliveryOperationsAr },
  'driver-app/offline-mode': { en: offlineModeEn, ar: offlineModeAr },
  // support
  'support/help-channels': { en: helpChannelsEn, ar: helpChannelsAr },
  'support/faq': { en: faqEn, ar: faqAr },
  'support/damaged-delivery': { en: damagedDeliveryEn, ar: damagedDeliveryAr },
}

export const Route = createFileRoute('/_website/docs/$categorySlug/$articleSlug')({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.articleSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} \u2014 Docs \u2014 HyperQuote`,
      },
    ],
  }),
  component: ArticlePage,
})

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
}

function ArticlePage() {
  const { t, i18n } = useTranslation('website')
  const { categorySlug, articleSlug } = useParams({
    from: '/_website/docs/$categorySlug/$articleSlug',
  })
  const navigate = useNavigate()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const contentKey = `${categorySlug}/${articleSlug}`
  const markdown = CONTENT_MAP[contentKey]?.[locale] ?? CONTENT_MAP[contentKey]?.en ?? ''

  const match = findArticle(categorySlug, articleSlug)
  if (!match) {
    navigate({ to: '/docs' })
    return null
  }

  const { category, article } = match
  const adjacent = getAdjacentArticles(categorySlug, articleSlug)
  const headings = useMemo(() => extractHeadings(markdown), [markdown])

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* Mobile sidebar trigger */}
      <div className="md:hidden mb-8">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-muted)]"
        >
          <Menu size={16} />
          {t('docs.browseAll', { defaultValue: 'Browse all topics' })}
        </button>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="flex gap-12 lg:gap-16"
      >
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar
            activeCategorySlug={categorySlug}
            activeArticleSlug={articleSlug}
          />
        </div>

        {/* Article */}
        <ArticleRenderer
          markdown={markdown}
          articleTitle={t(article.titleKey, { defaultValue: displayName(article.titleKey) })}
          categorySlug={categorySlug}
          articleSlug={articleSlug}
          prev={adjacent.prev}
          next={adjacent.next}
        />

        {/* TOC — uses raw text instead of i18n keys */}
        <TableOfContentsRaw headings={headings} />
      </motion.div>

      {/* Mobile sidebar */}
      {isMobileSidebarOpen && (
        <ModalOverlay
          isOpen={isMobileSidebarOpen}
          onOpenChange={(open) => { if (!open) setIsMobileSidebarOpen(false) }}
          isDismissable
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        >
          <Modal className="fixed inset-x-0 bottom-0 z-50">
            <Dialog
              aria-label={t('docs.sidebarMenu', { defaultValue: 'Documentation menu' })}
              className="bg-[var(--color-base)] rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto outline-none"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-4" />
              <DocsSidebar
                activeCategorySlug={categorySlug}
                activeArticleSlug={articleSlug}
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}

/**
 * TOC variant that displays raw text (from markdown headings)
 * instead of looking up i18n keys.
 */
function TableOfContentsRaw({ headings }: { headings: ExtractedHeading[] }) {
  const { t } = useTranslation('website')
  const [activeId, setActiveId] = useState('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length === 0) return
    observerRef.current?.disconnect()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    )
    observerRef.current = observer
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <aside className="hidden xl:block w-44 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-3">
        {t('docs.toc.label', { defaultValue: 'On this page' })}
      </p>
      <ul className="space-y-0.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`relative block text-[13px] leading-snug py-1 transition-colors duration-150 ${
                h.level === 3 ? 'ps-4' : 'ps-0'
              } ${
                activeId === h.id
                  ? 'text-[var(--color-text)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
