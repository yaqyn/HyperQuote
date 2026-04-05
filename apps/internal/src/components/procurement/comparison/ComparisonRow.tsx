import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Button, Radio, RadioGroup } from 'react-aria-components'
import type { PriceComparison, RankedSupplier, SplitSource } from '../../../types/procurement'
import { RankingBadge } from './RankingBadge'
import { SplitSourceDialog } from './SplitSourceDialog'
import { HistoricalPriceContext } from './HistoricalPriceContext'

const ROW_HIGHLIGHT: Record<string, string> = {
  'best-price': 'bg-green-50/50 dark:bg-green-950/10',
  fastest: 'bg-[#2563EB]/5',
  partial: 'bg-yellow-50/50 dark:bg-yellow-950/10',
}

function getRowHighlight(tags: RankedSupplier['tags']): string {
  // Priority: best-price > fastest > partial
  if (tags.includes('best-price')) return ROW_HIGHLIGHT['best-price']
  if (tags.includes('fastest')) return ROW_HIGHLIGHT.fastest
  if (tags.includes('partial')) return ROW_HIGHLIGHT.partial
  return ''
}

interface ComparisonRowProps {
  comparison: PriceComparison
  selectedSupplierId: string | null
  onSelectSupplier: (supplierId: string) => void
  onSplitSource: (split: SplitSource) => void
}

export function ComparisonRow({
  comparison,
  selectedSupplierId,
  onSelectSupplier,
  onSplitSource,
}: ComparisonRowProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rank', desc: false }])

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

  const fmtQty = (n: number) => new Intl.NumberFormat(locale).format(n)

  const fmtDays = (n: number) => new Intl.NumberFormat(locale).format(n)

  const columns: ColumnDef<RankedSupplier>[] = [
    {
      id: 'select',
      header: '',
      cell: ({ row }) => (
        <Radio
          value={row.original.supplierId}
          className="h-4 w-4 cursor-pointer rounded-full border border-black/20 data-[selected]:border-[#2563EB] data-[selected]:bg-[#2563EB] dark:border-white/20"
          aria-label={`Select ${row.original.supplierName}`}
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-black dark:text-white">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'unitPrice',
      header: 'Unit Price',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{fmtPrice(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'leadTimeDays',
      header: 'Lead Time',
      cell: ({ getValue }) => {
        const days = getValue<number>()
        return <span className="font-mono text-sm">{fmtDays(days)}d</span>
      },
    },
    {
      accessorKey: 'availableQty',
      header: 'Available',
      cell: ({ row }) => {
        const available = row.original.availableQty
        const isPartial = available < comparison.requestedQty
        return (
          <span className={`font-mono text-sm ${isPartial ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
            {fmtQty(available)} {comparison.uom}
          </span>
        )
      },
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const total = row.original.unitPrice * comparison.requestedQty
        return <span className="font-mono text-sm font-medium">{fmtPrice(total)}</span>
      },
    },
    {
      accessorKey: 'certificationStatus',
      header: 'Cert.',
      cell: ({ getValue }) => {
        const status = getValue<string>()
        const styles: Record<string, string> = {
          certified: 'text-green-600 dark:text-green-400',
          pending: 'text-yellow-600 dark:text-yellow-400',
          none: 'text-black/30 dark:text-white/30',
        }
        return <span className={`text-xs ${styles[status] ?? ''}`}>{status}</span>
      },
    },
    {
      id: 'ranking',
      header: 'Rank',
      accessorKey: 'rank',
      cell: ({ row }) => <RankingBadge rank={row.original.rank} tags={row.original.tags} />,
    },
  ]

  const table = useReactTable({
    data: comparison.suppliers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="rounded-xl border border-black/10 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-black/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-black dark:text-white">{comparison.productName}</h3>
          <p className="text-xs text-black/50 dark:text-white/50">
            Requested: <span className="font-mono">{fmtQty(comparison.requestedQty)}</span> {comparison.uom}
          </p>
        </div>
        <SplitSourceDialog
          productId={comparison.productId}
          requestedQty={comparison.requestedQty}
          uom={comparison.uom}
          suppliers={comparison.suppliers}
          onConfirm={onSplitSource}
        >
          <Button className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
            Split
          </Button>
        </SplitSourceDialog>
      </div>

      {/* Table */}
      <RadioGroup
        value={selectedSupplierId ?? ''}
        onChange={onSelectSupplier}
        aria-label={`Supplier selection for ${comparison.productName}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-black/5 dark:border-white/5">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-black/5 transition-colors last:border-0 dark:border-white/5 ${getRowHighlight(row.original.tags)}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RadioGroup>

      {/* Historical context */}
      <div className="border-t border-black/5 px-4 py-2 dark:border-white/5">
        <HistoricalPriceContext productId={comparison.productId} />
      </div>
    </div>
  )
}
