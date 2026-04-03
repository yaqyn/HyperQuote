/**
 * Auto-discovered markdown content index.
 * Uses Vite's import.meta.glob to eagerly load all .md files at build time.
 * Adding/removing/editing a .md file automatically updates the index — zero manual imports.
 */

// Import all markdown as raw text using Vite's ?raw suffix
// The glob pattern discovers every .md file; eager: true loads them at build time
const enRaw: Record<string, string> = {}
const arRaw: Record<string, string> = {}

// Build the content maps from glob imports
const enGlob = import.meta.glob('./en/**/*.md', { eager: true, query: '?raw', import: 'default' })
const arGlob = import.meta.glob('./ar/**/*.md', { eager: true, query: '?raw', import: 'default' })

for (const [path, val] of Object.entries(enGlob)) {
  enRaw[path] = typeof val === 'string' ? val : String(val ?? '')
}
for (const [path, val] of Object.entries(arGlob)) {
  arRaw[path] = typeof val === 'string' ? val : String(val ?? '')
}

// Fallback: if ?raw glob returned empty strings, try without query
// (some Vite + TanStack Start configs handle .md differently)
let enContent = enRaw
let arContent = arRaw

const enGlobFallback = import.meta.glob('./en/**/*.md', { eager: true })
const arGlobFallback = import.meta.glob('./ar/**/*.md', { eager: true })

// Check if the ?raw approach worked by testing the first entry
const firstEnVal = Object.values(enRaw)[0]
if (!firstEnVal || firstEnVal === '[object Object]' || firstEnVal === 'undefined') {
  // Fallback: extract from module default export
  const enFallback: Record<string, string> = {}
  const arFallback: Record<string, string> = {}

  for (const [path, mod] of Object.entries(enGlobFallback)) {
    const m = mod as any
    enFallback[path] = typeof m === 'string' ? m : typeof m?.default === 'string' ? m.default : ''
  }
  for (const [path, mod] of Object.entries(arGlobFallback)) {
    const m = mod as any
    arFallback[path] = typeof m === 'string' ? m : typeof m?.default === 'string' ? m.default : ''
  }

  enContent = enFallback
  arContent = arFallback
}

/**
 * Get markdown content for an article by category/slug and locale.
 * Falls back to English if Arabic not available.
 */
export function getContent(categorySlug: string, articleSlug: string, locale: 'en' | 'ar'): string {
  const enKey = `./en/${categorySlug}/${articleSlug}.md`
  const arKey = `./ar/${categorySlug}/${articleSlug}.md`

  if (locale === 'ar' && arContent[arKey]) {
    return arContent[arKey]
  }
  return enContent[enKey] ?? ''
}

/**
 * Get all English content for search indexing.
 */
export function getAllContent(): Array<{ categorySlug: string; articleSlug: string; content: string }> {
  const results: Array<{ categorySlug: string; articleSlug: string; content: string }> = []

  for (const [path, content] of Object.entries(enContent)) {
    const match = path.match(/^\.\/en\/([^/]+)\/([^/]+)\.md$/)
    if (match && content) {
      results.push({
        categorySlug: match[1],
        articleSlug: match[2],
        content,
      })
    }
  }

  return results
}
