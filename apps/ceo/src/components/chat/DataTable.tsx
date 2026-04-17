interface DataTableColumn {
	key: string
	label: string
	numeric?: boolean
}

interface DataTableProps {
	columns: DataTableColumn[]
	rows: Record<string, string | number>[]
}

export function DataTable({ columns, rows }: DataTableProps) {
	return (
		<div className="my-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-[var(--color-border)]">
						{columns.map((col) => (
							<th
								key={col.key}
								className="px-3 py-2 text-start text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
							>
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const rowKey = columns.map((col) => String(row[col.key])).join('|')
						return (
							<tr
								key={rowKey}
								className="border-b border-[var(--color-border)] last:border-b-0"
							>
								{columns.map((col) => (
									<td
										key={col.key}
										className={`px-3 py-2 ${
											col.numeric
												? 'font-mono font-medium text-[var(--color-text)]'
												: 'text-[var(--color-text)]'
										}`}
									>
										{row[col.key]}
									</td>
								))}
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
