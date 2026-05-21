// Shared catalog types and taxonomy helpers. Product records themselves are
// runtime data owned by Supabase and managed through the admin app.

import type { Database } from './database.types'

type DbEnum<Name extends keyof Database['public']['Enums']> =
	Database['public']['Enums'][Name]

/** Broad category axis — the 6 categories the website groups by. */
export const BROAD_CATEGORIES = [
	'cement',
	'steel',
	'aggregates',
	'bricks',
	'timber',
	'finishing',
] as const
export type BroadCategory = (typeof BROAD_CATEGORIES)[number]

/**
 * Maps a specific (subcategory-style) category value to one of the 6 broad
 * categories. The DB schema allows richer granularity; the marketing and
 * inventory surfaces roll it up to 6 buckets.
 */
const SPECIFIC_TO_BROAD: Record<string, BroadCategory> = {
	// cement
	cement: 'cement',
	ready_mix_concrete: 'cement',
	// steel + adjacent hardware
	reinforcing_steel: 'steel',
	structural_steel: 'steel',
	aluminum_profiles: 'steel',
	hardware_fasteners: 'steel',
	pipes_pvc: 'steel',
	pipes_metal: 'steel',
	electrical_cable: 'steel',
	electrical_conduit: 'steel',
	// aggregates + stones
	aggregates: 'aggregates',
	sand: 'aggregates',
	marble: 'aggregates',
	granite: 'aggregates',
	// masonry
	bricks: 'bricks',
	blocks: 'bricks',
	// timber & wet-envelope
	lumber: 'timber',
	plywood: 'timber',
	insulation: 'timber',
	waterproofing: 'timber',
	roofing: 'timber',
	// finishing
	tiles_porcelain: 'finishing',
	tiles_ceramic: 'finishing',
	paint: 'finishing',
	glass: 'finishing',
	gypsum_board: 'finishing',
	adhesives: 'finishing',
}

export function getBroadCategory(specific: string): BroadCategory {
	return SPECIFIC_TO_BROAD[specific] ?? 'finishing'
}

export type PriceTier = DbEnum<'price_tier'>
export type AvailabilityStatus = DbEnum<'catalog_availability_status'>

export interface CatalogProduct {
	id: string
	slug: string
	sku: string
	name: string
	name_ar: string
	description: string
	description_ar: string
	category: string
	subcategory: string
	subcategory_ar: string
	brand: string | null
	manufacturer: string
	specifications: Record<string, unknown>
	specifications_ar: Record<string, unknown>
	unit_of_measure: string
	unit_of_measure_ar: string
	weight_kg: number
	price_range_min: number
	price_range_max: number
	price_tier: PriceTier
	availability_status: AvailabilityStatus
	tags: string[]
	is_stockable: boolean
	imageUrls?: string[]
	/**
	 * Optional product image URL. Shown in the admin registry and may be
	 * surfaced elsewhere later. Nullable so baked catalog entries without
	 * an image don't need an empty value written against them.
	 */
	pictureUrl?: string | null
}

export function groupByBroadCategory(
	products: CatalogProduct[],
): Record<BroadCategory, CatalogProduct[]> {
	const groups: Record<BroadCategory, CatalogProduct[]> = {
		cement: [],
		steel: [],
		aggregates: [],
		bricks: [],
		timber: [],
		finishing: [],
	}
	for (const p of products) {
		groups[getBroadCategory(p.category)].push(p)
	}
	return groups
}
