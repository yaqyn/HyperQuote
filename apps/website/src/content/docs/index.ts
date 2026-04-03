/**
 * Auto-discovered markdown content index.
 * Uses Vite's import.meta.glob to eagerly load all .md files at build time.
 * Adding/removing/editing a .md file automatically updates the index.
 */

// Eagerly import all English markdown files as raw strings
const enModules = import.meta.glob('./en/**/*.md', { eager: true, query: '?raw' }) as Record<string, { default: string } | string>

// Eagerly import all Arabic markdown files as raw strings
const arModules = import.meta.glob('./ar/**/*.md', { eager: true, query: '?raw' }) as Record<string, { default: string } | string>

/** Extract string from glob result (handles both { default: string } and raw string) */
function str(val: unknown): string {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object') {
    if ('default' in val && typeof (val as any).default === 'string') return (val as any).default
    // Some Vite versions return the string as the only value
    const values = Object.values(val as Record<string, unknown>)
    if (values.length === 1 && typeof values[0] === 'string') return values[0]
  }
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
    return str(arModules[arKey])
  }
  if (enKey in enModules) {
    return str(enModules[enKey])
  }
  return ''
}

/**
 * Get all English content for search indexing.
 */
export function getAllContent(): Array<{ categorySlug: string; articleSlug: string; content: string }> {
  const results: Array<{ categorySlug: string; articleSlug: string; content: string }> = []

  for (const [path, val] of Object.entries(enModules)) {
    const match = path.match(/^\.\/en\/([^/]+)\/([^/]+)\.md$/)
    if (match) {
      const content = str(val)
      if (content) {
        results.push({
          categorySlug: match[1],
          articleSlug: match[2],
          content,
        })
      }
    }
  }

  return results
}

/**
 * Debug: log what glob actually imported (call from browser console via window.__debugDocsIndex())
 */
if (typeof window !== 'undefined') {
  (window as any).__debugDocsIndex = () => {
    const entries = Object.entries(enModules)
    console.log(`enModules: ${entries.length} entries`)
    for (const [path, val] of entries.slice(0, 3)) {
      console.log(path, typeof val, val && typeof val === 'object' ? Object.keys(val as object) : val?.toString().slice(0, 80))
    }
    const all = getAllContent()
    console.log(`getAllContent: ${all.length} articles`)
    for (const a of all.slice(0, 3)) {
      console.log(`  ${a.categorySlug}/${a.articleSlug}: ${a.content.slice(0, 60)}...`)
    }
  }
}
