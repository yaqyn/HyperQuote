import type { SupplierTag } from '../../../types/procurement'

const TAG_STYLES: Record<SupplierTag, string> = {
  'best-price': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  fastest: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
}

const TAG_LABELS: Record<SupplierTag, string> = {
  'best-price': 'Best Price',
  fastest: 'Fastest',
  partial: 'Partial',
}

interface RankingBadgeProps {
  rank: number
  tags: SupplierTag[]
}

export function RankingBadge({ rank, tags }: RankingBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-xs font-medium dark:border-white/10 dark:bg-white/10">
        <span className="font-mono text-xs">#{rank}</span>
      </span>
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_STYLES[tag]}`}
        >
          {TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  )
}
