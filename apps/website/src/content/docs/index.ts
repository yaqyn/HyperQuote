/**
 * Auto-discovered markdown content index.
 * Uses Vite's import.meta.glob to eagerly load all .md files at build time.
 * Adding/removing/editing a .md file automatically updates the index.
 */

// Eagerly import all English markdown files as raw strings
const enModules = import.meta.glob('./en/**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

// Eagerly import all Arabic markdown files as raw strings
const arModules = import.meta.glob('./ar/**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

/**
 * Get markdown content for an article by category/slug and locale.
 * Falls back to English if Arabic not available.
 *
 * @example getContent('platform', 'what-is-hyperquote', 'en')
 */
export function getContent(categorySlug: string, articleSlug: string, locale: 'en' | 'ar'): string {
  const enKey = `./en/${categorySlug}/${articleSlug}.md`
  const arKey = `./ar/${categorySlug}/${articleSlug}.md`

  if (locale === 'ar' && arModules[arKey]) {
    return arModules[arKey]
  }
  return enModules[enKey] ?? ''
}

/**
 * Get all English content for search indexing.
 * Returns array of { categorySlug, articleSlug, content } for every article.
 */
export function getAllContent(): Array<{ categorySlug: string; articleSlug: string; content: string }> {
  const results: Array<{ categorySlug: string; articleSlug: string; content: string }> = []

  for (const [path, content] of Object.entries(enModules)) {
    // path format: ./en/{categorySlug}/{articleSlug}.md
    const match = path.match(/^\.\/en\/([^/]+)\/([^/]+)\.md$/)
    if (match) {
      results.push({
        categorySlug: match[1],
        articleSlug: match[2],
        content,
      })
    }
  }

  return results
}
