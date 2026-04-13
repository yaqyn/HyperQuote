import { useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { WIZARDS, DOC_CATEGORIES, displayName } from '../../content/registry'
import { getAllContent } from '../../content/docs'
import { SearchDropdown, type SearchEntry } from '../shared/SearchDropdown'

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
}

function findMatchHeading(rawMd: string, query: string): string | null {
  if (!rawMd || !query) return null
  const lower = rawMd.toLowerCase()
  const matchIdx = lower.indexOf(query.toLowerCase())
  if (matchIdx === -1) return null

  const headingRegex = /^## (.+)$/gm
  let lastHeading: string | null = null
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(rawMd)) !== null) {
    if (match.index > matchIdx) break
    lastHeading = match[1].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim()
  }
  return lastHeading
}

interface DocsSearchProps {
  onAskLyon?: (query: string) => void
}

export function DocsSearch({ onAskLyon }: DocsSearchProps = {}) {
  const { t } = useTranslation('website')
  const navigate = useNavigate()

  const { items, rawContentMap } = useMemo(() => {
    const entries: SearchEntry[] = []
    const rawMap = new Map<string, string>()

    for (const w of WIZARDS) {
      entries.push({
        id: `guide-${w.slug}`,
        title: t(w.titleKey, { defaultValue: displayName(w.titleKey) }),
        subtitle: t('docs.guides', { defaultValue: 'Guides' }),
        body: t(w.descriptionKey, { defaultValue: displayName(w.descriptionKey) }),
        href: `/docs/guide/${w.slug}`,
      })
    }

    const allContent = getAllContent()
    for (const c of allContent) {
      rawMap.set(`${c.categorySlug}/${c.articleSlug}`, c.content)
    }

    for (const cat of DOC_CATEGORIES) {
      for (const article of cat.articles) {
        const key = `${cat.slug}/${article.slug}`
        entries.push({
          id: key,
          title: t(article.titleKey, { defaultValue: displayName(article.titleKey) }),
          subtitle: t(cat.titleKey, { defaultValue: displayName(cat.titleKey) }),
          body: stripMarkdown(rawMap.get(key) ?? ''),
          href: `/docs/${cat.slug}/${article.slug}`,
        })
      }
    }

    return { items: entries, rawContentMap: rawMap }
  }, [t])

  const handleSelect = useCallback(
    (item: SearchEntry, query: string) => {
      const rawMd = rawContentMap.get(item.id)
      const headingId = rawMd ? findMatchHeading(rawMd, query) : null

      if (item.href) {
        if (headingId) {
          navigate({ to: item.href, hash: headingId })
        } else {
          navigate({ to: item.href })
        }
      }
    },
    [navigate, rawContentMap],
  )

  return (
    <SearchDropdown
      items={items}
      placeholder={t('docs.searchPlaceholder')}
      askLyonLabel={t('chat.header')}
      onSelect={handleSelect}
      onAskLyon={onAskLyon}
      className="max-w-[480px]"
      idPrefix="docs-search"
    />
  )
}
