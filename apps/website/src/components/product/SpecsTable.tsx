import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SpecsTableProps {
	specifications: Record<string, unknown>
	weightKg: number | null
	unitOfMeasure: string
	brand: string | null
	manufacturer: string | null
}

function isNumeric(value: unknown): boolean {
	if (typeof value === 'number') return true
	if (typeof value === 'string') return /^[\d.,]+$/.test(value.trim())
	return false
}

export function SpecsTable({
	specifications,
	weightKg,
	unitOfMeasure,
	brand,
	manufacturer,
}: SpecsTableProps) {
	const { t } = useTranslation('website')

	// Build rows from JSONB specifications (only populated fields)
	const rows: { key: string; label: string; value: string }[] = []

	for (const [key, value] of Object.entries(specifications)) {
		if (value == null || value === '') continue
		rows.push({
			key,
			label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			value: String(value),
		})
	}

	// Add product-level fields as spec rows if populated
	if (weightKg != null) {
		rows.push({
			key: 'weight_kg',
			label: t('product.specWeight', 'Weight'),
			value: `${weightKg} kg`,
		})
	}
	if (unitOfMeasure) {
		rows.push({
			key: 'unit_of_measure',
			label: t('product.specUOM', 'Unit of Measure'),
			value: t(`units.${unitOfMeasure}`, unitOfMeasure),
		})
	}
	if (brand) {
		rows.push({
			key: 'brand',
			label: t('product.specBrand', 'Brand'),
			value: brand,
		})
	}
	if (manufacturer) {
		rows.push({
			key: 'manufacturer',
			label: t('product.specManufacturer', 'Manufacturer'),
			value: manufacturer,
		})
	}

	if (rows.length === 0) return null

	return (
		<section className="mt-12">
			<h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
				<Info size={16} className="text-[var(--color-text-muted)]" />
				{t('product.specsHeading', 'Specifications')}
			</h2>
			<div className="overflow-hidden rounded-xl">
				<table className="w-full text-sm">
					<tbody>
						{rows.map((row, i) => (
							<tr
								key={row.key}
								className={
									i % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-transparent'
								}
							>
								<td className="px-4 py-3 font-semibold text-[var(--color-text-muted)]">
									{row.label}
								</td>
								<td
									className={`px-4 py-3 ${isNumeric(row.value) ? 'font-mono' : ''}`}
								>
									{row.value}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}
