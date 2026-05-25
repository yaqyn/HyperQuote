/**
 * Stock & Pricing window (SUPP-02).
 * 3 tabs: My Products, Price Updates, Upload History.
 * Product table with inline editing, freshness indicators, bulk CSV update.
 */

import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components/Tabs'
import { useTranslation } from 'react-i18next'
import { StockTable } from '../../components/supplier/StockTable'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { WindowShell } from '../../components/windows/WindowShell'
import { portalHead } from '../../lib/page-meta'
import { getSupplierProducts } from '../../lib/server/supplier-stock'
import type { SupplierProduct } from '../../types/supplier'

// Lazy load tab components
const PriceHistoryTable = lazy(
	() => import('../../components/supplier/PriceHistoryTable'),
)
const UploadHistoryList = lazy(
	() => import('../../components/supplier/UploadHistoryList'),
)

export const Route = createFileRoute('/_portal/supplier/stock')({
	head: () =>
		portalHead({
			title: 'Supplier Stock & Pricing — HyperQuote Portal',
			description:
				'Private supplier stock and pricing workspace for products, price updates, upload history, and bulk catalog maintenance.',
			path: '/supplier/stock',
		}),
	component: StockWindow,
})

function StockWindow() {
	const { t, i18n } = useTranslation('portal')
	const locale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'

	const [page, setPage] = useState(1)
	const [selectedProduct, setSelectedProduct] =
		useState<SupplierProduct | null>(null)
	const [showBulkUpdate, setShowBulkUpdate] = useState(false)

	const { data, isLoading } = useQuery({
		queryKey: ['supplier-products', page],
		queryFn: () => getSupplierProducts({ data: { page, limit: 50 } }),
		staleTime: 60_000,
	})

	return (
		<>
			<WindowShell title={t('supplier.stockTitle')} maxWidth="1080px">
				<Tabs defaultSelectedKey="products" className="flex flex-col h-full">
					<TabList className="flex gap-1 px-6 pt-4 lg:pt-6 border-b border-[var(--color-border)]">
						<StyledTab id="products">{t('supplier.myProducts')}</StyledTab>
						<StyledTab id="priceUpdates">
							{t('supplier.priceUpdates')}
						</StyledTab>
						<StyledTab id="uploadHistory">
							{t('supplier.uploadHistory')}
						</StyledTab>
					</TabList>

					{/* My Products tab */}
					<TabPanel id="products" className="flex-1 overflow-auto p-6 lg:py-8">
						{/* Header actions */}
						<div className="flex items-center gap-3 mb-4">
							<Button
								onPress={() =>
									window.location.assign('/supplier/catalog-upload')
								}
								className="flex items-center justify-center h-[44px] rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold px-6 cursor-pointer hover:opacity-90 transition-opacity"
							>
								{t('supplier.uploadCatalog')}
							</Button>
							<Button
								onPress={() => setShowBulkUpdate(true)}
								className="flex items-center justify-center h-[44px] rounded-xl border border-[var(--color-border)] text-sm font-semibold px-6 cursor-pointer hover:bg-[var(--color-surface)] transition-colors text-[var(--color-text)]"
							>
								{locale === 'ar' ? 'تحديث مجمع' : 'Bulk Update'}
							</Button>
						</div>

						{isLoading ? (
							<LoadingSkeleton />
						) : (
							<StockTable
								products={data?.products ?? []}
								locale={locale}
								onEditProduct={setSelectedProduct}
								page={page}
								total={data?.total ?? 0}
								onPageChange={setPage}
							/>
						)}
					</TabPanel>

					{/* Price Updates tab */}
					<TabPanel
						id="priceUpdates"
						className="flex-1 overflow-auto p-6 lg:py-8"
					>
						<Suspense fallback={<LoadingSkeleton />}>
							<PriceHistoryTable locale={locale} />
						</Suspense>
					</TabPanel>

					{/* Upload History tab */}
					<TabPanel id="uploadHistory" className="flex-1 overflow-auto p-6">
						<Suspense fallback={<LoadingSkeleton />}>
							<UploadHistoryList locale={locale} />
						</Suspense>
					</TabPanel>
				</Tabs>
			</WindowShell>

			{/* Product Edit Drawer (Task 2) */}
			{selectedProduct && (
				<Suspense fallback={null}>
					<ProductEditDrawerLazy
						product={selectedProduct}
						onClose={() => setSelectedProduct(null)}
						locale={locale}
					/>
				</Suspense>
			)}

			{/* Bulk Update Diff (Task 2) */}
			{showBulkUpdate && (
				<Suspense fallback={null}>
					<BulkUpdateDiffLazy
						isOpen={showBulkUpdate}
						onClose={() => setShowBulkUpdate(false)}
						locale={locale}
					/>
				</Suspense>
			)}

			<FloatingAIButton />
		</>
	)
}

// Lazy imports for Task 2 components
const ProductEditDrawerLazy = lazy(
	() => import('../../components/supplier/ProductEditDrawer'),
)
const BulkUpdateDiffLazy = lazy(
	() => import('../../components/supplier/BulkUpdateDiff'),
)

// ============================================================================
// Styled Tab
// ============================================================================

function StyledTab({
	id,
	children,
}: {
	id: string
	children: React.ReactNode
}) {
	return (
		<Tab
			id={id}
			className={({ isSelected }) =>
				[
					'px-4 py-2 text-sm cursor-pointer outline-none transition-colors -mb-px',
					isSelected
						? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-semibold'
						: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
				].join(' ')
			}
		>
			{children}
		</Tab>
	)
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			{[1, 2, 3, 4, 5].map((i) => (
				<div
					key={i}
					className="h-12 rounded-lg bg-[var(--color-surface)] animate-pulse"
				/>
			))}
		</div>
	)
}
