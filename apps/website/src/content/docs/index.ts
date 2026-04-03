/**
 * Auto-discovered markdown content index.
 * Uses Vite's import.meta.glob to eagerly load all .md files at build time.
 * Adding/removing/editing a .md file automatically updates the index.
 */

// Eagerly import all English markdown files as raw strings
const enModules = import.meta.glob<string>('./en/**/*.md', { eager: true, query: '?raw', import: 'default' })

// Eagerly import all Arabic markdown files as raw strings
const arModules = import.meta.glob<string>('./ar/**/*.md', { eager: true, query: '?raw', import: 'default' })

/** Safely extract the string content from a glob import result */
function extractString(val: unknown): string {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object' && 'default' in val) return (val as { default: string }).default
  return ''
}

/**
 * Get markdown content for an article by category/slug and locale.
 * Falls back to English if Arabic not available.
 */
export function getContent(categorySlug: string, articleSlug: string, locale: 'en' | 'ar'): string {
  const enKey = `./en/${categorySlug}/${articleSlug}.md`
  const arKey = `./ar/${categorySlug}/${articleSlug}.md`

  if (locale === 'ar' && arKey in arModules) {
    return extractString(arModules[arKey])
  }
  if (enKey in enModules) {
    return extractString(enModules[enKey])
  }
  return ''
}

/**
 * Get all English content for search indexing.
 * Returns array of { categorySlug, articleSlug, content } for every article.
 */
export function getAllContent(): Array<{ categorySlug: string; articleSlug: string; content: string }> {
  const results: Array<{ categorySlug: string; articleSlug: string; content: string }> = []

  for (const [path, val] of Object.entries(enModules)) {
    const match = path.match(/^\.\/en\/([^/]+)\/([^/]+)\.md$/)
    if (match) {
      results.push({
        categorySlug: match[1],
        articleSlug: match[2],
        content: extractString(val),
      })
    }
  }

  return results
}
