import { createSupabaseServiceRoleClient } from '@hyperquote/auth/server'
import { createFileRoute } from '@tanstack/react-router'
import { DOC_CATEGORIES, WIZARDS } from '../content/registry'

const ORIGIN = 'https://www.hyperquote.net'

interface SitemapEntry {
	changefreq: 'daily' | 'monthly' | 'weekly'
	lastmod?: string
	path: string
	priority: string
}

const STATIC_ENTRIES: SitemapEntry[] = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/about', priority: '0.7', changefreq: 'monthly' },
	{ path: '/market', priority: '0.9', changefreq: 'daily' },
	{ path: '/docs', priority: '0.8', changefreq: 'weekly' },
	{ path: '/support', priority: '0.7', changefreq: 'monthly' },
	{ path: '/careers', priority: '0.4', changefreq: 'monthly' },
	{ path: '/legal/terms', priority: '0.3', changefreq: 'monthly' },
	{ path: '/legal/privacy', priority: '0.3', changefreq: 'monthly' },
]

export const Route = createFileRoute('/sitemap/xml')({
	server: {
		handlers: {
			GET: async () =>
				new Response(await buildSitemapXml(), {
					headers: {
						'Content-Type': 'application/xml; charset=utf-8',
						'Cache-Control': 'public, max-age=3600',
					},
				}),
		},
	},
})

async function buildSitemapXml() {
	const entries = [
		...STATIC_ENTRIES,
		...docsEntries(),
		...(await productEntries()),
	]
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries.map(sitemapEntryXml),
		'</urlset>',
	].join('\n')
}

function docsEntries(): SitemapEntry[] {
	return [
		...DOC_CATEGORIES.map((category) => ({
			path: `/docs/${category.slug}`,
			priority: '0.7',
			changefreq: 'monthly' as const,
		})),
		...DOC_CATEGORIES.flatMap((category) =>
			category.articles.map((article) => ({
				path: `/docs/${category.slug}/${article.slug}`,
				priority: '0.65',
				changefreq: 'monthly' as const,
			})),
		),
		...WIZARDS.map((wizard) => ({
			path: `/docs/guide/${wizard.slug}`,
			priority: '0.65',
			changefreq: 'monthly' as const,
		})),
	]
}

async function productEntries(): Promise<SitemapEntry[]> {
	try {
		const client = await createSupabaseServiceRoleClient(process.env)
		if (!client) return []

		const { data, error } = await client
			.from('products')
			.select('slug, updated_at')
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.order('name', { ascending: true })
			.limit(1000)

		if (error) return []

		return (data ?? [])
			.filter((product) => typeof product.slug === 'string' && product.slug)
			.map((product) => ({
				path: `/market/${product.slug}`,
				priority: '0.75',
				changefreq: 'weekly' as const,
				lastmod:
					typeof product.updated_at === 'string'
						? product.updated_at.slice(0, 10)
						: undefined,
			}))
	} catch {
		return []
	}
}

function sitemapEntryXml(entry: SitemapEntry) {
	return [
		'  <url>',
		`    <loc>${escapeXml(new URL(entry.path, ORIGIN).toString())}</loc>`,
		entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : null,
		`    <changefreq>${entry.changefreq}</changefreq>`,
		`    <priority>${entry.priority}</priority>`,
		'  </url>',
	]
		.filter(Boolean)
		.join('\n')
}

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}
