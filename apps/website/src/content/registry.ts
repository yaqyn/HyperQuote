// ── Types ──

export interface WizardStep {
  id: string
  titleKey: string
  bodyKey: string
  illustration: string // key for WizardIllustration
  tip?: string         // optional i18n key for a callout
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
  // Future: 'for-customers', 'for-suppliers', 'for-drivers'
]

// ── Documentation Categories ──

export const DOC_CATEGORIES: DocCategoryDef[] = [
  {
    slug: 'platform',
    titleKey: 'docs.category.platform.title',
    articles: [
      {
        slug: 'what-is-hyperquote',
        titleKey: 'docs.article.whatIsHyperquote.title',
        descriptionKey: 'docs.article.whatIsHyperquote.description',
      },
    ],
  },
  // Future: 'website-market', 'quotes-orders', 'customer-portal',
  // 'supplier-portal', 'delivery', 'payments', 'ai-lyon', 'driver-app', 'support'
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
