import { checkRateLimit } from '@hyperquote/auth/rate-limit'
import type {
	QuoteLocationSearchResult,
	QuoteRequestAddress,
} from '@hyperquote/quote-cart/checkout'
import { buildDetailedQuoteLocationName } from '@hyperquote/quote-cart/checkout'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
	appendWebsiteAuthCookies,
	getAuthenticatedWebsiteCustomer,
} from './customer-auth-context'
import { logWebsiteServerError } from './server-log'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const NOMINATIM_USER_AGENT =
	'HyperQuote/1.0 (+https://www.hyperquote.net; contact: support@hyperquote.net)'
const GEOCODE_CACHE_TTL_MS = 10 * 60 * 1000
const GEOCODE_CACHE_LIMIT = 120

const locationSearchInput = z.object({
	locale: z.enum(['ar', 'en']),
	query: z.string().trim().min(3).max(180),
})

const reverseLocationInput = z.object({
	latitude: z.number().min(21.7).max(31.8),
	locale: z.enum(['ar', 'en']),
	longitude: z.number().min(24.6).max(36.9),
})

const createAddressInput = z.object({
	area: z.string().trim().max(160),
	city: z.string().trim().min(1).max(160),
	governorate: z.string().trim().min(1).max(160),
	latitude: z.number().min(21.7).max(31.8),
	longitude: z.number().min(24.6).max(36.9),
	street: z.string().trim().min(2).max(300),
})

const nominatimAddressSchema = z.record(z.string(), z.string()).default({})
const nominatimSearchRowSchema = z.object({
	address: nominatimAddressSchema,
	display_name: z.string().min(1),
	lat: z.string(),
	lon: z.string(),
	place_id: z.union([z.number(), z.string()]),
})
const nominatimReverseSchema = nominatimSearchRowSchema
	.omit({ place_id: true })
	.extend({ place_id: z.union([z.number(), z.string()]).optional() })

interface GeocodeCacheEntry<T> {
	expiresAt: number
	value: T
}

const searchCache = new Map<
	string,
	GeocodeCacheEntry<QuoteLocationSearchResult[]>
>()
const reverseCache = new Map<
	string,
	GeocodeCacheEntry<{
		ar: QuoteLocationSearchResult
		en: QuoteLocationSearchResult
	}>
>()

function readGeocodeCache<T>(
	cache: Map<string, GeocodeCacheEntry<T>>,
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

function writeGeocodeCache<T>(
	cache: Map<string, GeocodeCacheEntry<T>>,
	key: string,
	value: T,
) {
	if (cache.size >= GEOCODE_CACHE_LIMIT) {
		const oldestKey = cache.keys().next().value
		if (typeof oldestKey === 'string') cache.delete(oldestKey)
	}
	cache.set(key, {
		expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
		value,
	})
}

function requestIp(): string {
	const request = getRequest()
	return (
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	)
}

async function allowGeocodingRequest(): Promise<boolean> {
	const appLimit = await checkRateLimit({
		key: 'nominatim:global',
		limit: 1,
		windowSeconds: 1,
	})
	if (!appLimit.allowed) return false

	const clientLimit = await checkRateLimit({
		key: `website:osm-geocode:${requestIp()}`,
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
				Referer: 'https://www.hyperquote.net/',
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

export function toWebsiteQuoteLocationResult(
	row: z.infer<typeof nominatimSearchRowSchema>,
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
	const street = [houseNumber, road].filter(Boolean).join(' ') || fallbackStreet
	const area = firstAddressValue(row.address, [
		'suburb',
		'neighbourhood',
		'city_district',
		'borough',
	])
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
		area,
		city: city || governorate,
		displayName: row.display_name,
		governorate: governorate || city,
		id: String(row.place_id ?? `${latitude}:${longitude}`),
		latitude,
		locationName: buildDetailedQuoteLocationName(row.address, row.display_name),
		longitude,
		street,
	}
}

async function fetchWebsiteReverseLocation(
	input: z.infer<typeof reverseLocationInput>,
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
	const parsed = nominatimReverseSchema.safeParse(await fetchNominatim(url))
	if (!parsed.success) throw parsed.error
	const result = toWebsiteQuoteLocationResult({
		...parsed.data,
		place_id: parsed.data.place_id ?? `${input.latitude}:${input.longitude}`,
	})
	if (!result) throw new Error('Nominatim returned invalid coordinates')
	return result
}

function mapAddressRow(row: {
	area: string | null
	city: string
	governorate: string
	id: string
	is_default: boolean
	label: string | null
	latitude: number | null
	longitude: number | null
	street: string
}): QuoteRequestAddress {
	return {
		area: row.area ?? '',
		city: row.city,
		governorate: row.governorate,
		id: row.id,
		isDefault: row.is_default,
		label: row.label,
		latitude: row.latitude === null ? null : Number(row.latitude),
		longitude: row.longitude === null ? null : Number(row.longitude),
		street: row.street,
	}
}

export const getWebsiteQuoteCheckoutDefaults = createServerFn({
	method: 'GET',
}).handler(
	async (): Promise<
		| {
				success: true
				addresses: QuoteRequestAddress[]
				email: string
				phone: string
		  }
		| {
				success: false
				error: 'customer_required' | 'not_authenticated' | 'not_configured'
		  }
	> => {
		const auth = await getAuthenticatedWebsiteCustomer()
		if ('error' in auth) return { success: false, error: auth.error }

		const [customerResult, addressResult] = await Promise.all([
			auth.client
				.from('customers')
				.select('email, phone')
				.eq('id', auth.customerId)
				.maybeSingle(),
			auth.client
				.from('customer_addresses')
				.select(
					'id, label, street, area, city, governorate, is_default, latitude, longitude',
				)
				.eq('customer_id', auth.customerId)
				.order('is_default', { ascending: false })
				.order('updated_at', { ascending: false }),
		])

		if (customerResult.error) throw customerResult.error
		if (addressResult.error) throw addressResult.error
		await appendWebsiteAuthCookies(auth)

		const confirmedAuthEmail = auth.user.email_confirmed_at
			? (auth.user.email ?? '')
			: ''
		return {
			success: true,
			addresses: (addressResult.data ?? []).map(mapAddressRow),
			email: confirmedAuthEmail || customerResult.data?.email || '',
			phone: customerResult.data?.phone ?? '',
		}
	},
)

export const searchWebsiteQuoteLocations = createServerFn({ method: 'POST' })
	.inputValidator(locationSearchInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| { success: true; results: QuoteLocationSearchResult[] }
			| {
					success: false
					error: 'not_authenticated' | 'rate_limited' | 'search_failed'
			  }
		> => {
			const auth = await getAuthenticatedWebsiteCustomer()
			if ('error' in auth) return { success: false, error: 'not_authenticated' }

			const cacheKey = `search:${input.locale}:${input.query.toLowerCase()}`
			const cached = readGeocodeCache(searchCache, cacheKey)
			if (cached) return { success: true, results: cached }
			if (!(await allowGeocodingRequest())) {
				return { success: false, error: 'rate_limited' }
			}

			try {
				const url = new URL('/search', NOMINATIM_BASE)
				url.searchParams.set('format', 'jsonv2')
				url.searchParams.set('addressdetails', '1')
				url.searchParams.set('countrycodes', 'eg')
				url.searchParams.set('accept-language', input.locale)
				url.searchParams.set('limit', '5')
				url.searchParams.set('q', input.query)
				const payload = await fetchNominatim(url)
				const parsed = z.array(nominatimSearchRowSchema).safeParse(payload)
				if (!parsed.success) throw parsed.error
				const results = parsed.data.flatMap((row) => {
					const result = toWebsiteQuoteLocationResult(row)
					return result ? [result] : []
				})
				writeGeocodeCache(searchCache, cacheKey, results)
				await appendWebsiteAuthCookies(auth)
				return { success: true, results }
			} catch (error) {
				logWebsiteServerError(
					'website.quote_request.location_search_failed',
					error,
				)
				return { success: false, error: 'search_failed' }
			}
		},
	)

export const reverseWebsiteQuoteLocation = createServerFn({ method: 'POST' })
	.inputValidator(reverseLocationInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| {
					success: true
					result: QuoteLocationSearchResult
					locationName: string
					locationNameAr: string
			  }
			| {
					success: false
					error: 'not_authenticated' | 'rate_limited' | 'search_failed'
			  }
		> => {
			const auth = await getAuthenticatedWebsiteCustomer()
			if ('error' in auth) return { success: false, error: 'not_authenticated' }

			const cacheKey = `reverse:${input.latitude.toFixed(5)}:${input.longitude.toFixed(5)}`
			const cached = readGeocodeCache(reverseCache, cacheKey)
			if (cached) {
				return {
					success: true,
					result: cached[input.locale],
					locationName: cached.en.locationName,
					locationNameAr: cached.ar.locationName,
				}
			}
			if (!(await allowGeocodingRequest())) {
				return { success: false, error: 'rate_limited' }
			}

			try {
				const primary = await fetchWebsiteReverseLocation(input, input.locale)
				await new Promise((resolve) => setTimeout(resolve, 1050))
				const secondaryLocale = input.locale === 'ar' ? 'en' : 'ar'
				const secondary = await fetchWebsiteReverseLocation(
					input,
					secondaryLocale,
				)
				const locations =
					input.locale === 'ar'
						? { ar: primary, en: secondary }
						: { ar: secondary, en: primary }
				writeGeocodeCache(reverseCache, cacheKey, locations)
				await appendWebsiteAuthCookies(auth)
				return {
					success: true,
					result: primary,
					locationName: locations.en.locationName,
					locationNameAr: locations.ar.locationName,
				}
			} catch (error) {
				logWebsiteServerError(
					'website.quote_request.location_reverse_failed',
					error,
				)
				return { success: false, error: 'search_failed' }
			}
		},
	)

export const createQuoteRequestAddress = createServerFn({ method: 'POST' })
	.inputValidator(createAddressInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| { success: true; address: QuoteRequestAddress }
			| {
					success: false
					error:
						| 'create_failed'
						| 'not_authenticated'
						| 'customer_required'
						| 'not_configured'
			  }
		> => {
			const auth = await getAuthenticatedWebsiteCustomer()
			if ('error' in auth) return { success: false, error: auth.error }

			try {
				const { data, error } = await auth.client
					.from('customer_addresses')
					.insert({
						area: input.area || null,
						city: input.city,
						customer_id: auth.customerId,
						governorate: input.governorate,
						is_default: false,
						label: null,
						latitude: input.latitude,
						longitude: input.longitude,
						street: input.street,
					})
					.select(
						'id, label, street, area, city, governorate, is_default, latitude, longitude',
					)
					.single()
				if (error || !data) throw error ?? new Error('Address insert failed')
				await appendWebsiteAuthCookies(auth)
				return { success: true, address: mapAddressRow(data) }
			} catch (error) {
				logWebsiteServerError(
					'website.quote_request.address_create_failed',
					error,
				)
				return { success: false, error: 'create_failed' }
			}
		},
	)
