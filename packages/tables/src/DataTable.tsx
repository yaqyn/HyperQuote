import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import {
	Cell,
	Column,
	Row,
	Table,
	TableBody,
	TableHeader,
} from 'react-aria-components/Table'

interface DataTableProps<T extends Record<string, unknown>> {
	data: T[]
	columns: ColumnDef<T>[]
	onRowClick?: (row: T) => void
	className?: string
}

export function DataTable<T extends Record<string, unknown>>({
	data,
	columns,
	onRowClick,
	className,
}: DataTableProps<T>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	return (
		<Table aria-label="Data table" className={className}>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) =>
					headerGroup.headers.map((header) => (
						<Column key={header.id} isRowHeader={header.index === 0}>
							{header.isPlaceholder
								? null
								: flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
						</Column>
					)),
				)}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row, rowIndex) => (
					<Row
						key={row.id}
						onAction={onRowClick ? () => onRowClick(row.original) : undefined}
						className={`hover:bg-[var(--color-surface)] ${
							rowIndex % 2 === 1 ? 'bg-[var(--color-surface)]/50' : ''
						}`}
					>
						{row.getVisibleCells().map((cell) => (
							<Cell key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</Cell>
						))}
					</Row>
				))}
			</TableBody>
		</Table>
	)
}
