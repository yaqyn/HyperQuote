import type { CatalogProduct } from '@hyperquote/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Star, X } from 'lucide-react'
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

	const { data: items = [] } = useQuery({
		queryKey: ['admin', 'supplierItems', supplierName ?? ''],
		queryFn: () =>
			adminListSupplierItems({ data: { supplierName: supplierName ?? '' } }),
		enabled: Boolean(supplierName),
	})

	const { data: products = [] } = useQuery({
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
			<div className="py-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
				{t('items.saveFirst')}
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{/* Header row — field labels in mono */}
			{items.length > 0 && (
				<div
					className="grid items-center gap-3 px-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]"
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
			{items.length === 0 ? (
				<p className="py-3 font-[family-name:var(--font-fraunces)] italic text-[14px] text-[var(--color-text-muted)]">
					{t('items.empty')}
				</p>
			) : (
				<ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
					{items.map((it) => {
						const product = productBySlug.get(it.productSlug)
						return (
							<li key={it.id}>
								<div
									className="grid items-center gap-3 px-1 py-2.5"
									style={{
										gridTemplateColumns:
											'20px minmax(0, 1fr) 90px 70px 70px 20px',
									}}
								>
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
										className="inline-flex items-center justify-center outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40 rounded-sm disabled:opacity-60"
									>
										<Star
											size={13}
											strokeWidth={1.5}
											className={
												it.isPrimary
													? 'fill-[var(--color-primary)] text-[var(--color-primary)]'
													: 'text-[var(--color-text-subtle)]'
											}
										/>
									</button>

									{/* Product name */}
									<span className="font-[family-name:var(--font-inter)] text-[13px] text-[var(--color-text)] truncate">
										{product?.name ?? it.productSlug}
									</span>

									{/* Cost — react-aria NumberField commits on blur/Enter */}
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

									{/* Lead days */}
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

									{/* Min order qty */}
									<NumberControl
										value={it.minOrderQty}
										readOnly={readOnly}
										onChange={(v) =>
											updateMutation.mutate({ id: it.id, minOrderQty: v })
										}
										min={0}
										ariaLabel={t('items.columns.minQty')}
									/>

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
											className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[var(--color-text-subtle)] hover:text-[#B3261E] dark:hover:text-[#E46B63] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40 transition-colors disabled:opacity-40"
										>
											<X size={12} strokeWidth={1.75} />
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
			{!readOnly && availableProducts.length > 0 && (
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
						<button
							type="button"
							onClick={startAdd}
							className="inline-flex items-center gap-1.5 font-[family-name:var(--font-inter)] text-[13px] font-medium text-[var(--color-primary)] border-b border-transparent hover:border-[var(--color-primary)] transition-colors outline-none focus-visible:border-[var(--color-primary)]"
						>
							<Plus size={13} strokeWidth={1.75} />
							{t('items.add')}
						</button>
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
		<div className="rounded-md border border-[var(--color-border)] bg-black/[0.015] dark:bg-white/[0.02] p-3 space-y-3">
			<SelectControl
				value={draft.productSlug}
				onChange={(v) => setDraft({ ...draft, productSlug: v })}
				options={options}
				ariaLabel={t('items.columns.product')}
			/>
			<div className="grid grid-cols-3 gap-3">
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
			<div className="flex items-center gap-4 pt-1">
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
