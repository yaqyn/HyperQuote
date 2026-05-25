/**
 * Product detail - responsive catalog view.
 *
 * Follows the website market detail interaction model: image-first hero,
 * centered mobile/tablet copy, desktop quote action card, and mobile bottom CTA.
 */

import { formatWeightKg } from '@hyperquote/i18n'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	ArrowLeft,
	Check,
	ChevronRight,
	Package,
	Pencil,
	Plus,
	Undo2,
} from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Group } from 'react-aria-components/Group'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { NumberField } from 'react-aria-components/NumberField'
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../../components/shell/PortalTitleRow'
import { portalHead } from '../../../lib/page-meta'
import { getMarketProducts } from '../../../lib/server/market'
import { useDraftQuoteStore } from '../../../stores/draft-quote'

export const Route = createFileRoute('/_portal/market/$productSlug')({
	head: ({ params }) =>
		portalHead({
			title: 'Product Detail — HyperQuote Portal',
			description:
				'Private HyperQuote portal product detail for reviewing specifications and adding material quantities to a quote draft.',
			path: `/market/${params.productSlug}`,
		}),
	component: ProductDetailPage,
})

function ProductDetailPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const { productSlug } = Route.useParams()
	const isAr = i18n.language === 'ar'
	const locale = isAr ? 'ar' : 'en'

	const { data: allData, isLoading } = useQuery({
		queryKey: ['market-products-all'],
		queryFn: () => getMarketProducts({ data: { page: 1, limit: 50 } }),
		staleTime: 120_000,
	})

	const allProducts = allData?.products ?? []
	const product = allProducts.find((p) => p.slug === productSlug)
	const related = product
		? allProducts
				.filter((p) => p.category === product.category && p.id !== product.id)
				.slice(0, 4)
		: []

	if (isLoading) return <DetailSkeleton />
	if (!product) return <NotFound onBack={() => navigate({ to: '/market' })} />

	const productName = isAr ? product.nameAr : product.name
	const description = isAr ? product.descriptionAr : product.description
	const categoryLabel =
		isAr && product.categoryNameAr
			? product.categoryNameAr
			: product.categoryName
	const unitLabel =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure

	const formatPrice = (min: number | null, max: number | null) => {
		if (min == null && max == null) return null
		const fmt = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
			maximumFractionDigits: 0,
		})
		if (min != null && max != null)
			return `${fmt.format(min)} – ${fmt.format(max)}`
		if (min != null) return `${fmt.format(min)}+`
		if (max != null) return fmt.format(max)
		return null
	}
	const priceLabel = formatPrice(product.priceRangeMin, product.priceRangeMax)
	const specs = [
		...(product.weightKg != null
			? [
					{
						label: t('market.weight'),
						value: formatWeightKg(product.weightKg, locale),
					},
				]
			: []),
		...product.specs.map((spec) => ({
			label: isAr ? spec.labelAr : spec.label,
			value: isAr && spec.valueAr ? spec.valueAr : spec.value,
		})),
	]

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)] pb-40 md:pb-0">
			<div className="px-4 pb-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12">
				<div className="mx-auto flex w-full max-w-[1400px] items-center gap-2">
					<button
						type="button"
						onClick={() => navigate({ to: '/market' })}
						className="inline-flex min-h-10 items-center gap-2 text-[13px] font-medium text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)] sm:min-h-0"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('market.backToMarket')}
					</button>
					<ChevronRight
						size={11}
						className="shrink-0 text-[var(--p-text-faint)] rtl:rotate-180"
					/>
					<span className="min-w-0 truncate text-[13px] text-[var(--p-text-muted)]">
						{categoryLabel}
					</span>
				</div>
			</div>

			<main className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-12 lg:pb-16">
				<div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_1fr] lg:gap-16 xl:gap-20">
					<ProductImage imageUrl={product.imageUrl} name={productName} />

					<section className="flex flex-col items-center text-center lg:items-start lg:py-2 lg:text-start">
						<p className="text-[12px] font-semibold uppercase text-[var(--p-accent)]">
							{categoryLabel}
						</p>

						<PortalTitleRow
							title={productName}
							align="center"
							fixed
							showSidebarButton={false}
							className="mt-4 max-w-full lg:justify-start"
						/>

						<div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
							<span className="max-w-full truncate font-mono text-[12px] text-[var(--p-text-muted)]">
								{product.slug}
							</span>
						</div>

						{priceLabel && (
							<div className="mt-6 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 md:mt-8 lg:justify-start">
								<p
									className="break-all font-mono text-[24px] font-semibold text-[var(--p-accent)] sm:text-[28px]"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									EGP {priceLabel}
								</p>
								<span className="font-mono text-[12px] text-[var(--p-text-muted)]">
									/ {unitLabel}
								</span>
							</div>
						)}

						{description && (
							<p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.75] text-[var(--p-text-secondary)] lg:mx-0 lg:mt-6">
								{description}
							</p>
						)}

						<div className="mx-auto mt-8 hidden w-full max-w-[560px] md:block lg:mx-0 lg:mt-10 lg:max-w-none">
							<RecordAction product={product} />
						</div>
					</section>
				</div>

				{specs.length > 0 && (
					<section className="mt-10 sm:mt-12 lg:mt-14">
						<header className="mb-3 flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--p-border)] pb-2.5">
							<h2 className="text-[16px] font-semibold text-[var(--p-text)]">
								{t('market.specifications')}
							</h2>
							<span className="font-mono text-[11px] text-[var(--p-text-faint)]">
								{isAr
									? specs.length.toLocaleString('ar-EG')
									: String(specs.length).padStart(2, '0')}
							</span>
						</header>
						<div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
							{specs.map((spec) => (
								<div
									key={spec.label}
									className="min-w-0 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2.5"
								>
									<p className="line-clamp-1 text-[11px] font-medium text-[var(--p-text-muted)]">
										{spec.label}
									</p>
									<p
										className="mt-1 break-words font-mono text-[13px] font-medium leading-snug text-[var(--p-text)]"
										style={{ fontVariantNumeric: 'tabular-nums' }}
									>
										{spec.value}
									</p>
								</div>
							))}
						</div>
					</section>
				)}

				{related.length > 0 && (
					<section className="mt-12 sm:mt-16">
						<header className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--p-border)] pb-3">
							<h2 className="text-[18px] font-semibold text-[var(--p-text)]">
								{t('market.relatedProducts')}
							</h2>
							<span className="max-w-full truncate text-[13px] text-[var(--p-text-muted)]">
								{categoryLabel}
							</span>
						</header>
						<div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
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
										<div className="aspect-square overflow-hidden rounded-xl bg-[var(--p-surface)] ring-1 ring-inset ring-[var(--p-border)]">
											{rel.imageUrl ? (
												<img
													src={rel.imageUrl}
													alt={relName}
													loading="lazy"
													className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center text-[var(--p-text-faint)]">
													<Package size={24} />
												</div>
											)}
										</div>
										<p className="mt-3 line-clamp-2 break-words px-0.5 text-[14px] font-semibold leading-snug text-[var(--p-text)] sm:text-[13px]">
											{relName}
										</p>
										<p className="mt-1 px-0.5 font-mono text-[11px] text-[var(--p-text-muted)]">
											{isAr && rel.unitOfMeasureAr
												? rel.unitOfMeasureAr
												: rel.unitOfMeasure}
										</p>
									</button>
								)
							})}
						</div>
					</section>
				)}
			</main>

			<MobileRecordBar product={product} />
		</div>
	)
}

// ---------------------------------------------------------------------------
// Product image + mobile action surface
// ---------------------------------------------------------------------------

function ProductImage({ imageUrl, name }: { imageUrl: string; name: string }) {
	return (
		<div className="lg:sticky lg:top-8 lg:self-start">
			<div className="group aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--p-surface)] ring-1 ring-inset ring-[var(--p-border)] lg:aspect-[5/6]">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={name}
						loading="eager"
						className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-[var(--p-text-faint)]">
						<Package size={40} />
					</div>
				)}
			</div>
		</div>
	)
}

function MobileRecordBar({ product }: { product: ActionProduct }) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--p-border)] bg-[var(--p-bg)]/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-18px_45px_rgba(15,15,15,0.12)] backdrop-blur md:hidden">
			<RecordAction product={product} variant="bar" />
		</div>
	)
}

// ---------------------------------------------------------------------------
// Record action — idle / selecting / added
// ---------------------------------------------------------------------------

type RecordMode = 'idle' | 'selecting' | 'added'
type RecordVariant = 'panel' | 'bar'

interface ActionProduct {
	id: string
	slug: string
	name: string
	nameAr: string
	category: string
	categoryName: string
	categoryNameAr: string
	unitOfMeasure: string
	unitOfMeasureAr: string
	imageUrl: string
	availabilityStatus: string
}

function RecordAction({
	product,
	variant = 'panel',
}: {
	product: ActionProduct
	variant?: RecordVariant
}) {
	const { t, i18n } = useTranslation('portal')
	const { add, remove, items, updateQuantity } = useDraftQuoteStore()
	const cartItem = items.find((i) => i.productId === product.id)
	const [quantity, setQuantity] = useState(1)
	const [mode, setMode] = useState<RecordMode>(cartItem ? 'added' : 'idle')
	const isBar = variant === 'bar'
	const isOrderable = product.availabilityStatus !== 'out_of_stock'
	const unitLabel =
		i18n.language === 'ar' && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure
	const shellClass = isBar
		? 'w-full'
		: 'rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 sm:p-5 lg:p-6'
	const primaryClass = `${isBar ? 'h-12' : 'h-14'} inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-5 text-[14px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50`

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
		if (!isOrderable) return
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
					categoryName: product.categoryName,
					categoryNameAr: product.categoryNameAr,
					unitOfMeasure: product.unitOfMeasure,
					unitOfMeasureAr: product.unitOfMeasureAr,
					imageUrl: product.imageUrl,
				},
				q,
			)
		}
		setQuantity(q)
		setMode('added')
	}

	const handleEdit = () => {
		if (!isOrderable) return
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
			<div className={shellClass}>
				<button
					type="button"
					onClick={() => setMode('selecting')}
					disabled={!isOrderable}
					className={primaryClass}
				>
					<Plus size={16} />
					{isOrderable ? t('market.record') : t('market.outOfStock')}
				</button>
			</div>
		)
	}

	if (mode === 'selecting') {
		return (
			<div className={shellClass}>
				<NumberField
					value={quantity}
					onChange={(v) => setQuantity(v)}
					minValue={1}
					step={1}
					className={isBar ? 'mb-2' : 'mb-4'}
				>
					<Label className="sr-only">{t('market.quantity')}</Label>
					<Group
						className={`${isBar ? 'h-12' : 'h-14'} flex items-center overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-input)]`}
					>
						<Button
							slot="decrement"
							className="flex h-full w-12 shrink-0 items-center justify-center border-e border-[var(--p-border)] text-[20px] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] sm:w-14"
						>
							-
						</Button>
						<div className="flex flex-1 items-center justify-center gap-2 px-3">
							<Input
								ref={inputRef}
								onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
									if (e.key === 'Enter')
										confirmWith(parseInt(e.currentTarget.value, 10) || 1)
									if (e.key === 'Escape') setMode(cartItem ? 'added' : 'idle')
								}}
								className="h-full w-16 bg-transparent text-center font-mono text-[20px] font-semibold text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							/>
							<span className="min-w-0 truncate text-[13px] font-medium text-[var(--p-text-muted)]">
								{unitLabel}
							</span>
						</div>
						<Button
							slot="increment"
							className="flex h-full w-12 shrink-0 items-center justify-center border-s border-[var(--p-border)] text-[20px] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] sm:w-14"
						>
							+
						</Button>
					</Group>
				</NumberField>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setMode(cartItem ? 'added' : 'idle')}
						className={`${isBar ? 'h-12 w-12' : 'h-14 w-14'} inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]`}
						aria-label={t('orders.cancel')}
					>
						<ArrowLeft size={18} className="rtl:rotate-180" />
					</button>
					<button
						type="button"
						onClick={() => confirmWith(quantity)}
						disabled={!isOrderable}
						className={primaryClass}
					>
						<Check size={18} />
						{t('market.confirm')}
					</button>
				</div>
			</div>
		)
	}

	// added
	return (
		<div className={shellClass}>
			{cartItem && (
				<p
					className={`${isBar ? 'mb-2 text-[12px]' : 'mb-4 text-[13px]'} text-[var(--p-text-muted)]`}
					aria-live="polite"
				>
					<span
						className="font-mono font-semibold text-[var(--p-text)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{cartItem.quantity}
					</span>{' '}
					{unitLabel} {t('market.inQuote')}
				</p>
			)}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleRemove}
					className={`${isBar ? 'h-12 w-12' : 'h-14 w-14'} inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-error)] hover:text-[var(--p-error)]`}
					aria-label={t('market.removeItem')}
				>
					<Undo2 size={18} />
				</button>
				<button
					type="button"
					onClick={handleEdit}
					disabled={!isOrderable}
					className={`${isBar ? 'h-12' : 'h-14'} inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-5 text-[14px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-accent)] hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-50`}
				>
					<Pencil size={16} />
					{t('market.amend')}
				</button>
			</div>
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
			<div className="px-4 pb-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12">
				<div className="mx-auto h-4 w-44 max-w-[1400px] animate-pulse rounded-full bg-[var(--p-border)]" />
			</div>
			<div className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-12 lg:pb-16">
				<div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_1fr] lg:gap-16 xl:gap-20">
					<div className="aspect-[16/10] animate-pulse rounded-2xl bg-[var(--p-surface)] lg:aspect-[5/6]" />
					<div className="flex flex-col items-center space-y-5 text-center lg:items-start lg:text-start">
						<div className="h-4 w-28 animate-pulse rounded-full bg-[var(--p-border)]" />
						<div className="h-10 w-3/4 animate-pulse rounded-full bg-[var(--p-border)] sm:h-12" />
						<div className="h-4 w-1/2 animate-pulse rounded-full bg-[var(--p-border)]" />
						<div className="h-7 w-44 animate-pulse rounded-full bg-[var(--p-border)]" />
						<div className="space-y-2 pt-4">
							<div className="h-3 w-80 max-w-full animate-pulse rounded-full bg-[var(--p-border)]" />
							<div className="h-3 w-72 max-w-full animate-pulse rounded-full bg-[var(--p-border)]" />
							<div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-[var(--p-border)]" />
						</div>
						<div className="hidden h-24 w-full max-w-[560px] animate-pulse rounded-2xl bg-[var(--p-card)] md:block lg:max-w-none" />
					</div>
				</div>
				<div className="mt-10 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:mt-12 sm:grid-cols-3 lg:mt-14 lg:grid-cols-4">
					{SK_SPECS.map((s) => (
						<div
							key={s}
							className="space-y-1.5 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2.5"
						>
							<div className="h-3 w-16 animate-pulse rounded-full bg-[var(--p-border)]" />
							<div className="h-3.5 w-24 animate-pulse rounded-full bg-[var(--p-border)]" />
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
				className="rounded-xl border border-[var(--p-border-strong)] px-4 py-2 text-[13px] font-semibold text-[var(--p-text)] hover:bg-[var(--p-hover)]"
			>
				{t('market.backToMarket')}
			</button>
		</div>
	)
}
