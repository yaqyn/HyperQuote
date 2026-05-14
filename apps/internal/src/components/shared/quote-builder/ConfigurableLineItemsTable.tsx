import type { FieldValues, UseFormReturn } from 'react-hook-form'
import type { ColumnConfig } from './types'

interface ConfigurableLineItemsTableProps<TItem, TForm extends FieldValues> {
	items: TItem[]
	columns: ColumnConfig<TItem, TForm>[]
	form: UseFormReturn<TForm>
	emptyLabel?: string
	onRowClick?: (item: TItem, index: number) => void
	/**
	 * Extract a stable React key per row. Defaults to `row-${index}` which is
	 * acceptable here because the table is read-only and rows never reorder.
	 */
	getRowKey?: (item: TItem, index: number) => string | number
}

export function ConfigurableLineItemsTable<TItem, TForm extends FieldValues>({
	items,
	columns,
	form,
	emptyLabel = 'No items',
	onRowClick,
	getRowKey,
}: ConfigurableLineItemsTableProps<TItem, TForm>) {
	if (items.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 text-[13px] text-black/25 dark:text-white/25">
				{emptyLabel}
			</div>
		)
	}

	return (
		<table className="w-full">
			<thead>
				<tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
					{columns.map((col) => (
						<th
							key={col.id}
							style={col.width ? { width: col.width } : undefined}
							className={`py-2.5 px-3 text-${col.align ?? 'start'} text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30`}
						>
							{col.header}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{items.map((item, index) => (
					<tr
						key={getRowKey ? getRowKey(item, index) : `row-${index}`}
						onClick={onRowClick ? () => onRowClick(item, index) : undefined}
						className={`-outline-offset-1 outline outline-1 outline-transparent transition-colors hover:outline-black/[0.14] dark:hover:outline-white/[0.16] ${onRowClick ? 'cursor-pointer' : ''}`}
					>
						{columns.map((col) => (
							<td
								key={col.id}
								className={`py-4 px-3 text-${col.align ?? 'start'}`}
							>
								{col.cell({ item, index, form })}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}
