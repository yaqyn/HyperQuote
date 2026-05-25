interface ProcurementSearchProduct {
	broadCategory: string
	name: string
	sku: string
}

export function filterProcurementProducts<
	TProduct extends ProcurementSearchProduct,
>(
	products: readonly TProduct[],
	activeCategory: string,
	search: string,
	extraSearchValues: (product: TProduct) => readonly string[] = () => [],
): TProduct[] {
	let list = [...products]
	if (activeCategory !== 'all') {
		list = list.filter((product) => product.broadCategory === activeCategory)
	}
	const query = search.trim().toLowerCase()
	if (!query) return list
	return list.filter((product) =>
		[product.name, product.sku, ...extraSearchValues(product)].some((value) =>
			value.toLowerCase().includes(query),
		),
	)
}
