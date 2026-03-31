import Fuse, { type IFuseOptions } from 'fuse.js'

/** Product shape expected by the search helper (subset of full product) */
interface SearchableProduct {
  name: string
  name_ar: string
  brand: string | null
  category: string
  [key: string]: unknown
}

const fuseOptions: IFuseOptions<SearchableProduct> = {
  keys: ['name', 'name_ar', 'brand', 'category'],
  threshold: 0.3,
  distance: 100,
}

/**
 * Create a fuse.js search instance for client-side fuzzy search.
 * Use for quick filtering of already-loaded products on the current page.
 * For cross-page search, use the server-side textSearch via getPublicCatalog.
 */
export function createProductSearch<T extends SearchableProduct>(
  products: T[],
): Fuse<T> {
  return new Fuse(products, fuseOptions as IFuseOptions<T>)
}

/**
 * Search products using a pre-built fuse.js instance.
 * Returns all products when query is empty.
 *
 * @param products - The original products array (fuse doesn't expose docs)
 * @param fuse - Pre-built fuse.js instance
 * @param query - Search query string
 */
export function searchProducts<T extends SearchableProduct>(
  products: T[],
  fuse: Fuse<T>,
  query: string,
): T[] {
  if (!query.trim()) {
    return products
  }
  return fuse.search(query).map((result) => result.item)
}
