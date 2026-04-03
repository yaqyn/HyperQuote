// Auto-discovered markdown content index.
// Uses Vite import.meta.glob with ?raw to load all .md files as strings at build time.
// Adding/removing/editing a .md file automatically updates — zero manual imports.

const enModules = import.meta.glob('./en/**/*.md', { eager: true, query: '?raw', import: 'default' })
const arModules = import.meta.glob('./ar/**/*.md', { eager: true, query: '?raw', import: 'default' })

function toStr(val: unknown): string {
  if (typeof val === 'string') return val
  return ''
}

export function getContent(categorySlug: string, articleSlug: string, locale: 'en' | 'ar'): string {
  const enKey = `./en/${categorySlug}/${articleSlug}.md`
  const arKey = `./ar/${categorySlug}/${articleSlug}.md`

  if (locale === 'ar' && arKey in arModules) {
    return toStr(arModules[arKey])
  }
  return toStr(enModules[enKey])
}

export function getAllContent(): Array<{ categorySlug: string; articleSlug: string; content: string }> {
  const results: Array<{ categorySlug: string; articleSlug: string; content: string }> = []

  for (const [path, val] of Object.entries(enModules)) {
    const match = path.match(/^\.\/en\/([^/]+)\/([^/]+)\.md$/)
    if (match) {
      const content = toStr(val)
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
