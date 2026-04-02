import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Lexer } from 'marked'
import type { Token, Tokens } from 'marked'
import { AskLyonPill } from './AskLyonPill'

interface ArticleRendererProps {
  markdown: string
  articleTitle: string
  categorySlug: string
  articleSlug: string
  prev: { slug: string; categorySlug: string; titleKey: string } | null
  next: { slug: string; categorySlug: string; titleKey: string } | null
}

export interface ExtractedHeading {
  id: string
  level: 2 | 3
  text: string
}

/** Parse markdown and extract headings for TOC */
export function extractHeadings(markdown: string): ExtractedHeading[] {
  const tokens = Lexer.lex(markdown)
  const headings: ExtractedHeading[] = []
  for (const token of tokens) {
    if (token.type === 'heading' && (token.depth === 2 || token.depth === 3)) {
      headings.push({
        id: slugify(token.text),
        level: token.depth as 2 | 3,
        text: token.text,
      })
    }
  }
  return headings
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

export function ArticleRenderer({
  markdown,
  articleTitle,
  categorySlug,
  articleSlug,
  prev,
  next,
}: ArticleRendererProps) {
  const { t } = useTranslation('website')

  const elements = useMemo(() => {
    const tokens = Lexer.lex(markdown)
    let isFirstParagraph = true
    let headingCounter = 0

    return tokens.map((token, idx) => renderToken(token, idx))

    function renderToken(token: Token, idx: number): React.ReactNode {
      switch (token.type) {
        case 'heading': {
          const heading = token as Tokens.Heading
          const id = slugify(heading.text)
          const Tag = `h${heading.depth}` as 'h2' | 'h3' | 'h4'

          if (heading.depth === 2) {
            headingCounter++
            return (
              <div key={idx} id={id} className="scroll-mt-24 mb-4 mt-12 first:mt-0">
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
                      {String(headingCounter).padStart(2, '0')}
                    </span>
                    <Tag className="text-[18px] font-semibold tracking-[-0.01em]">
                      {heading.text}
                    </Tag>
                  </div>
                  <AskLyonPill
                    context={`Tell me about "${heading.text}" in ${articleTitle}`}
                  />
                </div>
              </div>
            )
          }

          return (
            <Tag
              key={idx}
              id={id}
              className="scroll-mt-24 text-[16px] font-semibold mt-8 mb-3"
            >
              {heading.text}
            </Tag>
          )
        }

        case 'paragraph': {
          const para = token as Tokens.Paragraph
          if (isFirstParagraph) {
            isFirstParagraph = false
            return (
              <p
                key={idx}
                className="drop-cap text-[15px] leading-[1.85] text-[var(--color-text-muted)] mb-5"
              >
                {renderInline(para.tokens)}
              </p>
            )
          }
          return (
            <p
              key={idx}
              className="text-[15px] leading-[1.85] text-[var(--color-text-muted)] mb-5"
            >
              {renderInline(para.tokens)}
            </p>
          )
        }

        case 'list': {
          const list = token as Tokens.List
          const Tag = list.ordered ? 'ol' : 'ul'
          return (
            <Tag
              key={idx}
              className={`mb-5 space-y-2 ${
                list.ordered
                  ? 'list-decimal ps-6'
                  : 'list-disc ps-6'
              } text-[15px] leading-[1.85] text-[var(--color-text-muted)]`}
            >
              {list.items.map((item: Tokens.ListItem, i: number) => (
                <li key={i}>{renderInline(item.tokens)}</li>
              ))}
            </Tag>
          )
        }

        case 'blockquote': {
          const bq = token as Tokens.Blockquote
          return (
            <blockquote
              key={idx}
              className="border-s-2 border-[var(--color-primary)]/30 ps-4 py-2 mb-5 text-[14px] text-[var(--color-text-muted)] leading-relaxed"
            >
              {bq.tokens.map((t, i) => renderToken(t, i))}
            </blockquote>
          )
        }

        case 'code': {
          const code = token as Tokens.Code
          return (
            <pre
              key={idx}
              className="bg-[var(--color-surface)] border border-[var(--color-text)]/[0.06] rounded-lg p-4 mb-5 overflow-x-auto"
            >
              <code className="font-[family-name:var(--font-mono)] text-[13px] leading-relaxed">
                {code.text}
              </code>
            </pre>
          )
        }

        case 'hr':
          return (
            <hr key={idx} className="my-10 border-0 h-px bg-[var(--color-text)] opacity-[0.07]" />
          )

        case 'space':
          return null

        default:
          return null
      }
    }

    function renderInline(tokens: Token[] | undefined): React.ReactNode {
      if (!tokens) return null
      return tokens.map((token, i) => {
        switch (token.type) {
          case 'text':
            return <span key={i}>{(token as Tokens.Text).text}</span>
          case 'strong':
            return (
              <strong key={i} className="font-semibold text-[var(--color-text)]">
                {renderInline((token as Tokens.Strong).tokens)}
              </strong>
            )
          case 'em':
            return <em key={i}>{renderInline((token as Tokens.Em).tokens)}</em>
          case 'codespan':
            return (
              <code
                key={i}
                className="font-[family-name:var(--font-mono)] text-[13px] bg-[var(--color-surface)] px-1.5 py-0.5 rounded"
              >
                {(token as Tokens.Codespan).text}
              </code>
            )
          case 'link': {
            const link = token as Tokens.Link
            return (
              <a
                key={i}
                href={link.href}
                className="text-[var(--color-primary)] hover:opacity-70 transition-opacity underline underline-offset-2"
              >
                {renderInline(link.tokens)}
              </a>
            )
          }
          default:
            if ('raw' in token) return <span key={i}>{(token as any).raw}</span>
            return null
        }
      })
    }
  }, [markdown, articleTitle])

  return (
    <article className="flex-1 min-w-0 max-w-[680px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-subtle)] mb-6">
        <Link to="/docs" className="hover:text-[var(--color-text)] transition-colors">
          {t('nav.docs')}
        </Link>
        <span className="opacity-40">/</span>
        <Link
          to="/docs/$categorySlug"
          params={{ categorySlug }}
          className="hover:text-[var(--color-text)] transition-colors"
        >
          {t(`docs.category.${categorySlug}.title`, { defaultValue: categorySlug })}
        </Link>
      </div>

      {/* Title */}
      <h1
        className="font-bold tracking-[-0.03em] leading-[1.1] mb-6"
        style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}
      >
        {articleTitle}
      </h1>

      {/* Divider */}
      <div className="mb-10 h-px bg-[var(--color-text)] opacity-[0.07]" />

      {/* Content */}
      {elements}

      {/* Bottom navigation */}
      <div className="mt-16 pt-8 border-t border-[var(--color-text)]/[0.07]">
        <div className="flex items-stretch justify-between gap-4">
          {prev ? (
            <Link
              to="/docs/$categorySlug/$articleSlug"
              params={{ categorySlug: prev.categorySlug, articleSlug: prev.slug }}
              className="group flex flex-col items-start text-start"
            >
              <span className="text-[11px] text-[var(--color-text-subtle)] mb-1">
                {t('docs.nav.previous', { defaultValue: 'Previous' })}
              </span>
              <span className="text-[14px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
                {t(prev.titleKey, { defaultValue: prev.slug })}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {next && (
            <Link
              to="/docs/$categorySlug/$articleSlug"
              params={{ categorySlug: next.categorySlug, articleSlug: next.slug }}
              className="group flex flex-col items-end text-end"
            >
              <span className="text-[11px] text-[var(--color-text-subtle)] mb-1">
                {t('docs.nav.next', { defaultValue: 'Next' })}
              </span>
              <span className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
                {t(next.titleKey, { defaultValue: next.slug })}
                <ArrowRight size={14} className="icon-end" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
