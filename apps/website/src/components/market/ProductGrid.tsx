import { Skeleton } from '@hyperquote/ui'
import { ChevronsUpDown, LayoutGrid, List } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	Button,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { PublicProduct } from '../../lib/catalog'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
	items: PublicProduct[]
	total: number
	sort: string
	view?: string
	onSortChange: (sort: string) => void
	onViewChange: (view: string) => void
}

const SORT_OPTIONS = [
	{ id: 'relevance', labelKey: 'market.sortRelevance' },
	{ id: 'name', labelKey: 'market.sortName' },
	{ id: 'category', labelKey: 'market.sortCategory' },
	{ id: 'availability', labelKey: 'market.sortAvailability' },
] as const

const VIEW_STORAGE_KEY = 'hq-market-view'

export function ProductGrid({
	items,
	total,
	sort,
	view: viewProp,
	onSortChange,
	onViewChange,
}: ProductGridProps) {
	const { t } = useTranslation('website')
	const [currentView, setCurrentView] = useState<'grid' | 'list'>('grid')

	// Initialize view from prop or localStorage
	useEffect(() => {
		if (viewProp) {
			setCurrentView(viewProp as 'grid' | 'list')
		} else {
			const stored = localStorage.getItem(VIEW_STORAGE_KEY)
			if (stored === 'grid' || stored === 'list') {
				setCurrentView(stored)
			}
		}
	}, [viewProp])

	const handleViewChange = (newView: 'grid' | 'list') => {
		setCurrentView(newView)
		localStorage.setItem(VIEW_STORAGE_KEY, newView)
		onViewChange(newView)
	}

	return (
		<div>
			{/* Toolbar */}
			<div className="flex items-center justify-between mb-4">
				{/* Result count */}
				<p className="text-sm text-[var(--color-text-muted)]">
					<span className="font-mono">{total}</span>{' '}
					{t('market.resultCount', { count: total })}
				</p>

				<div className="flex items-center gap-3">
					{/* Sort dropdown */}
					<Select
						selectedKey={sort}
						onSelectionChange={(key) => onSortChange(key as string)}
						aria-label={t('market.sortLabel')}
					>
						<Label className="sr-only">{t('market.sortLabel')}</Label>
						<Button className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-text)]">
							<SelectValue />
							<ChevronsUpDown
								size={16}
								className="text-[var(--color-text-muted)]"
								aria-hidden="true"
							/>
						</Button>
						<Popover className="w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg overflow-hidden z-50">
							<ListBox className="p-1">
								{SORT_OPTIONS.map((opt) => (
									<ListBoxItem
										key={opt.id}
										id={opt.id}
										className="px-3 py-2 text-sm rounded-md cursor-pointer text-[var(--color-text)] hover:bg-[var(--color-surface)] data-[selected]:font-medium data-[selected]:text-[var(--color-primary)] outline-none data-[focused]:bg-[var(--color-surface)]"
									>
										{t(opt.labelKey)}
									</ListBoxItem>
								))}
							</ListBox>
						</Popover>
					</Select>

					{/* View toggle */}
					<div className="flex items-center border border-[var(--color-border)] rounded-lg overflow-hidden">
						<button
							type="button"
							onClick={() => handleViewChange('grid')}
							className={`p-2 transition-colors ${
								currentView === 'grid'
									? 'bg-[var(--color-primary)] text-white'
									: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
							}`}
							aria-label={t('market.viewGrid')}
						>
							<LayoutGrid size={16} aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => handleViewChange('list')}
							className={`p-2 transition-colors ${
								currentView === 'list'
									? 'bg-[var(--color-primary)] text-white'
									: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
							}`}
							aria-label={t('market.viewList')}
						>
							<List size={16} aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>

			{/* Product grid/list */}
			{items.length > 0 ? (
				currentView === 'grid' ? (
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-7">
						{items.map((item) => (
							<ProductCard key={item.id} product={item} variant="grid" />
						))}
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{items.map((item) => (
							<ProductCard key={item.id} product={item} variant="list" />
						))}
					</div>
				)
			) : null}
		</div>
	)
}

const LIST_SKELETON_KEYS = Array.from(
	{ length: 8 },
	(_, i) => `product-skeleton-row-${i}`,
)
const GRID_SKELETON_KEYS = Array.from(
	{ length: 6 },
	(_, i) => `product-skeleton-card-${i}`,
)

export function ProductGridSkeleton({ view = 'grid' }: { view?: string }) {
	if (view === 'list') {
		return (
			<div className="flex flex-col gap-2">
				{LIST_SKELETON_KEYS.map((k) => (
					<Skeleton key={k} className="h-20 rounded-lg" />
				))}
			</div>
		)
	}
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{GRID_SKELETON_KEYS.map((k) => (
				<div key={k} className="rounded-xl overflow-hidden">
					<Skeleton className="aspect-[4/3]" />
					<div className="p-4 space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			))}
		</div>
	)
}
