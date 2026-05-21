import { formatWeightKg } from '@hyperquote/i18n'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import {
	ArrowLeft,
	Check,
	ChevronRight,
	Copy,
	MessageSquare,
	Package,
	PackageX,
	Pencil,
	Share2,
	Undo2,
} from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Group } from 'react-aria-components/Group'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { NumberField } from 'react-aria-components/NumberField'
import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../../../components/shared/SectionReveal'
import { useChatWidget } from '../../../hooks/useChatWidget'
import { useQuoteCart } from '../../../hooks/useQuoteCart'
import {
	getProductBySlug,
	getPublicCatalog,
	type PublicProduct,
} from '../../../lib/catalog'
import { formatPriceRange } from '../../../lib/price-range'
import { isAbortedRouteLoad } from '../../../lib/route-loader'

interface PublicCategory {
	slug: string
	name: string
	name_ar: string
}

export const Route = createFileRoute('/_website/market/$productSlug')({
	loader: async ({ params, abortController }) => {
		try {
			const product = await getProductBySlug({
				data: { slug: params.productSlug },
			})

			let relatedProducts: PublicProduct[] = []
			let categories: PublicCategory[] = []
			if (product) {
				const related = await getPublicCatalog({
					data: {
						category: [product.category],
						limit: 6,
						page: 1,
						sort: 'relevance',
					},
				})
				relatedProducts = related.items.filter((item) => item.id !== product.id)
				categories = related.categories
			}

			return { product, relatedProducts, categories }
		} catch (error) {
			if (isAbortedRouteLoad(error, abortController.signal)) {
				return { product: null, relatedProducts: [], categories: [] }
			}
			throw error
		}
	},
	head: ({ loaderData }) => {
		const product = loaderData?.product
		if (!product) {
			return {
				meta: [
					{ title: 'Product Not Found — HyperQuote' },
					{ name: 'description', content: 'This product could not be found.' },
				],
			}
		}
		return {
			meta: [
				{ title: `${product.name} — HyperQuote` },
				{
					name: 'description',
					content:
						product.description ?? `${product.name} — Available on HyperQuote`,
				},
			],
		}
	},
	component: ProductDetailPage,
})

const spring = { type: 'spring' as const, stiffness: 200, damping: 20 }
const EASE = cubicBezier(0.25, 0.1, 0.25, 1)

function unitLabelFor(
	product: Pick<PublicProduct, 'unit_of_measure' | 'unit_of_measure_ar'>,
	locale: 'ar' | 'en',
) {
	return locale === 'ar' && product.unit_of_measure_ar
		? product.unit_of_measure_ar
		: product.unit_of_measure
}

function specsForLocale(product: PublicProduct, locale: 'ar' | 'en') {
	return locale === 'ar' && Object.keys(product.specifications_ar ?? {}).length
		? product.specifications_ar
		: product.specifications
}

function categoryLabelFor(
	slug: string,
	categories: PublicCategory[],
	locale: 'ar' | 'en',
) {
	const category = categories.find((item) => item.slug === slug)
	if (!category) return slug.replace(/_/g, ' ')
	return locale === 'ar' && category.name_ar ? category.name_ar : category.name
}

// --------------------------------------------------------------------------

function ProductDetailPage() {
	const { product, relatedProducts, categories } = Route.useLoaderData()
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

	if (!product) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center pt-24">
				<PackageX size={48} className="mb-4 text-[var(--color-text-muted)]" />
				<h1 className="mb-2 text-2xl font-bold">
					{t('product.notFoundTitle')}
				</h1>
				<p className="mb-6 text-[var(--color-text-muted)]">
					{t('product.notFoundBody')}
				</p>
				<Link
					to="/market"
					className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white"
				>
					{t('product.notFoundCTA')}
				</Link>
			</div>
		)
	}

	const productName =
		locale === 'ar' && product.name_ar ? product.name_ar : product.name
	const images = product.image_urls ?? []
	const unitLabel = unitLabelFor(product, locale)
	const localizedSpecs = specsForLocale(product, locale)
	const priceRange = formatPriceRange(
		product.price_range_min,
		product.price_range_max,
		product.unit_of_measure,
		locale,
		t,
		unitLabel,
	)
	const categoryLabel = categoryLabelFor(product.category, categories, locale)
	const availStatus = product.availability_status ?? 'out_of_stock'
	const availDot =
		availStatus === 'available'
			? 'bg-[var(--color-success)]'
			: availStatus === 'low_stock'
				? 'bg-[var(--color-warning)]'
				: 'bg-[var(--color-text-muted)]'
	const availLabel =
		availStatus === 'available'
			? t('market.available')
			: availStatus === 'low_stock'
				? t('market.lowStock')
				: t('market.outOfStock')

	return (
		<>
			<div className="pt-[72px] pb-24 md:pt-[88px] md:pb-16">
				{/* Breadcrumb */}
				<div className="mx-auto mb-6 max-w-[1400px] px-4 sm:px-6 md:mb-8 lg:px-16">
					<Link
						to="/market"
						className="inline-flex items-center gap-2 text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
					>
						<ArrowLeft size={14} className="icon-end" />
						{t('product.breadcrumbMarket')}
						<ChevronRight
							size={10}
							className="text-[var(--color-border)] rtl:rotate-180"
						/>
						<span className="text-[var(--color-text-muted)]">
							{categoryLabel}
						</span>
					</Link>
				</div>

				{/* Hero: Image + Info */}
				<div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-16">
					<div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_1fr] lg:gap-20">
						{/* Image */}
						<ProductImage images={images} name={productName} />

						{/* Info column */}
						<div className="flex flex-col items-center text-center lg:items-start lg:py-2 lg:text-start">
							{/* Category */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={spring}
							>
								<Link
									to="/market"
									search={{ category: product.category }}
									className="text-[12px] font-semibold uppercase tracking-normal text-[var(--color-primary)]"
								>
									{categoryLabel}
								</Link>
							</motion.div>

							{/* Name */}
							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring, delay: 0.04 }}
								className="mt-4 text-[30px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[36px] lg:text-[44px]"
							>
								{productName}
							</motion.h1>

							{/* SKU + Availability */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring, delay: 0.08 }}
								className="mt-5 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
							>
								<span className="font-mono text-[12px] text-[var(--color-text-subtle)]">
									{product.sku}
								</span>
								<span className="w-px h-3.5 bg-[var(--color-border)]" />
								<span className="flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
									<span className={`w-1.5 h-1.5 rounded-full ${availDot}`} />
									{availLabel}
								</span>
							</motion.div>

							{/* Price */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring, delay: 0.12 }}
								className="mt-6 md:mt-8"
							>
								<p className="font-mono text-[24px] font-bold tracking-normal text-[var(--color-primary)] sm:text-[28px]">
									{priceRange}
								</p>
							</motion.div>

							{/* Description */}
							{product.description && (
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ ...spring, delay: 0.16 }}
									className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.75] text-[var(--color-text-muted)] lg:mx-0 lg:mt-6"
								>
									{locale === 'ar' && product.description_ar
										? product.description_ar
										: product.description}
								</motion.p>
							)}

							{/* Quote action — desktop */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring, delay: 0.2 }}
								className="mx-auto mt-8 hidden w-full max-w-[560px] md:block lg:mx-0 lg:mt-10 lg:max-w-none"
							>
								<QuoteAction
									product={{
										id: product.id,
										slug: product.slug,
										name: product.name,
										nameAr: product.name_ar,
										category: product.category,
										unitOfMeasure: product.unit_of_measure,
										unitOfMeasureAr: product.unit_of_measure_ar,
										imageUrl: images[0],
										weightKg: product.weight_kg,
									}}
								/>

								<div className="mt-4">
									<ProductActions
										productName={productName}
										description={
											locale === 'ar' && product.description_ar
												? product.description_ar
												: (product.description ?? '')
										}
										sku={product.sku}
										category={categoryLabel}
										priceRange={priceRange}
										slug={product.slug}
										specifications={
											(localizedSpecs as Record<string, unknown>) ?? {}
										}
										brand={product.brand}
										manufacturer={product.manufacturer}
										weightKg={product.weight_kg}
										unitOfMeasure={unitLabel}
									/>
								</div>
							</motion.div>
						</div>
					</div>
				</div>

				{/* Specs */}
				<SpecsSection
					specifications={(localizedSpecs as Record<string, unknown>) ?? {}}
					weightKg={product.weight_kg}
					unitOfMeasure={unitLabel}
					brand={product.brand}
					manufacturer={product.manufacturer}
				/>

				{/* Related */}
				<RelatedSection products={relatedProducts} />
			</div>

			{/* Mobile bottom bar */}
			<MobileBar
				product={{
					id: product.id,
					slug: product.slug,
					name: product.name,
					nameAr: product.name_ar,
					category: product.category,
					unitOfMeasure: product.unit_of_measure,
					unitOfMeasureAr: product.unit_of_measure_ar,
					imageUrl: images[0],
					weightKg: product.weight_kg,
				}}
			/>
		</>
	)
}

// --------------------------------------------------------------------------
// Product Image — hover zoom, thumbnail strip
// --------------------------------------------------------------------------

function ProductImage({ images, name }: { images: string[]; name: string }) {
	const [activeIndex, setActiveIndex] = useState(0)
	const activeImage = images[activeIndex]

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.97 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={spring}
			className="lg:sticky lg:top-24 lg:self-start"
		>
			{/* Main image */}
			<div className="group aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--color-surface)] lg:aspect-[5/6]">
				{activeImage ? (
					<img
						src={activeImage}
						alt={name}
						className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
						loading="eager"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
						<Package size={42} />
					</div>
				)}
			</div>

			{/* Thumbnails */}
			{images.length > 1 && (
				<div className="mt-3 flex gap-2">
					{images.map((url, i) => (
						<button
							key={url}
							type="button"
							onClick={() => setActiveIndex(i)}
							className={`h-16 w-16 overflow-hidden rounded-lg transition-all duration-200 ${
								i === activeIndex
									? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-base)]'
									: 'opacity-60 hover:opacity-100'
							}`}
						>
							<img
								src={url}
								alt={`${name} ${i + 1}`}
								className="h-full w-full object-cover"
								loading="lazy"
							/>
						</button>
					))}
				</div>
			)}
		</motion.div>
	)
}

// --------------------------------------------------------------------------
// Quote Action — quantity + CTA
// --------------------------------------------------------------------------

interface QuoteActionProduct {
	id: string
	slug: string
	name: string
	nameAr: string
	category: string
	unitOfMeasure: string
	unitOfMeasureAr: string
	imageUrl: string | null
	weightKg: number | null
}

const _PRESETS: Record<string, number[]> = {
	ton: [1, 5, 10, 25],
	bag: [10, 25, 50, 100],
	m3: [1, 5, 10, 20],
	m2: [10, 25, 50, 100],
	piece: [10, 50, 100, 500],
	roll: [5, 10, 25, 50],
	liter: [5, 20, 50, 100],
	kg: [25, 50, 100, 500],
}

type QuoteMode = 'idle' | 'selecting' | 'added'

function QuoteAction({ product }: { product: QuoteActionProduct }) {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const { add, remove, items, updateQuantity } = useQuoteCart()
	const cartItem = items.find((i) => i.productId === product.id)
	const [quantity, setQuantity] = useState(1)
	const [mode, setMode] = useState<QuoteMode>(cartItem ? 'added' : 'idle')

	// Sync mode when cart changes externally
	useEffect(() => {
		if (!cartItem && mode === 'added') setMode('idle')
		if (cartItem && mode === 'idle') setMode('added')
	}, [cartItem, mode])

	const unit =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure

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
					unitOfMeasureAr: product.unitOfMeasureAr,
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
		<div className="rounded-2xl bg-[var(--color-surface)] p-5 lg:p-6">
			<AnimatePresence mode="wait" initial={false}>
				{/* State: idle — just the Add to Quote button */}
				{mode === 'idle' && (
					<motion.div
						key="idle"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2, ease: EASE }}
					>
						<button
							type="button"
							onClick={() => setMode('selecting')}
							className="h-14 w-full rounded-xl bg-[var(--color-primary)] font-semibold text-[15px] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
						>
							{t('market.addToQuote')}
						</button>
					</motion.div>
				)}

				{/* State: selecting — advanced quantity picker + confirm */}
				{mode === 'selecting' && (
					<motion.div
						key="selecting"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2, ease: EASE }}
					>
						{/* Unified stepper */}
						<NumberField
							value={quantity}
							onChange={(v) => setQuantity(v)}
							minValue={1}
							step={1}
							className="mb-4"
						>
							<Label className="sr-only">{t('product.quantityLabel')}</Label>
							<Group className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] overflow-hidden">
								<Button
									slot="decrement"
									className="flex h-14 w-14 shrink-0 items-center justify-center text-[20px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors border-e border-[var(--color-border)]"
								>
									-
								</Button>
								<div className="flex flex-1 items-center justify-center gap-2">
									<Input
										ref={inputRef}
										onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
											if (e.key === 'Enter') {
												confirmWithQuantity(
													parseInt(e.currentTarget.value, 10) || 1,
												)
											}
											if (e.key === 'Escape')
												setMode(cartItem ? 'added' : 'idle')
										}}
										className="h-14 w-[80px] bg-transparent text-center font-mono text-[20px] font-semibold text-[var(--color-text)] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
									<span className="text-[13px] text-[var(--color-text-subtle)] font-medium">
										{unit}
									</span>
								</div>
								<Button
									slot="increment"
									className="flex h-14 w-14 shrink-0 items-center justify-center text-[20px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors border-s border-[var(--color-border)]"
								>
									+
								</Button>
							</Group>
						</NumberField>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setMode(cartItem ? 'added' : 'idle')}
								className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-base)] hover:text-[var(--color-text)] transition-colors"
								aria-label={t('product.back')}
							>
								<ArrowLeft size={18} className="icon-end" />
							</button>
							<button
								type="button"
								onClick={handleConfirm}
								className="h-14 flex-1 rounded-xl bg-[var(--color-primary)] font-semibold text-[15px] text-white hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-2"
							>
								<Check size={18} />
								{t('product.confirm')}
							</button>
						</div>
					</motion.div>
				)}

				{/* State: added — back (remove) + edit */}
				{mode === 'added' && (
					<motion.div
						key="added"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2, ease: EASE }}
					>
						{cartItem && (
							<p className="mb-4 text-[13px] text-[var(--color-text-muted)]">
								<span className="font-mono font-semibold text-[var(--color-text)]">
									{cartItem.quantity}
								</span>{' '}
								{unit} {t('product.inQuote')}
							</p>
						)}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleRemove}
								className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] transition-colors"
								aria-label={t('product.removeFromQuote')}
							>
								<Undo2 size={18} />
							</button>
							<button
								type="button"
								onClick={handleEdit}
								className="h-14 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] font-semibold text-[15px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-2"
							>
								<Pencil size={16} />
								{t('product.editQuantity')}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

// --------------------------------------------------------------------------
// Product Actions — share, AI, copy, WhatsApp
// --------------------------------------------------------------------------

interface ProductActionsProps {
	productName: string
	description: string
	sku: string
	category: string
	priceRange: string
	slug: string
	specifications: Record<string, unknown>
	brand: string | null
	manufacturer: string | null
	weightKg: number | null
	unitOfMeasure: string
}

function buildProductText(
	props: ProductActionsProps,
	t: TFunction<'website'>,
	locale: 'ar' | 'en',
): string {
	const lines: string[] = [
		props.productName,
		`${props.sku}  ·  ${props.category}`,
		'',
		props.priceRange,
	]

	if (props.description) {
		lines.push('', props.description)
	}

	const specs: string[] = []
	if (props.manufacturer)
		specs.push(`${t('product.specManufacturer')}: ${props.manufacturer}`)
	if (props.brand) specs.push(`${t('product.specBrand')}: ${props.brand}`)
	for (const [key, value] of Object.entries(props.specifications)) {
		if (value == null || value === '') continue
		const label = key
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase())
		specs.push(`${label}: ${String(value)}`)
	}
	if (props.weightKg != null)
		specs.push(
			`${t('product.specWeight')}: ${formatWeightKg(props.weightKg, locale)}`,
		)
	if (props.unitOfMeasure)
		specs.push(`${t('product.specUOM')}: ${props.unitOfMeasure}`)

	if (specs.length > 0) {
		lines.push('', '—', ...specs)
	}

	lines.push('', `hyperquote.net/market/${props.slug}`)
	return lines.join('\n')
}

function ProductActions(props: ProductActionsProps) {
	const { t, i18n } = useTranslation('website')
	const [copied, setCopied] = useState(false)
	const openWithMessage = useChatWidget((s) => s.openWithMessage)
	const locale = i18n.language === 'ar' ? 'ar' : 'en'

	const productText = buildProductText(props, t, locale)
	const productUrl = `https://hyperquote.net/market/${props.slug}`

	const handleShare = async () => {
		if (navigator.share) {
			await navigator.share({
				title: props.productName,
				text: props.description,
				url: productUrl,
			})
		} else {
			await navigator.clipboard.writeText(productUrl)
		}
	}

	const handleAskLyon = () => {
		openWithMessage(props.productName)
	}

	const handleCopy = async () => {
		await navigator.clipboard.writeText(productText)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleWhatsApp = () => {
		const waText = encodeURIComponent(productText)
		window.open(
			`https://wa.me/?text=${waText}`,
			'_blank',
			'noopener,noreferrer',
		)
	}

	const btnClass =
		'flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors'

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={handleShare}
				className={btnClass}
				aria-label={t('product.share')}
			>
				<Share2 size={16} />
			</button>
			<button
				type="button"
				onClick={handleAskLyon}
				className={btnClass}
				aria-label={t('product.askLyon')}
			>
				<MessageSquare size={16} />
			</button>
			<button
				type="button"
				onClick={handleCopy}
				className={btnClass}
				aria-label={t('product.copy')}
			>
				{copied ? (
					<Check size={16} className="text-[var(--color-success)]" />
				) : (
					<Copy size={16} />
				)}
			</button>
			<button
				type="button"
				onClick={handleWhatsApp}
				className={btnClass}
				aria-label={t('product.shareWhatsApp')}
			>
				<svg
					width={16}
					height={16}
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
				</svg>
			</button>
		</div>
	)
}

// --------------------------------------------------------------------------
// Specs Section — grid of individual spec items
// --------------------------------------------------------------------------

function SpecsSection({
	specifications,
	weightKg,
	unitOfMeasure,
	brand,
	manufacturer,
}: {
	specifications: Record<string, unknown>
	weightKg: number | null
	unitOfMeasure: string
	brand: string | null
	manufacturer: string | null
}) {
	const { t, i18n } = useTranslation('website')
	const locale = i18n.language === 'ar' ? 'ar' : 'en'

	const items: { label: string; value: string; mono: boolean }[] = []

	if (manufacturer)
		items.push({
			label: t('product.specManufacturer'),
			value: manufacturer,
			mono: false,
		})
	if (brand)
		items.push({ label: t('product.specBrand'), value: brand, mono: false })

	for (const [key, value] of Object.entries(specifications)) {
		if (value == null || value === '') continue
		items.push({
			label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			value: String(value),
			mono: typeof value === 'number' || /^[\d.,]+/.test(String(value)),
		})
	}

	if (weightKg != null)
		items.push({
			label: t('product.specWeight'),
			value: formatWeightKg(weightKg, locale),
			mono: true,
		})
	if (unitOfMeasure)
		items.push({
			label: t('product.specUOM'),
			value: unitOfMeasure,
			mono: false,
		})

	if (items.length === 0) return null

	return (
		<div className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6 lg:mt-24 lg:px-16">
			<SectionReveal>
				<div className="text-center lg:text-start">
					<p className="mb-3 text-[12px] font-semibold uppercase tracking-normal text-[var(--color-primary)]">
						{t('product.specsLabel')}
					</p>
					<h2 className="mb-8 text-[28px] font-bold tracking-normal text-[var(--color-text)] lg:mb-12 lg:text-[36px]">
						{t('product.specsHeading')}
					</h2>
				</div>
			</SectionReveal>

			<div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{items.map((item, i) => (
					<SectionReveal key={item.label} delay={i * 0.03}>
						<div className="bg-[var(--color-base)] px-5 py-5 text-center lg:text-start">
							<p className="mb-2 text-[11px] font-medium uppercase tracking-normal text-[var(--color-text-subtle)]">
								{item.label}
							</p>
							<p
								className={`text-[16px] font-semibold text-[var(--color-text)] ${item.mono ? 'font-mono' : ''}`}
							>
								{item.value}
							</p>
						</div>
					</SectionReveal>
				))}
			</div>
		</div>
	)
}

// --------------------------------------------------------------------------
// Related Products
// --------------------------------------------------------------------------

function RelatedSection({ products }: { products: PublicProduct[] }) {
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

	if (products.length === 0) return null

	return (
		<div className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6 lg:mt-24 lg:px-16">
			<SectionReveal>
				<div className="text-center lg:text-start">
					<p className="mb-3 text-[12px] font-semibold uppercase tracking-normal text-[var(--color-primary)]">
						{t('product.relatedLabel')}
					</p>
					<h2 className="mb-8 text-[28px] font-bold tracking-normal text-[var(--color-text)] lg:mb-12 lg:text-[36px]">
						{t('product.relatedHeading')}
					</h2>
				</div>
			</SectionReveal>

			<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{products.slice(0, 3).map((product, i) => {
					const name =
						locale === 'ar' && product.name_ar ? product.name_ar : product.name
					const image = product.image_urls?.[0] ?? null
					const unit = unitLabelFor(product, locale)
					const price = formatPriceRange(
						product.price_range_min,
						product.price_range_max,
						product.unit_of_measure,
						locale,
						t,
						unit,
					)

					return (
						<SectionReveal key={product.id} delay={i * 0.06}>
							<Link
								to="/market/$productSlug"
								params={{ productSlug: product.slug }}
								className="group block"
							>
								<div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-surface)]">
									{image ? (
										<img
											src={image}
											alt={name}
											className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
											loading="lazy"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
											<Package size={30} />
										</div>
									)}
								</div>
								<div className="mt-4 text-center lg:text-start">
									<h3 className="text-[15px] font-semibold text-[var(--color-text)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors">
										{name}
									</h3>
									<p className="mt-2 font-mono text-[14px] text-[var(--color-text-muted)]">
										{price}
									</p>
								</div>
							</Link>
						</SectionReveal>
					)
				})}
			</div>
		</div>
	)
}

// --------------------------------------------------------------------------
// Mobile Bottom Bar
// --------------------------------------------------------------------------

function MobileBar({ product }: { product: QuoteActionProduct }) {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const { add, remove, items, updateQuantity } = useQuoteCart()
	const cartItem = items.find((i) => i.productId === product.id)
	const [quantity, setQuantity] = useState(1)
	const [mode, setMode] = useState<QuoteMode>(cartItem ? 'added' : 'idle')

	useEffect(() => {
		if (!cartItem && mode === 'added') setMode('idle')
		if (cartItem && mode === 'idle') setMode('added')
	}, [cartItem, mode])

	const unit =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure

	const mobileInputRef = useCallback(
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
					unitOfMeasureAr: product.unitOfMeasureAr,
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
		<div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
			<AnimatePresence mode="wait" initial={false}>
				{mode === 'idle' && (
					<motion.div
						key="m-idle"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="flex h-12 items-center"
					>
						<button
							type="button"
							onClick={() => setMode('selecting')}
							className="h-10 w-full rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white"
						>
							{t('market.addToQuote')}
						</button>
					</motion.div>
				)}

				{mode === 'selecting' && (
					<motion.div
						key="m-selecting"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="flex h-12 items-center gap-2"
					>
						<button
							type="button"
							onClick={() => setMode(cartItem ? 'added' : 'idle')}
							className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)]"
							aria-label={t('product.back')}
						>
							<ArrowLeft size={16} className="icon-end" />
						</button>

						<NumberField
							value={quantity}
							onChange={(v) => setQuantity(v)}
							minValue={1}
							step={1}
							aria-label={t('product.quantityLabel')}
						>
							<Group className="flex items-center gap-1">
								<Button
									slot="decrement"
									className="flex h-10 w-8 items-center justify-center rounded border border-[var(--color-border)] text-sm"
								>
									-
								</Button>
								<Input
									ref={mobileInputRef}
									onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
										if (e.key === 'Enter') {
											confirmWithQuantity(
												parseInt(e.currentTarget.value, 10) || 1,
											)
										}
										if (e.key === 'Escape') setMode(cartItem ? 'added' : 'idle')
									}}
									className="h-10 w-[52px] rounded border border-[var(--color-border)] bg-transparent px-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
								/>
								<Button
									slot="increment"
									className="flex h-10 w-8 items-center justify-center rounded border border-[var(--color-border)] text-sm"
								>
									+
								</Button>
							</Group>
						</NumberField>

						<span className="text-[11px] text-[var(--color-text-muted)] shrink-0">
							{unit}
						</span>

						<button
							type="button"
							onClick={handleConfirm}
							className="h-10 flex-1 rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white flex items-center justify-center gap-1.5"
						>
							<Check size={16} />
							{t('product.confirm')}
						</button>
					</motion.div>
				)}

				{mode === 'added' && (
					<motion.div
						key="m-added"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="flex h-12 items-center gap-2"
					>
						<button
							type="button"
							onClick={handleRemove}
							className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)]"
							aria-label={t('product.removeFromQuote')}
						>
							<Undo2 size={16} />
						</button>

						{cartItem && (
							<span className="text-[12px] text-[var(--color-text-muted)] shrink-0">
								<span className="font-mono font-semibold text-[var(--color-text)]">
									{cartItem.quantity}
								</span>{' '}
								{unit}
							</span>
						)}

						<button
							type="button"
							onClick={handleEdit}
							className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm font-semibold text-[var(--color-text)] flex items-center justify-center gap-1.5"
						>
							<Pencil size={14} />
							{t('product.editQuantity')}
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
