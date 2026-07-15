import { checkRateLimit } from '@hyperquote/auth/rate-limit'
import {
	buildDetailedQuoteLocationName,
	type QuoteLocationSearchResult,
} from '@hyperquote/quote-cart/checkout'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './_supabase'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const NOMINATIM_USER_AGENT =
	'HyperQuote/1.0 (+https://www.hyperquote.net; contact: support@hyperquote.net)'
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_LIMIT = 120

const searchInput = z.object({
	locale: z.enum(['ar', 'en']),
	query: z.string().trim().min(3).max(180),
})

const reverseInput = z.object({
	latitude: z.number().min(21.7).max(31.8),
	locale: z.enum(['ar', 'en']),
	longitude: z.number().min(24.6).max(36.9),
})

const addressSchema = z.record(z.string(), z.string()).default({})
const searchRowSchema = z.object({
	address: addressSchema,
	display_name: z.string().min(1),
	lat: z.string(),
	lon: z.string(),
	place_id: z.union([z.number(), z.string()]),
})
const reverseRowSchema = searchRowSchema
	.omit({ place_id: true })
	.extend({ place_id: z.union([z.number(), z.string()]).optional() })

interface CacheEntry<T> {
	expiresAt: number
	value: T
}

const searchCache = new Map<string, CacheEntry<QuoteLocationSearchResult[]>>()
const reverseCache = new Map<
	string,
	CacheEntry<{ ar: QuoteLocationSearchResult; en: QuoteLocationSearchResult }>
>()

function readCache<T>(
	cache: Map<string, CacheEntry<T>>,
	key: string,
): T | null {
	const entry = cache.get(key)
	if (!entry) return null
	if (entry.expiresAt <= Date.now()) {
		cache.delete(key)
		return null
	}
	return entry.value
}

function writeCache<T>(
	cache: Map<string, CacheEntry<T>>,
	key: string,
	value: T,
) {
	if (cache.size >= CACHE_LIMIT) {
		const oldestKey = cache.keys().next().value
		if (typeof oldestKey === 'string') cache.delete(oldestKey)
	}
	cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value })
}

function requestIp(): string {
	const request = getRequest()
	return (
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	)
}

async function allowRequest(): Promise<boolean> {
	const appLimit = await checkRateLimit({
		key: 'nominatim:global',
		limit: 1,
		windowSeconds: 1,
	})
	if (!appLimit.allowed) return false
	const clientLimit = await checkRateLimit({
		key: `portal:osm-geocode:${requestIp()}`,
		limit: 20,
		windowSeconds: 60,
	})
	return clientLimit.allowed
}

async function fetchNominatim(url: URL): Promise<unknown> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 8000)
	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				Referer: 'https://portal.hyperquote.net/',
				'User-Agent': NOMINATIM_USER_AGENT,
			},
			signal: controller.signal,
		})
		if (!response.ok) throw new Error(`Nominatim returned ${response.status}`)
		return await response.json()
	} finally {
		clearTimeout(timeout)
	}
}

function firstAddressValue(
	address: Record<string, string>,
	keys: string[],
): string {
	for (const key of keys) {
		const value = address[key]?.trim()
		if (value) return value
	}
	return ''
}

export function toPortalQuoteLocationResult(
	row: z.infer<typeof searchRowSchema>,
): QuoteLocationSearchResult | null {
	const latitude = Number(row.lat)
	const longitude = Number(row.lon)
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

	const road = firstAddressValue(row.address, [
		'road',
		'pedestrian',
		'residential',
		'quarter',
	])
	const houseNumber = firstAddressValue(row.address, ['house_number'])
	const fallbackStreet = row.display_name.split(',')[0]?.trim() ?? ''
	const city = firstAddressValue(row.address, [
		'city',
		'town',
		'village',
		'municipality',
		'county',
	])
	const governorate = firstAddressValue(row.address, [
		'state',
		'state_district',
		'province',
	])

	return {
		area: firstAddressValue(row.address, [
			'suburb',
			'neighbourhood',
			'city_district',
			'borough',
		]),
		city: city || governorate,
		displayName: row.display_name,
		governorate: governorate || city,
		id: String(row.place_id ?? `${latitude}:${longitude}`),
		latitude,
		locationName: buildDetailedQuoteLocationName(row.address, row.display_name),
		longitude,
		street: [houseNumber, road].filter(Boolean).join(' ') || fallbackStreet,
	}
}

async function fetchPortalReverseLocation(
	input: z.infer<typeof reverseInput>,
	locale: 'ar' | 'en',
): Promise<QuoteLocationSearchResult> {
	const url = new URL('/reverse', NOMINATIM_BASE)
	url.searchParams.set('format', 'jsonv2')
	url.searchParams.set('addressdetails', '1')
	url.searchParams.set('namedetails', '1')
	url.searchParams.set('accept-language', locale)
	url.searchParams.set('zoom', '18')
	url.searchParams.set('lat', String(input.latitude))
	url.searchParams.set('lon', String(input.longitude))
	const parsed = reverseRowSchema.safeParse(await fetchNominatim(url))
	if (!parsed.success) throw parsed.error
	const result = toPortalQuoteLocationResult({
		...parsed.data,
		place_id: parsed.data.place_id ?? `${input.latitude}:${input.longitude}`,
	})
	if (!result) throw new Error('Invalid location response')
	return result
}

export const searchPortalQuoteLocations = createServerFn({ method: 'POST' })
	.inputValidator(searchInput)
	.handler(async ({ data: input }) => {
		await getAuthenticatedPortalCustomer()
		const cacheKey = `search:${input.locale}:${input.query.toLowerCase()}`
		const cached = readCache(searchCache, cacheKey)
		if (cached) return { success: true as const, results: cached }
		if (!(await allowRequest())) {
			return { success: false as const, error: 'rate_limited' as const }
		}

		try {
			const url = new URL('/search', NOMINATIM_BASE)
			url.searchParams.set('format', 'jsonv2')
			url.searchParams.set('addressdetails', '1')
			url.searchParams.set('countrycodes', 'eg')
			url.searchParams.set('accept-language', input.locale)
			url.searchParams.set('limit', '5')
			url.searchParams.set('q', input.query)
			const parsed = z
				.array(searchRowSchema)
				.safeParse(await fetchNominatim(url))
			if (!parsed.success) throw parsed.error
			const results = parsed.data.flatMap((row) => {
				const result = toPortalQuoteLocationResult(row)
				return result ? [result] : []
			})
			writeCache(searchCache, cacheKey, results)
			return { success: true as const, results }
		} catch {
			return { success: false as const, error: 'search_failed' as const }
		}
	})

export const reversePortalQuoteLocation = createServerFn({ method: 'POST' })
	.inputValidator(reverseInput)
	.handler(async ({ data: input }) => {
		await getAuthenticatedPortalCustomer()
		const cacheKey = `reverse:${input.latitude.toFixed(5)}:${input.longitude.toFixed(5)}`
		const cached = readCache(reverseCache, cacheKey)
		if (cached) {
			return {
				success: true as const,
				result: cached[input.locale],
				locationName: cached.en.locationName,
				locationNameAr: cached.ar.locationName,
			}
		}
		if (!(await allowRequest())) {
			return { success: false as const, error: 'rate_limited' as const }
		}

		try {
			const primary = await fetchPortalReverseLocation(input, input.locale)
			await new Promise((resolve) => setTimeout(resolve, 1050))
			const secondaryLocale = input.locale === 'ar' ? 'en' : 'ar'
			const secondary = await fetchPortalReverseLocation(input, secondaryLocale)
			const locations =
				input.locale === 'ar'
					? { ar: primary, en: secondary }
					: { ar: secondary, en: primary }
			writeCache(reverseCache, cacheKey, locations)
			return {
				success: true as const,
				result: primary,
				locationName: locations.en.locationName,
				locationNameAr: locations.ar.locationName,
			}
		} catch {
			return { success: false as const, error: 'search_failed' as const }
		}
	})
