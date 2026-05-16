/**
 * StockTable -- product table with inline edit cells for price/quantity.
 * Uses React Aria Table directly (not DataTable wrapper) for inline edit control.
 * Pagination: 50 per page via prev/next buttons.
 */

import { EmptyState, StatusBadge } from '@hyperquote/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { EyeOff, Pencil } from 'lucide-react'
import {
	Button,
	Cell,
	Column,
	Row,
	Table,
	TableBody,
	TableHeader,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { updateSupplierStock } from '../../lib/server/supplier-stock'
import type { SupplierProduct } from '../../types/supplier'
import { FreshnessIndicator } from './FreshnessIndicator'
import { InlineEditCell } from './InlineEditCell'
import { SupplierPagination } from './SupplierPagination'

interface StockTableProps {
	products: SupplierProduct[]
	locale: 'ar' | 'en'
	onEditProduct: (product: SupplierProduct) => void
	page: number
	total: number
	onPageChange: (page: number) => void
}

const STATUS_MAP = {
	active: { variant: 'success' as const, key: 'supplier.active' },
	low_stock: { variant: 'warning' as const, key: 'supplier.lowStock' },
	out_of_stock: { variant: 'error' as const, key: 'supplier.outOfStock' },
	suppressed: { variant: 'neutral' as const, key: 'supplier.suppressed' },
} satisfies Record<
	SupplierProduct['status'],
	{
		variant: 'success' | 'warning' | 'error' | 'neutral'
		key: ParseKeys<'portal'>
	}
>

const ITEMS_PER_PAGE = 50

export function StockTable({
	products,
	locale,
	onEditProduct,
	page,
	total,
	onPageChange,
}: StockTableProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()

	const updateMutation = useMutation({
		mutationFn: (vars: {
			productId: string
			price?: number
			quantity?: number
		}) => updateSupplierStock({ data: vars }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] })
		},
	})

	if (products.length === 0) {
		return (
			<EmptyState
				title={t('supplier.emptyProducts')}
				description={t('supplier.addManually')}
				action={{
					label: t('supplier.uploadCatalog'),
					onClick: () => navigate({ to: '/supplier/catalog-upload' }),
				}}
			/>
		)
	}

	const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

	return (
		<div className="flex flex-col gap-4">
			<Table aria-label={t('supplier.myProducts')} className="w-full">
				<TableHeader>
					<Column
						isRowHeader
						className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]"
					>
						{t('supplier.productName')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.sku')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.currentPrice')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.stockQty')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.lastUpdated')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.status')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.actions')}
					</Column>
				</TableHeader>
				<TableBody>
					{products.map((product) => {
						const statusInfo = STATUS_MAP[product.status]
						return (
							<Row
								key={product.id}
								className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
							>
								<Cell className="px-4 py-3">
									<div className="flex flex-col">
										<span className="text-sm font-medium text-[var(--color-text)]">
											{locale === 'ar' ? product.nameAr : product.name}
										</span>
										<span className="text-[13px] text-[var(--color-text-muted)]">
											{locale === 'ar' ? product.name : product.nameAr}
										</span>
									</div>
								</Cell>
								<Cell className="px-4 py-3">
									<span className="font-mono text-sm text-[var(--color-text)]">
										{product.sku}
									</span>
								</Cell>
								<Cell className="px-4 py-3">
									<InlineEditCell
										value={product.currentPrice}
										locale={locale}
										formatOptions={{
											style: 'decimal',
											minimumFractionDigits: 0,
										}}
										onSave={async (newValue) => {
											await updateMutation.mutateAsync({
												productId: product.id,
												price: newValue,
											})
										}}
									/>
								</Cell>
								<Cell className="px-4 py-3">
									<InlineEditCell
										value={product.stockQuantity}
										locale={locale}
										formatOptions={{
											style: 'decimal',
											maximumFractionDigits: 0,
										}}
										onSave={async (newValue) => {
											await updateMutation.mutateAsync({
												productId: product.id,
												quantity: newValue,
											})
										}}
									/>
								</Cell>
								<Cell className="px-4 py-3">
									<FreshnessIndicator
										lastUpdatedAt={product.lastUpdatedAt}
										locale={locale}
									/>
								</Cell>
								<Cell className="px-4 py-3">
									<StatusBadge status={statusInfo.variant}>
										{t(statusInfo.key)}
									</StatusBadge>
								</Cell>
								<Cell className="px-4 py-3">
									<div className="flex items-center gap-1">
										<Button
											onPress={() => onEditProduct(product)}
											aria-label={`${t('supplier.edit')} ${product.name}`}
											className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
										>
											<Pencil size={16} />
										</Button>
										<Button
											aria-label={`${t('supplier.deactivate')} ${product.name}`}
											className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
										>
											<EyeOff size={16} />
										</Button>
									</div>
								</Cell>
							</Row>
						)
					})}
				</TableBody>
			</Table>

			<SupplierPagination
				page={page}
				totalPages={totalPages}
				previousLabel={t('supplier.previous')}
				nextLabel={t('supplier.next')}
				onPageChange={onPageChange}
			/>
		</div>
	)
}
