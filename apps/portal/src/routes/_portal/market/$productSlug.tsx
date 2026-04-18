/**
 * Product detail — referenced material plate, expanded.
 *
 * Same inventory-plate language as the grid: reference number stamped above,
 * 4:3 image on the inline-start, name + price + record action on the inline-end,
 * specs as a grid of hairline cells, related plates as smaller siblings below.
 * Inter throughout, Geist Mono for figures.
 */

import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, Pencil, Plus, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button, Group, Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getMarketProducts } from '../../../lib/server/market'
import { useDraftQuoteStore } from '../../../stores/draft-quote'

export const Route = createFileRoute('/_portal/market/$productSlug')({
	component: ProductDetailPage,
})

function ProductDetailPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const { productSlug } = Route.useParams()
	const isAr = i18n.language === 'ar'

	const { data: allData, isLoading } = useQuery({
		queryKey: ['market-products-all'],
		queryFn: () => getMarketProducts({ data: { page: 1, limit: 50 } }),
		staleTime: 120_000,
	})

	const allProducts = allData?.products ?? []
	const product = allProducts.find((p) => p.slug === productSlug)
	const refIndex = product
		? allProducts.findIndex((p) => p.id === product.id) + 1
		: 0
	const related = product
		? allProducts
				.filter((p) => p.category === product.category && p.id !== product.id)
				.slice(0, 4)
		: []

	if (isLoading) return <DetailSkeleton />
	if (!product) return <NotFound onBack={() => navigate({ to: '/market' })} />

	const productName = isAr ? product.nameAr : product.name
	const description = isAr ? product.descriptionAr : product.description
	const categoryLabel = t(`market.cat.${product.category}`, {
		defaultValue: product.category.replace(/_/g, ' '),
	})

	const availLabel =
		product.availabilityStatus === 'available'
			? t('market.available')
			: product.availabilityStatus === 'limited'
				? t('market.limited')
				: t('market.outOfStock')

	const formatPrice = (min: number | null, max: number | null) => {
		if (min == null && max == null) return null
		const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
			maximumFractionDigits: 0,
		})
		if (min != null && max != null)
			return `${fmt.format(min)} – ${fmt.format(max)}`
		if (min != null) return `${fmt.format(min)}+`
		if (max != null) return fmt.format(max)
		return null
	}
	const priceLabel = formatPrice(product.priceRangeMin, product.priceRangeMax)
	const refNo = isAr
		? refIndex.toLocaleString('ar-EG')
		: String(refIndex).padStart(3, '0')

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			{/* Top bar */}
			<div className="border-b border-[var(--p-border)] bg-[var(--p-bg)] px-6 py-3.5 lg:px-12">
				<div className="mx-auto flex w-full max-w-[1280px] items-center gap-4">
					<button
						type="button"
						onClick={() => navigate({ to: '/market' })}
						className="inline-flex items-center gap-2 text-[13px] text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)]"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('market.backToMarket')}
					</button>
					<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
						/
					</span>
					<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
						{categoryLabel}
					</span>
				</div>
			</div>

			{/* Body */}
			<div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-12 lg:py-14">
				{/* Reference + name */}
				<div className="mb-8 flex items-baseline justify-between gap-4">
					<span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-faint)]">
						№ {refNo}
					</span>
					<AvailabilityTag
						status={product.availabilityStatus}
						label={availLabel}
					/>
				</div>

				<div className="grid grid-cols-1 gap-10 lg:grid-cols-[5fr_4fr] lg:gap-16">
					{/* Image plate */}
					<div className="overflow-hidden rounded-sm bg-[var(--p-surface)] ring-1 ring-inset ring-[var(--p-border)]">
						<div className="aspect-[4/3]">
							<img
								src={product.imageUrl}
								alt={productName}
								className="h-full w-full object-cover"
							/>
						</div>
					</div>

					{/* Info */}
					<div className="flex flex-col">
						<h1 className="text-[28px] font-medium leading-tight tracking-tight text-[var(--p-text)] lg:text-[36px]">
							{productName}
						</h1>

						{priceLabel && (
							<div className="mt-6 flex items-baseline gap-2 border-t border-[var(--p-border)] pt-5">
								<p
									className="font-mono text-[28px] font-medium text-[var(--p-text)]"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									EGP {priceLabel}
								</p>
								<span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
									/ {product.unitOfMeasure}
								</span>
							</div>
						)}

						{description && (
							<p className="mt-6 max-w-prose text-[14px] leading-relaxed text-[var(--p-text-secondary)]">
								{description}
							</p>
						)}

						<div className="mt-9">
							<RecordAction product={product} />
						</div>
					</div>
				</div>

				{/* Specs */}
				{product.specs.length > 0 && (
					<section className="mt-16">
						<header className="mb-3 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-2">
							<h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text)]">
								{t('market.specifications')}
							</h2>
							<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
								{isAr
									? product.specs.length.toLocaleString('ar-EG')
									: String(product.specs.length).padStart(2, '0')}
							</span>
						</header>
						<div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--p-border)] bg-[var(--p-border)] sm:grid-cols-3 md:grid-cols-4">
							{product.specs.map((spec) => (
								<div key={spec.label} className="bg-[var(--p-bg)] px-4 py-4">
									<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
										{isAr ? spec.labelAr : spec.label}
									</p>
									<p
										className="mt-2 font-mono text-[15px] font-medium text-[var(--p-text)]"
										style={{ fontVariantNumeric: 'tabular-nums' }}
									>
										{spec.value}
									</p>
								</div>
							))}
						</div>
					</section>
				)}

				{/* Related */}
				{related.length > 0 && (
					<section className="mt-16">
						<header className="mb-3 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-2">
							<h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text)]">
								{t('market.relatedProducts')}
							</h2>
							<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
								{categoryLabel}
							</span>
						</header>
						<div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
							{related.map((rel) => {
								const relName = isAr ? rel.nameAr : rel.name
								return (
									<button
										key={rel.id}
										type="button"
										onClick={() =>
											navigate({
												to: '/market/$productSlug',
												params: { productSlug: rel.slug },
											})
										}
										className="group block text-start"
									>
										<div className="aspect-[4/3] overflow-hidden rounded-sm bg-[var(--p-surface)] ring-1 ring-inset ring-[var(--p-border)]">
											<img
												src={rel.imageUrl}
												alt={relName}
												loading="lazy"
												className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
											/>
										</div>
										<p className="mt-3 line-clamp-2 px-0.5 text-[13px] font-medium text-[var(--p-text)]">
											{relName}
										</p>
									</button>
								)
							})}
						</div>
					</section>
				)}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Availability tag — mono pill with luminance dot
// ---------------------------------------------------------------------------

function AvailabilityTag({
	status,
	label,
}: {
	status: 'available' | 'limited' | 'out_of_stock'
	label: string
}) {
	const cls =
		status === 'available'
			? 'bg-[var(--p-success)]'
			: status === 'limited'
				? 'bg-[var(--p-warning)]'
				: 'bg-[var(--p-text-faint)]'
	return (
		<span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
			<span className={`h-1.5 w-1.5 rounded-full ${cls}`} />
			{label}
		</span>
	)
}

// ---------------------------------------------------------------------------
// Record action — idle / selecting / added
// ---------------------------------------------------------------------------

type RecordMode = 'idle' | 'selecting' | 'added'

interface ActionProduct {
	id: string
	slug: string
	name: string
	nameAr: string
	category: string
	unitOfMeasure: string
	imageUrl: string
}

function RecordAction({ product }: { product: ActionProduct }) {
	const { t } = useTranslation('portal')
	const { add, remove, items, updateQuantity } = useDraftQuoteStore()
	const cartItem = items.find((i) => i.productId === product.id)
	const [quantity, setQuantity] = useState(1)
	const [mode, setMode] = useState<RecordMode>(cartItem ? 'added' : 'idle')

	useEffect(() => {
		if (!cartItem && mode === 'added') setMode('idle')
		if (cartItem && mode === 'idle') setMode('added')
	}, [cartItem, mode])

	const inputRef = useCallback(
		(el: HTMLInputElement | null) => {
			if (el && mode === 'selecting') {
				requestAnimationFrame(() => {
					el.focus()
					el.select()
				})
			}
		},
		[mode],
	)

	const confirmWith = (qty: number) => {
		const q = Math.max(1, qty)
		if (cartItem) {
			updateQuantity(product.id, q)
		} else {
			add(
				{
					productId: product.id,
					slug: product.slug,
					name: product.name,
					nameAr: product.nameAr,
					category: product.category,
					unitOfMeasure: product.unitOfMeasure,
					imageUrl: product.imageUrl,
				},
				q,
			)
		}
		setQuantity(q)
		setMode('added')
	}

	const handleEdit = () => {
		if (cartItem) setQuantity(cartItem.quantity)
		setMode('selecting')
	}

	const handleRemove = () => {
		remove(product.id)
		setQuantity(1)
		setMode('idle')
	}

	if (mode === 'idle') {
		return (
			<button
				type="button"
				onClick={() => setMode('selecting')}
				className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-[var(--p-text)] px-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--p-bg)] hover:opacity-90"
			>
				<Plus size={14} />
				{t('market.record')}
			</button>
		)
	}

	if (mode === 'selecting') {
		return (
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<NumberField
					value={quantity}
					onChange={(v) => setQuantity(v)}
					minValue={1}
					step={1}
				>
					<Label className="sr-only">{t('market.quantity')}</Label>
					<Group className="flex h-12 items-center overflow-hidden rounded-sm border border-[var(--p-border-strong)] bg-[var(--p-input)]">
						<Button
							slot="decrement"
							className="flex h-full w-12 items-center justify-center text-[18px] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
						>
							−
						</Button>
						<div className="flex flex-1 items-center justify-center gap-2 px-3">
							<Input
								ref={inputRef}
								onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
									if (e.key === 'Enter')
										confirmWith(parseInt(e.currentTarget.value, 10) || 1)
									if (e.key === 'Escape') setMode(cartItem ? 'added' : 'idle')
								}}
								className="w-16 bg-transparent text-center font-mono text-[18px] font-medium text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							/>
							<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
								{product.unitOfMeasure}
							</span>
						</div>
						<Button
							slot="increment"
							className="flex h-full w-12 items-center justify-center text-[18px] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
						>
							+
						</Button>
					</Group>
				</NumberField>
				<button
					type="button"
					onClick={() => confirmWith(quantity)}
					className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-[var(--p-text)] px-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--p-bg)] hover:opacity-90"
				>
					<Check size={14} />
					{t('market.confirm')}
				</button>
				<button
					type="button"
					onClick={() => setMode(cartItem ? 'added' : 'idle')}
					className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)] hover:text-[var(--p-text)]"
				>
					{t('orders.cancel')}
				</button>
			</div>
		)
	}

	// added
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div
				className="inline-flex h-12 items-center gap-3 rounded-sm border border-[var(--p-border-strong)] bg-[var(--p-input)] px-4"
				aria-live="polite"
			>
				<Check size={14} className="text-[var(--p-text)]" />
				<span
					className="font-mono text-[14px] font-medium text-[var(--p-text)]"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				>
					{cartItem?.quantity}
				</span>
				<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
					{product.unitOfMeasure} · {t('market.inQuote')}
				</span>
			</div>
			<button
				type="button"
				onClick={handleEdit}
				className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-[var(--p-border-strong)] px-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--p-text)] hover:bg-[var(--p-hover)]"
			>
				<Pencil size={13} />
				{t('market.amend')}
			</button>
			<button
				type="button"
				onClick={handleRemove}
				className="inline-flex h-12 items-center justify-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)] hover:text-[var(--p-error)]"
			>
				<Undo2 size={13} />
				{t('market.removeItem')}
			</button>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Skeleton + not-found
// ---------------------------------------------------------------------------

const SK_SPECS = ['s1', 's2', 's3', 's4'] as const

function DetailSkeleton() {
	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			<div className="border-b border-[var(--p-border)] bg-[var(--p-bg)] px-6 py-3.5 lg:px-12">
				<div className="mx-auto h-3 w-32 max-w-[1280px] animate-pulse bg-[var(--p-border)]" />
			</div>
			<div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-12 lg:py-14">
				<div className="mb-8 flex items-baseline justify-between">
					<div className="h-3 w-16 animate-pulse bg-[var(--p-border)]" />
					<div className="h-3 w-20 animate-pulse bg-[var(--p-border)]" />
				</div>
				<div className="grid grid-cols-1 gap-10 lg:grid-cols-[5fr_4fr] lg:gap-16">
					<div className="aspect-[4/3] animate-pulse rounded-sm bg-[var(--p-surface)]" />
					<div className="space-y-5">
						<div className="h-9 w-3/4 animate-pulse bg-[var(--p-border)]" />
						<div className="h-7 w-1/2 animate-pulse bg-[var(--p-border)]" />
						<div className="space-y-2 pt-4">
							<div className="h-3 w-full animate-pulse bg-[var(--p-border)]" />
							<div className="h-3 w-5/6 animate-pulse bg-[var(--p-border)]" />
							<div className="h-3 w-2/3 animate-pulse bg-[var(--p-border)]" />
						</div>
						<div className="h-12 w-40 animate-pulse rounded-sm bg-[var(--p-border)]" />
					</div>
				</div>
				<div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-[var(--p-border)] sm:grid-cols-4">
					{SK_SPECS.map((s) => (
						<div key={s} className="space-y-2 bg-[var(--p-bg)] p-4">
							<div className="h-3 w-16 animate-pulse bg-[var(--p-border)]" />
							<div className="h-4 w-24 animate-pulse bg-[var(--p-border)]" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function NotFound({ onBack }: { onBack: () => void }) {
	const { t } = useTranslation('portal')
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--p-bg)] px-6 text-center">
			<p className="text-[16px] text-[var(--p-text-muted)]">
				{t('quoteDetail.emptyHeading')}
			</p>
			<button
				type="button"
				onClick={onBack}
				className="rounded-sm border border-[var(--p-border-strong)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text)] hover:bg-[var(--p-hover)]"
			>
				{t('market.backToMarket')}
			</button>
		</div>
	)
}
