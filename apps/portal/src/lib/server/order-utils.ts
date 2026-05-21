import type { OrderStatus } from '../../types/order'
import type { getAuthenticatedPortalCustomer } from './_supabase'

interface ProductImageRow {
	category: string
	image_urls: string[] | null
}

export function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

export function imageUrlForProduct(
	product: ProductImageRow | null,
	categoryImages: Map<string, string>,
): string {
	const productImage =
		product?.image_urls?.find((url) => typeof url === 'string' && url.trim()) ??
		''
	if (productImage) return productImage
	return product?.category ? (categoryImages.get(product.category) ?? '') : ''
}

export async function loadCategoryImageMap(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	slugs: string[],
): Promise<Map<string, string>> {
	const uniqueSlugs = [...new Set(slugs.filter(Boolean))]
	if (uniqueSlugs.length === 0) return new Map()

	const { data, error } = await supabase
		.from('categories')
		.select('slug, image_url')
		.in('slug', uniqueSlugs)
		.eq('is_active', true)

	if (error) throw new Error(error.message)

	return new Map(
		(data ?? []).flatMap((category) =>
			category.image_url ? [[category.slug, category.image_url]] : [],
		),
	)
}

export function mapOrderStatus(status: string): OrderStatus {
	switch (status) {
		case 'draft':
		case 'submitted':
		case 'quote_ready':
		case 'negotiating':
		case 'accepted':
		case 'order_confirmed':
		case 'being_prepared':
		case 'out_for_delivery':
		case 'delivered':
		case 'expired':
		case 'cancelled':
		case 'rejected':
			return status
		case 'confirmed_for_inventory':
			return 'order_confirmed'
		case 'inventory_reserved':
		case 'warehouse_loading':
		case 'dispatch_ready':
			return 'being_prepared'
		case 'dispatch_assigned':
			return 'out_for_delivery'
		default:
			return 'submitted'
	}
}
