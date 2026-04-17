import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, ChevronRight, Pencil, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Button, Group, Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getMarketProducts } from '../../../lib/server/market'
import { useDraftQuoteStore } from '../../../stores/draft-quote'

export const Route = createFileRoute('/_portal/market/$productSlug')({
	component: ProductDetailPage,
})

const spring = { type: 'spring' as const, stiffness: 200, damping: 20 }

function ProductDetailPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const { productSlug } = Route.useParams()
	const isAr = i18n.language === 'ar'

	// Fetch all products to find current + related
	const { data: allData } = useQuery({
		queryKey: ['market-products-all'],
		queryFn: () => getMarketProducts({ data: { page: 1, limit: 50 } }),
		staleTime: 120_000,
	})

	const allProducts = allData?.products ?? []
	const match = allProducts.find((p) => p.slug === productSlug)

	const related = match
		? allProducts
				.filter((p) => p.category === match.category && p.id !== match.id)
				.slice(0, 3)
		: []

	const product = match
		? { ...match, related }
		: {
				id: `prod-${productSlug}`,
				slug: productSlug,
				name: productSlug
					.replace(/-/g, ' ')
					.replace(/\b\w/g, (c) => c.toUpperCase()),
				nameAr: productSlug,
				description: 'Product details will be available soon.',
				descriptionAr: 'تفاصيل المنتج ستكون متاحة قريبا.',
				category: 'general',
				unitOfMeasure: 'piece',
				priceRangeMin: 100 as number | null,
				priceRangeMax: 200 as number | null,
				availabilityStatus: 'available' as const,
				imageUrl: 'https://websiteassets.hyperquote.net/Images/cement.webp',
				specs: [] as { label: string; labelAr: string; value: string }[],
				related: [] as {
					slug: string
					name: string
					nameAr: string
					imageUrl: string
					category: string
					unitOfMeasure: string
				}[],
			}

	const productName = isAr ? product.nameAr : product.name
	const images = [product.imageUrl]
	const availDot =
		product.availabilityStatus === 'available'
			? 'bg-[var(--p-success)]'
			: product.availabilityStatus === 'limited'
				? 'bg-[var(--p-warning)]'
				: 'bg-[var(--p-text-muted)]'
	const availLabel =
		product.availabilityStatus === 'available'
			? t('market.available')
			: product.availabilityStatus === 'limited'
				? t('market.limited')
				: t('market.outOfStock')

	const formatPrice = (min: number | null, max: number | null) => {
		if (min == null && max == null) return '—'
		const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
			maximumFractionDigits: 0,
		})
		if (min != null && max != null)
			return `EGP ${fmt.format(min)} – ${fmt.format(max)}`
		if (min != null) return `EGP ${fmt.format(min)}+`
		if (max != null) return `EGP ${fmt.format(max)}`
		return '—'
	}

	const categoryLabel = t(`market.cat.${product.category}`, {
		defaultValue: product.category.replace(/_/g, ' '),
	})

	return (
		<div className="flex flex-col h-full min-h-0 overflow-y-auto">
			{/* Breadcrumb */}
			<div className="px-6 lg:px-16 max-w-[1400px] mx-auto w-full pt-6 mb-8">
				<button
					type="button"
					onClick={() => navigate({ to: '/market' })}
					className="inline-flex items-center gap-2 text-[13px] text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors"
				>
					<ArrowLeft size={14} className="icon-end" />
					{t('market.backToMarket')}
					<ChevronRight
						size={10}
						className="text-[var(--p-border)] rtl:rotate-180"
					/>
					<span className="text-[var(--p-text-muted)]">{categoryLabel}</span>
				</button>
			</div>

			{/* Hero: Image + Info */}
			<div className="px-6 lg:px-16 max-w-[1400px] mx-auto w-full">
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-20 items-stretch">
					{/* Image */}
					<motion.div
						initial={{ opacity: 0, scale: 0.97 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={spring}
						className="lg:row-span-1"
					>
						<div className="group overflow-hidden rounded-2xl bg-[var(--p-surface)] h-full min-h-[300px]">
							<img
								src={images[0]}
								alt={productName}
								className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
							/>
						</div>
					</motion.div>

					{/* Info column */}
					<div className="flex flex-col lg:py-2">
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={spring}
						>
							<span className="text-[13px] font-semibold uppercase tracking-[0.25em] text-[var(--p-text-secondary)]">
								{categoryLabel}
							</span>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.04 }}
							className="mt-4 text-[36px] lg:text-[44px] font-bold leading-[1.05] text-[var(--p-text)] tracking-[-0.02em]"
						>
							{productName}
						</motion.h1>

						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.08 }}
							className="mt-5 flex items-center gap-4"
						>
							<span className="flex items-center gap-2 text-[13px] text-[var(--p-text-muted)]">
								<span className={`w-1.5 h-1.5 rounded-full ${availDot}`} />
								{availLabel}
							</span>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.12 }}
							className="mt-8"
						>
							<p className="font-mono text-[28px] font-bold text-[var(--p-text)] tracking-[-0.01em]">
								{formatPrice(product.priceRangeMin, product.priceRangeMax)}
								<span className="text-[14px] font-normal text-[var(--p-text-muted)] font-sans ms-2">
									/{product.unitOfMeasure}
								</span>
							</p>
						</motion.div>

						{product.description && (
							<motion.p
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring, delay: 0.16 }}
								className="mt-6 text-[15px] leading-[1.8] text-[var(--p-text-muted)] max-w-[480px]"
							>
								{isAr ? product.descriptionAr : product.description}
							</motion.p>
						)}

						{/* Quote action */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.2 }}
							className="mt-10"
						>
							<QuoteAction
								product={{
									id: product.id,
									slug: productSlug,
									name: product.name,
									nameAr: product.nameAr,
									category: product.category,
									unitOfMeasure: product.unitOfMeasure,
									imageUrl: images[0],
								}}
							/>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Specs */}
			{product.specs.length > 0 && (
				<div className="mt-20 px-6 lg:px-16 max-w-[1400px] mx-auto w-full">
					<p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-[var(--p-text-secondary)] mb-3">
						{t('market.specifications')}
					</p>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-[var(--p-border)] border border-[var(--p-border)] rounded-2xl overflow-hidden">
						{product.specs.map((spec) => (
							<div key={spec.label} className="bg-[var(--p-bg)] px-5 py-5">
								<p className="text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--p-text-muted)] mb-2">
									{isAr ? spec.labelAr : spec.label}
								</p>
								<p className="text-[16px] font-semibold text-[var(--p-text)] font-mono">
									{spec.value}
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Related products */}
			{product.related.length > 0 && (
				<div className="mt-20 px-6 lg:px-16 max-w-[1400px] mx-auto w-full pb-12">
					<p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-[var(--p-text-secondary)] mb-3">
						{t('market.relatedProducts')}
					</p>
					<div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
						{product.related.map((rel) => {
							const relName = isAr ? rel.nameAr : rel.name
							return (
								<button
									key={rel.slug}
									type="button"
									onClick={() =>
										navigate({
											to: '/market/$productSlug',
											params: { productSlug: rel.slug },
										})
									}
									className="group block text-start"
								>
									<div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--p-surface)]">
										<img
											src={rel.imageUrl}
											alt={relName}
											className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
											loading="lazy"
										/>
									</div>
									<div className="mt-4">
										<h3 className="text-[15px] font-semibold text-[var(--p-text)] line-clamp-2 leading-snug group-hover:text-[var(--p-text-secondary)] transition-colors">
											{relName}
										</h3>
									</div>
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}

// ── Quote Action (idle → selecting → added state machine, copied from website) ──

type QuoteMode = 'idle' | 'selecting' | 'added'

interface QuoteProduct {
	id: string
	slug: string
	name: string
	nameAr: string
	category: string
	unitOfMeasure: string
	imageUrl: string
}

function QuoteAction({ product }: { product: QuoteProduct }) {
	const { t } = useTranslation('portal')
	const { add, remove, items, updateQuantity } = useDraftQuoteStore()
	const cartItem = items.find((i) => i.productId === product.id)
	const [quantity, setQuantity] = useState(1)
	const [mode, setMode] = useState<QuoteMode>(cartItem ? 'added' : 'idle')

	useEffect(() => {
		if (!cartItem && mode === 'added') setMode('idle')
		if (cartItem && mode === 'idle') setMode('added')
	}, [cartItem, mode])

	const unit = product.unitOfMeasure

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

	const confirmWithQuantity = (qty: number) => {
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

	const handleConfirm = () => confirmWithQuantity(quantity)

	const handleRemove = () => {
		remove(product.id)
		setQuantity(1)
		setMode('idle')
	}

	const handleEdit = () => {
		if (cartItem) setQuantity(cartItem.quantity)
		setMode('selecting')
	}

	return (
		<div className="rounded-2xl bg-[var(--p-surface)] p-6">
			<AnimatePresence mode="wait" initial={false}>
				{mode === 'idle' && (
					<motion.div
						key="idle"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
					>
						<button
							type="button"
							onClick={() => setMode('selecting')}
							className="h-14 w-full rounded-xl bg-[var(--p-text)] text-[var(--p-bg)] font-semibold text-[15px] hover:opacity-90 transition-opacity"
						>
							{t('market.addToQuote')}
						</button>
					</motion.div>
				)}

				{mode === 'selecting' && (
					<motion.div
						key="selecting"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
					>
						<NumberField
							value={quantity}
							onChange={(v) => setQuantity(v)}
							minValue={1}
							step={1}
							className="mb-4"
						>
							<Label className="sr-only">{t('market.quantity')}</Label>
							<Group className="flex items-center rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] overflow-hidden">
								<Button
									slot="decrement"
									className="flex h-14 w-14 shrink-0 items-center justify-center text-[20px] text-[var(--p-text-muted)] hover:bg-[var(--p-surface)] hover:text-[var(--p-text)] transition-colors border-e border-[var(--p-border)]"
								>
									−
								</Button>
								<div className="flex flex-1 items-center justify-center gap-2">
									<Input
										ref={inputRef}
										onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
											if (e.key === 'Enter')
												confirmWithQuantity(
													parseInt(e.currentTarget.value, 10) || 1,
												)
											if (e.key === 'Escape')
												setMode(cartItem ? 'added' : 'idle')
										}}
										className="h-14 w-[80px] bg-transparent text-center font-mono text-[20px] font-semibold text-[var(--p-text)] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
									<span className="text-[13px] text-[var(--p-text-muted)] font-medium">
										{unit}
									</span>
								</div>
								<Button
									slot="increment"
									className="flex h-14 w-14 shrink-0 items-center justify-center text-[20px] text-[var(--p-text-muted)] hover:bg-[var(--p-surface)] hover:text-[var(--p-text)] transition-colors border-s border-[var(--p-border)]"
								>
									+
								</Button>
							</Group>
						</NumberField>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setMode(cartItem ? 'added' : 'idle')}
								className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] hover:bg-[var(--p-bg)] hover:text-[var(--p-text)] transition-colors"
							>
								<ArrowLeft size={18} className="icon-end" />
							</button>
							<button
								type="button"
								onClick={handleConfirm}
								className="h-14 flex-1 rounded-xl bg-[var(--p-text)] text-[var(--p-bg)] font-semibold text-[15px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
							>
								<Check size={18} />
								{t('market.confirm')}
							</button>
						</div>
					</motion.div>
				)}

				{mode === 'added' && (
					<motion.div
						key="added"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
					>
						{cartItem && (
							<p className="mb-4 text-[13px] text-[var(--p-text-muted)]">
								<span className="font-mono font-semibold text-[var(--p-text)]">
									{cartItem.quantity}
								</span>{' '}
								{unit} {t('market.inQuote')}
							</p>
						)}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleRemove}
								className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] hover:border-[var(--p-error)] hover:text-[var(--p-error)] transition-colors"
							>
								<Undo2 size={18} />
							</button>
							<button
								type="button"
								onClick={handleEdit}
								className="h-14 flex-1 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] font-semibold text-[15px] text-[var(--p-text)] hover:border-[var(--p-border-strong)] hover:text-[var(--p-text-secondary)] transition-colors flex items-center justify-center gap-2"
							>
								<Pencil size={16} />
								{t('market.editQuantity')}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
