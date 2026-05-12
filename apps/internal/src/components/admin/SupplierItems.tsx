import type { CatalogProduct } from '@hyperquote/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Star, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplierPriceRow } from '../../lib/db/db'
import {
	adminAddSupplierItem,
	adminListProducts,
	adminListSupplierItems,
	adminRemoveSupplierItem,
	adminUpdateSupplierItem,
} from '../../lib/server/admin'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { LinkAction, NumberControl, SelectControl } from './AdminControls'

/**
 * Items sub-section for the supplier editor — the list of products a
 * supplier sells, with cost / lead / min-qty / primary flag per line.
 *
 * Follows the same contract as the parent editor: view mode is fully
 * read-only, edit and create modes allow mutation. On create (before
 * the supplier exists), the section renders a placeholder — items can
 * only be attached after the supplier is saved.
 */
export function SupplierItems({
	supplierName,
	readOnly,
}: {
	supplierName: string | null
	readOnly: boolean
}) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()

	const {
		data: items = [],
		isError: itemsError,
		isPending: itemsPending,
	} = useQuery({
		queryKey: ['admin', 'supplierItems', supplierName ?? ''],
		queryFn: () =>
			adminListSupplierItems({ data: { supplierName: supplierName ?? '' } }),
		enabled: Boolean(supplierName),
	})

	const {
		data: products = [],
		isError: productsError,
		isPending: productsPending,
	} = useQuery({
		queryKey: ['admin', 'products'],
		queryFn: () => adminListProducts(),
	})

	const productBySlug = useMemo(() => {
		const map = new Map<string, CatalogProduct>()
		for (const p of products) map.set(p.slug, p)
		return map
	}, [products])

	const addMutation = useMutation({
		mutationFn: (payload: {
			supplierName: string
			productSlug: string
			rawCost: number
			leadTimeDays: number
			minOrderQty: number
			isPrimary: boolean
			notes: string | null
		}) => adminAddSupplierItem({ data: payload }),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: ['admin', 'supplierItems', supplierName ?? ''],
			}),
	})

	const updateMutation = useMutation({
		mutationFn: (payload: {
			id: string
			rawCost?: number
			leadTimeDays?: number
			minOrderQty?: number
			isPrimary?: boolean
		}) => adminUpdateSupplierItem({ data: payload }),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: ['admin', 'supplierItems', supplierName ?? ''],
			}),
	})

	const removeMutation = useMutation({
		mutationFn: (id: string) => adminRemoveSupplierItem({ data: { id } }),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: ['admin', 'supplierItems', supplierName ?? ''],
			}),
	})

	const takenSlugs = useMemo(
		() => new Set(items.map((i) => i.productSlug)),
		[items],
	)
	const availableProducts = useMemo(
		() => products.filter((p) => !takenSlugs.has(p.slug)),
		[products, takenSlugs],
	)

	const [adding, setAdding] = useState(false)
	const [addDraft, setAddDraft] = useState({
		productSlug: '',
		rawCost: 0,
		leadTimeDays: 7,
		minOrderQty: 1,
	})

	function startAdd() {
		setAddDraft({
			productSlug: availableProducts[0]?.slug ?? '',
			rawCost: 0,
			leadTimeDays: 7,
			minOrderQty: 1,
		})
		setAdding(true)
	}

	function commitAdd() {
		if (!supplierName || !addDraft.productSlug) return
		addMutation.mutate(
			{
				supplierName,
				productSlug: addDraft.productSlug,
				rawCost: addDraft.rawCost,
				leadTimeDays: addDraft.leadTimeDays,
				minOrderQty: addDraft.minOrderQty,
				isPrimary: false,
				notes: null,
			},
			{
				onSuccess: () => {
					setAdding(false)
				},
			},
		)
	}

	if (!supplierName) {
		return (
			<div className="py-2">
				<EmployeeStatusPill>{t('items.saveFirst')}</EmployeeStatusPill>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{/* Header row — field labels in mono */}
			{!itemsPending && !itemsError && items.length > 0 && (
				<div
					className="hidden px-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)] lg:grid lg:items-center lg:gap-3"
					style={{
						gridTemplateColumns: '20px minmax(0, 1fr) 90px 70px 70px 20px',
					}}
				>
					<span />
					<span>{t('items.columns.product')}</span>
					<span className="text-end">{t('items.columns.cost')}</span>
					<span className="text-end">{t('items.columns.lead')}</span>
					<span className="text-end">{t('items.columns.minQty')}</span>
					<span />
				</div>
			)}

			{/* Item rows */}
			{itemsError ? (
				<EmployeeStatusPill tone="danger">
					{t('items.error')}
				</EmployeeStatusPill>
			) : itemsPending ? (
				<EmployeeStatusPill>{t('items.loading')}</EmployeeStatusPill>
			) : items.length === 0 ? (
				<EmployeeStatusPill>{t('items.empty')}</EmployeeStatusPill>
			) : (
				<ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
					{items.map((it) => {
						const product = productBySlug.get(it.productSlug)
						return (
							<li key={it.id}>
								<div
									className="flex flex-col gap-3 px-1 py-3 lg:grid lg:items-center lg:gap-3 lg:py-2.5"
									style={{
										gridTemplateColumns:
											'20px minmax(0, 1fr) 90px 70px 70px 20px',
									}}
								>
									<div className="flex items-center gap-3 lg:contents">
										{/* Primary star toggle */}
										<button
											type="button"
											disabled={readOnly || updateMutation.isPending}
											onClick={() =>
												updateMutation.mutate({
													id: it.id,
													isPrimary: !it.isPrimary,
												})
											}
											aria-label={t('items.togglePrimary')}
											className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/[0.08] bg-[var(--color-surface)] outline-none transition-colors hover:bg-[var(--color-primary)]/[0.05] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 dark:border-white/[0.1]"
										>
											<Star
												size={15}
												strokeWidth={2}
												className={
													it.isPrimary
														? 'fill-[var(--color-primary)] text-[var(--color-primary)]'
														: 'text-[var(--color-text-subtle)]'
												}
											/>
										</button>

										{/* Product name */}
										<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[13px] font-semibold leading-snug text-[var(--color-text)]">
											{product?.name ?? it.productSlug}
										</span>
									</div>

									{/* Cost — react-aria NumberField commits on blur/Enter */}
									<ItemValue label={t('items.columns.cost')}>
										<NumberControl
											value={it.rawCost}
											readOnly={readOnly}
											onChange={(v) =>
												updateMutation.mutate({ id: it.id, rawCost: v })
											}
											suffix="EGP"
											min={0}
											ariaLabel={t('items.columns.cost')}
										/>
									</ItemValue>

									{/* Lead days */}
									<ItemValue label={t('items.columns.lead')}>
										<NumberControl
											value={it.leadTimeDays}
											readOnly={readOnly}
											onChange={(v) =>
												updateMutation.mutate({ id: it.id, leadTimeDays: v })
											}
											suffix="d"
											min={0}
											ariaLabel={t('items.columns.lead')}
										/>
									</ItemValue>

									{/* Min order qty */}
									<ItemValue label={t('items.columns.minQty')}>
										<NumberControl
											value={it.minOrderQty}
											readOnly={readOnly}
											onChange={(v) =>
												updateMutation.mutate({ id: it.id, minOrderQty: v })
											}
											min={0}
											ariaLabel={t('items.columns.minQty')}
										/>
									</ItemValue>

									{/* Remove */}
									{!readOnly ? (
										<button
											type="button"
											onClick={() => {
												if (
													typeof window !== 'undefined' &&
													!window.confirm(t('items.confirmRemove'))
												)
													return
												removeMutation.mutate(it.id)
											}}
											aria-label={t('items.remove')}
											disabled={removeMutation.isPending}
											className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-600/20 bg-red-600/[0.05] text-red-700 outline-none transition-colors hover:bg-red-600/[0.09] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-red-600/25 dark:text-red-300"
										>
											<X size={14} strokeWidth={2.1} />
										</button>
									) : (
										<span />
									)}
								</div>
							</li>
						)
					})}
				</ul>
			)}

			{/* Add row — only surfaced in edit/create mode and only when at least
          one product isn't already in the supplier's list. */}
			{!readOnly && productsError && (
				<EmployeeStatusPill tone="danger">
					{t('items.productsError')}
				</EmployeeStatusPill>
			)}

			{!readOnly && productsPending && (
				<EmployeeStatusPill>{t('items.productsLoading')}</EmployeeStatusPill>
			)}

			{!readOnly &&
				!productsPending &&
				!productsError &&
				availableProducts.length > 0 && (
					<div className="pt-2">
						{adding ? (
							<AddItemForm
								products={availableProducts}
								draft={addDraft}
								setDraft={setAddDraft}
								onCommit={commitAdd}
								onCancel={() => setAdding(false)}
								committing={addMutation.isPending}
							/>
						) : (
							<EmployeeActionButton
								onClick={startAdd}
								tone="primary"
								size="sm"
								leading={<Plus size={14} strokeWidth={2.2} />}
								fullWidthOnMobile
							>
								{t('items.add')}
							</EmployeeActionButton>
						)}
					</div>
				)}
		</div>
	)
}

// ─── Add-item form — inline compact row ───

function AddItemForm({
	products,
	draft,
	setDraft,
	onCommit,
	onCancel,
	committing,
}: {
	products: CatalogProduct[]
	draft: {
		productSlug: string
		rawCost: number
		leadTimeDays: number
		minOrderQty: number
	}
	setDraft: (d: typeof draft) => void
	onCommit: () => void
	onCancel: () => void
	committing: boolean
}) {
	const { t } = useTranslation('admin')
	const options = products.map((p) => ({
		value: p.slug,
		label: `${p.name} · ${p.sku}`,
	}))

	return (
		<div className="space-y-3 rounded-md border border-[var(--color-border)] bg-black/[0.015] p-3 dark:bg-white/[0.02]">
			<SelectControl
				value={draft.productSlug}
				onChange={(v) => setDraft({ ...draft, productSlug: v })}
				options={options}
				ariaLabel={t('items.columns.product')}
			/>
			<div className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
				<NumberControl
					value={draft.rawCost}
					onChange={(v) => setDraft({ ...draft, rawCost: v })}
					ariaLabel={t('items.columns.cost')}
					suffix="EGP"
					min={0}
				/>
				<NumberControl
					value={draft.leadTimeDays}
					onChange={(v) => setDraft({ ...draft, leadTimeDays: v })}
					ariaLabel={t('items.columns.lead')}
					suffix="d"
					min={0}
				/>
				<NumberControl
					value={draft.minOrderQty}
					onChange={(v) => setDraft({ ...draft, minOrderQty: v })}
					ariaLabel={t('items.columns.minQty')}
					min={0}
				/>
			</div>
			<div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
				<LinkAction
					tone="primary"
					onClick={onCommit}
					disabled={committing || !draft.productSlug}
				>
					{t('items.add')}
				</LinkAction>
				<LinkAction onClick={onCancel}>{t('actions.cancel')}</LinkAction>
			</div>
		</div>
	)
}

function ItemValue({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<div className="min-w-0">
			<span className="mb-1 block font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)] lg:hidden">
				{label}
			</span>
			{children}
		</div>
	)
}

/**
 * Count helper — exposed so the supplier index can show items-per-supplier
 * without the volume component having to know the query key.
 */
export function useSupplierItemCount(supplierName: string): number {
	const { data = [] } = useQuery({
		queryKey: ['admin', 'supplierItems', supplierName],
		queryFn: () => adminListSupplierItems({ data: { supplierName } }),
	})
	return (data as SupplierPriceRow[]).length
}
