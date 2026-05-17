/**
 * PriceHistoryTable -- price change history with old/new values, status badges.
 * Shows old price with strikethrough, new price in Geist Mono.
 * Pending review items get a note below the row.
 */

import { StatusBadge } from '@hyperquote/ui/feedback/StatusBadge'
import { useQuery } from '@tanstack/react-query'
import type { ParseKeys } from 'i18next'
import { useState } from 'react'
import {
	Cell,
	Column,
	Row,
	Table,
	TableBody,
	TableHeader,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getSupplierPriceHistory } from '../../lib/server/supplier-stock'
import { SupplierPagination } from './SupplierPagination'

const STATUS_MAP = {
	applied: { variant: 'success' as const, key: 'supplier.applied' },
	pending_review: {
		variant: 'warning' as const,
		key: 'supplier.pendingReview',
	},
	rejected: { variant: 'error' as const, key: 'supplier.rejected' },
} satisfies Record<
	'applied' | 'pending_review' | 'rejected',
	{
		variant: 'success' | 'warning' | 'error'
		key: ParseKeys<'portal'>
	}
>

interface PriceHistoryTableProps {
	locale: 'ar' | 'en'
}

export default function PriceHistoryTable({ locale }: PriceHistoryTableProps) {
	const { t } = useTranslation('portal')
	const [page, setPage] = useState(1)

	const { data, isLoading } = useQuery({
		queryKey: ['supplier-price-history', page],
		queryFn: () => getSupplierPriceHistory({ data: { page, limit: 50 } }),
		staleTime: 60_000,
	})

	const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG')

	const dateFormatter = new Intl.DateTimeFormat(
		locale === 'ar' ? 'ar-EG' : 'en-EG',
		{ dateStyle: 'medium' },
	)

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="h-12 rounded-lg bg-[var(--color-surface)] animate-pulse"
					/>
				))}
			</div>
		)
	}

	if (!data?.history?.length) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-sm text-[var(--color-text-muted)]">
					{t('supplier.emptyPriceHistory')}
				</p>
			</div>
		)
	}

	const totalPages = Math.ceil((data.total ?? 0) / 50)

	return (
		<div className="flex flex-col gap-4">
			<Table aria-label={t('supplier.priceUpdates')} className="w-full">
				<TableHeader>
					<Column
						isRowHeader
						className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]"
					>
						{t('supplier.productName')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.oldPrice')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.newPrice')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.changedBy')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.date')}
					</Column>
					<Column className="text-start px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
						{t('supplier.status')}
					</Column>
				</TableHeader>
				<TableBody>
					{data.history.map((entry) => {
						const statusInfo = STATUS_MAP[entry.status]
						return (
							<Row
								key={entry.id}
								className="border-b border-[var(--color-border)]"
							>
								<Cell className="px-4 py-3">
									<div className="flex flex-col">
										<span className="text-sm text-[var(--color-text)]">
											{locale === 'ar'
												? entry.productNameAr
												: entry.productName}
										</span>
										{entry.status === 'pending_review' && (
											<span className="text-[var(--color-text-muted)] text-[13px] mt-1">
												{t('supplier.priceReviewNote')}
											</span>
										)}
									</div>
								</Cell>
								<Cell className="px-4 py-3">
									<span className="font-mono text-sm line-through text-[var(--color-text-muted)]">
										{formatter.format(entry.oldPrice)}
									</span>
								</Cell>
								<Cell className="px-4 py-3">
									<span className="font-mono text-sm text-[var(--color-text)]">
										{formatter.format(entry.newPrice)}
									</span>
								</Cell>
								<Cell className="px-4 py-3">
									<span className="text-sm text-[var(--color-text)]">
										{entry.changedBy}
									</span>
								</Cell>
								<Cell className="px-4 py-3">
									<span className="font-mono text-sm text-[var(--color-text)]">
										{dateFormatter.format(new Date(entry.changedAt))}
									</span>
								</Cell>
								<Cell className="px-4 py-3">
									<StatusBadge status={statusInfo.variant}>
										{t(statusInfo.key)}
									</StatusBadge>
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
				onPageChange={setPage}
			/>
		</div>
	)
}
