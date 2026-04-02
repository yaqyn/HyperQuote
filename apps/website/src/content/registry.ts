// ── Types ──

export interface WizardStep {
  id: string
  titleKey: string
  bodyKey: string
  illustration: string // key for WizardIllustration
  tip?: string         // optional i18n key for a callout
  link?: { to: string; labelKey: string } // optional CTA linking to a page
}

export interface WizardDef {
  slug: string
  titleKey: string
  descriptionKey: string
  illustration: string
  steps: WizardStep[]
}

export interface DocArticleDef {
  slug: string
  titleKey: string
  descriptionKey: string
}

export interface DocCategoryDef {
  slug: string
  titleKey: string
  articles: DocArticleDef[]
}

// ── Wizard Data ──

// Lazy-loaded to avoid importing all step content upfront.
// Each wizard file exports { steps: WizardStep[] }.
// Import with: const mod = await import('../content/wizards/getting-started')
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
    slug: 'for-suppliers',
    titleKey: 'docs.wizard.for-suppliers.title',
    descriptionKey: 'docs.wizard.for-suppliers.description',
    illustration: 'for-suppliers',
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
        slug: 'white-label-model',
        titleKey: 'docs.article.white-label-model.title',
        descriptionKey: 'docs.article.white-label-model.description',
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
    slug: 'supplier-portal',
    titleKey: 'docs.category.supplier-portal.title',
    articles: [
      {
        slug: 'publishing-catalog',
        titleKey: 'docs.article.publishing-catalog.title',
        descriptionKey: 'docs.article.publishing-catalog.description',
      },
      {
        slug: 'managing-prices',
        titleKey: 'docs.article.managing-prices.title',
        descriptionKey: 'docs.article.managing-prices.description',
      },
      {
        slug: 'purchase-orders',
        titleKey: 'docs.article.purchase-orders.title',
        descriptionKey: 'docs.article.purchase-orders.description',
      },
      {
        slug: 'delivery-fulfillment',
        titleKey: 'docs.article.delivery-fulfillment.title',
        descriptionKey: 'docs.article.delivery-fulfillment.description',
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

/** Get all article slugs across all categories (for search indexing) */
export function getAllArticles(): Array<DocArticleDef & { categorySlug: string }> {
  return DOC_CATEGORIES.flatMap((cat) =>
    cat.articles.map((a) => ({ ...a, categorySlug: cat.slug })),
  )
}

/** Find category + article by slugs */
export function findArticle(categorySlug: string, articleSlug: string) {
  const cat = DOC_CATEGORIES.find((c) => c.slug === categorySlug)
  if (!cat) return null
  const article = cat.articles.find((a) => a.slug === articleSlug)
  if (!article) return null
  return { category: cat, article }
}

/** Find adjacent articles for prev/next navigation */
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
