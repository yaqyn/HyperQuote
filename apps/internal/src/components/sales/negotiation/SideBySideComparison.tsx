import { useTranslation } from 'react-i18next'
import type { QuoteItem } from '../../../types/sales'

// ─── Mock Data ───────────────────────────────────────────────

function getMockVersionItems(versionId: string): {
  version: number
  items: QuoteItem[]
  subtotal: number
  vatAmount: number
  total: number
} {
  // Simulate two different versions for comparison
  if (versionId.endsWith('-v1') || versionId.endsWith('-v2')) {
    const items: QuoteItem[] = [
      {
        id: 'qi-1',
        productName: 'Portland Cement CEM I 42.5N',
        specification: '50kg bags',
        quantity: 500,
        unit: 'bag',
        supplierCost: 47.0,
        marginPercent: 20,
        sellPrice: 56.4,
        lineTotal: 28_200,
        freshnessIndicator: 'fresh',
        supplierName: 'Suez Cement',
        customerCounterPrice: 54.0,
      },
      {
        id: 'qi-2',
        productName: 'Steel Rebar 16mm',
        specification: 'Grade 60, 12m',
        quantity: 200,
        unit: 'bundle',
        supplierCost: 3_249.25,
        marginPercent: 15,
        sellPrice: 3_738,
        lineTotal: 747_600,
        freshnessIndicator: 'fresh',
        supplierName: 'Ezz Steel',
        customerCounterPrice: 3_550.0,
      },
      {
        id: 'qi-3',
        productName: 'Concrete Blocks 20cm',
        specification: 'Hollow, load-bearing',
        quantity: 5000,
        unit: 'piece',
        supplierCost: 12.81,
        marginPercent: 22,
        sellPrice: 15.63,
        lineTotal: 78_150,
        freshnessIndicator: 'aging',
        supplierName: 'Arabian Cement',
        customerCounterPrice: null,
      },
    ]
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
    const vatAmount = Math.round(subtotal * 14) / 100
    return { version: versionId.endsWith('-v1') ? 1 : 2, items, subtotal, vatAmount, total: subtotal + vatAmount }
  }

  // Current version with adjusted prices
  const items: QuoteItem[] = [
    {
      id: 'qi-1',
      productName: 'Portland Cement CEM I 42.5N',
      specification: '50kg bags',
      quantity: 500,
      unit: 'bag',
      supplierCost: 47.0,
      marginPercent: 18,
      sellPrice: 55.0,
      lineTotal: 27_500,
      freshnessIndicator: 'fresh',
      supplierName: 'Suez Cement',
      customerCounterPrice: 54.0,
    },
    {
      id: 'qi-2',
      productName: 'Steel Rebar 16mm',
      specification: 'Grade 60, 12m',
      quantity: 200,
      unit: 'bundle',
      supplierCost: 3_249.25,
      marginPercent: 12,
      sellPrice: 3_600,
      lineTotal: 720_000,
      freshnessIndicator: 'fresh',
      supplierName: 'Ezz Steel',
      customerCounterPrice: 3_550.0,
    },
    {
      id: 'qi-3',
      productName: 'Concrete Blocks 20cm',
      specification: 'Hollow, load-bearing',
      quantity: 5000,
      unit: 'piece',
      supplierCost: 12.81,
      marginPercent: 20,
      sellPrice: 15.0,
      lineTotal: 75_000,
      freshnessIndicator: 'aging',
      supplierName: 'Arabian Cement',
      customerCounterPrice: null,
    },
  ]
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
  const vatAmount = Math.round(subtotal * 14) / 100
  return { version: 3, items, subtotal, vatAmount, total: subtotal + vatAmount }
}

// ─── Helpers ─────────────────────────────────────────────────

function priceDiffClass(a: number, b: number): string {
  if (b < a) return 'text-green-600 dark:text-green-400' // Lower = better for customer
  if (b > a) return 'text-red-600 dark:text-red-400'
  return ''
}

function formatDiff(a: number, b: number): string {
  const diff = b - a
  if (diff === 0) return '-'
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toLocaleString('en-EG')}`
}

// ─── Component ───────────────────────────────────────────────

interface SideBySideComparisonProps {
  versionAId: string
  versionBId: string
}

export function SideBySideComparison({
  versionAId,
  versionBId,
}: SideBySideComparisonProps) {
  const { t } = useTranslation('internal')
  const versionA = getMockVersionItems(versionAId)
  const versionB = getMockVersionItems(versionBId)

  const lineItems = versionA.items.map((itemA, idx) => {
    const itemB = versionB.items[idx]
    return { itemA, itemB }
  })

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
        <h3 className="text-sm font-semibold">
          {t('sales.negotiation.comparison', 'Side-by-Side Comparison')}
        </h3>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
            <th className="text-start px-4 py-2 font-medium">
              {t('sales.negotiation.item', 'Item')}
            </th>
            <th className="text-end px-3 py-2 font-medium font-mono">
              v{versionA.version}
            </th>
            <th className="text-end px-3 py-2 font-medium font-mono">
              v{versionB.version}
            </th>
            <th className="text-end px-3 py-2 font-medium">
              {t('sales.negotiation.diff', 'Diff')}
            </th>
            <th className="text-end px-3 py-2 font-medium">
              {t('sales.negotiation.customerCounter', 'Counter')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map(({ itemA, itemB }) => (
            <tr
              key={itemA.id}
              className="border-b border-black/5 dark:border-white/5"
            >
              <td className="px-4 py-2">
                <div className="font-medium">{itemA.productName}</div>
                <div className="text-xs text-black/40 dark:text-white/40">
                  {itemA.quantity} {itemA.unit}
                </div>
              </td>
              <td className="text-end px-3 py-2 font-mono">
                {itemA.sellPrice.toLocaleString('en-EG')}
              </td>
              <td className="text-end px-3 py-2 font-mono">
                {itemB?.sellPrice.toLocaleString('en-EG') ?? '-'}
              </td>
              <td
                className={`text-end px-3 py-2 font-mono ${itemB ? priceDiffClass(itemA.sellPrice, itemB.sellPrice) : ''}`}
              >
                {itemB ? formatDiff(itemA.sellPrice, itemB.sellPrice) : '-'}
              </td>
              <td className="text-end px-3 py-2 font-mono text-black/40 dark:text-white/40">
                {itemB?.customerCounterPrice
                  ? itemB.customerCounterPrice.toLocaleString('en-EG')
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/10 dark:border-white/10">
            <td className="px-4 py-2 font-medium">
              {t('sales.negotiation.subtotal', 'Subtotal')}
            </td>
            <td className="text-end px-3 py-2 font-mono">
              {versionA.subtotal.toLocaleString('en-EG')}
            </td>
            <td className="text-end px-3 py-2 font-mono">
              {versionB.subtotal.toLocaleString('en-EG')}
            </td>
            <td
              className={`text-end px-3 py-2 font-mono ${priceDiffClass(versionA.subtotal, versionB.subtotal)}`}
            >
              {formatDiff(versionA.subtotal, versionB.subtotal)}
            </td>
            <td />
          </tr>
          <tr>
            <td className="px-4 py-1 text-black/50 dark:text-white/50">
              {t('sales.negotiation.vat14', 'VAT 14%')}
            </td>
            <td className="text-end px-3 py-1 font-mono text-black/50 dark:text-white/50">
              {versionA.vatAmount.toLocaleString('en-EG')}
            </td>
            <td className="text-end px-3 py-1 font-mono text-black/50 dark:text-white/50">
              {versionB.vatAmount.toLocaleString('en-EG')}
            </td>
            <td
              className={`text-end px-3 py-1 font-mono ${priceDiffClass(versionA.vatAmount, versionB.vatAmount)}`}
            >
              {formatDiff(versionA.vatAmount, versionB.vatAmount)}
            </td>
            <td />
          </tr>
          <tr className="border-t border-black/10 dark:border-white/10 font-semibold">
            <td className="px-4 py-2">
              {t('sales.negotiation.total', 'Total')}
            </td>
            <td className="text-end px-3 py-2 font-mono">
              EGP {versionA.total.toLocaleString('en-EG')}
            </td>
            <td className="text-end px-3 py-2 font-mono">
              EGP {versionB.total.toLocaleString('en-EG')}
            </td>
            <td
              className={`text-end px-3 py-2 font-mono ${priceDiffClass(versionA.total, versionB.total)}`}
            >
              {formatDiff(versionA.total, versionB.total)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
