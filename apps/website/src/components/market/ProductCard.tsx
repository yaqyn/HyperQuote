import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Check } from 'lucide-react'
import { useQuoteCart } from '../../hooks/useQuoteCart'

interface Product {
	id: string
	slug: string
	name: string
	name_ar: string | null
	category: string
	unit_of_measure: string
	weight_kg?: number | null
	price_range_min: number | null
	price_range_max: number | null
	availability_status: string | null
	image_urls: string[] | null
	[key: string]: unknown
}

interface ProductCardProps {
	product: Product
	variant: 'grid' | 'list'
}

const PLACEHOLDER_IMAGE =
	'https://websiteassets.hyperquote.net/Images/cairo.webp'

function AddPopover({
	product,
	onClose,
	anchorRef,
}: {
	product: Product
	onClose: () => void
	anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
	const { t } = useTranslation('website')
	const { add } = useQuoteCart()
	const [qty, setQty] = useState(1)
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const unit = t(`units.${product.unit_of_measure}`, product.unit_of_measure)
	const weight = product.weight_kg

	useEffect(() => {
		inputRef.current?.select()
	}, [])

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node) &&
				anchorRef.current &&
				!anchorRef.current.contains(e.target as Node)
			) {
				onClose()
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [onClose, anchorRef])

	const handleSubmit = () => {
		if (qty > 0) {
			add(
				{
					productId: product.id,
					slug: product.slug,
					name: product.name,
					category: product.category,
					unitOfMeasure: product.unit_of_measure,
					imageUrl: product.image_urls?.[0] ?? null,
				},
				qty,
			)
			onClose()
		}
	}

	const totalWeight = weight && qty > 0 ? (weight * qty).toFixed(1) : null

	return (
		<div
			ref={popoverRef}
			className="absolute bottom-14 end-2 z-30 w-52 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl p-3"
			onClick={(e) => e.preventDefault()}
		>
			<p className="text-[12px] font-medium text-[var(--color-text)] line-clamp-1 mb-2">
				{product.name}
			</p>

			<div className="flex items-center gap-2 mb-2">
				<input
					ref={inputRef}
					type="number"
					value={qty}
					onChange={(e) => {
						const v = parseInt(e.target.value, 10)
						if (!isNaN(v) && v >= 0) setQty(v)
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleSubmit()
						if (e.key === 'Escape') onClose()
					}}
					min={1}
					className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 font-mono text-[14px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<span className="text-[12px] text-[var(--color-text-muted)] shrink-0">
					{unit}
				</span>
			</div>

			{/* Calculated info */}
			{totalWeight && (
				<p className="text-[11px] text-[var(--color-text-subtle)] mb-2">
					≈ {totalWeight} kg total
				</p>
			)}

			<button
				type="button"
				onClick={handleSubmit}
				className="w-full h-8 rounded-lg bg-[var(--color-primary)] text-white text-[13px] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
			>
				{t('market.addToQuote')}
			</button>
		</div>
	)
}

export function ProductCard({ product, variant }: ProductCardProps) {
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
	const name = locale === 'ar' ? product.name_ar || product.name : product.name
	const image = product.image_urls?.[0] || PLACEHOLDER_IMAGE
	const { items } = useQuoteCart()
	const inCart = items.some((i) => i.productId === product.id)
	const unit = t(`units.${product.unit_of_measure}`, product.unit_of_measure)
	const [popoverOpen, setPopoverOpen] = useState(false)
	const btnRef = useRef<HTMLButtonElement>(null)

	const handleBtnClick = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (inCart) return
		setPopoverOpen(!popoverOpen)
	}

	if (variant === 'list') {
		return (
			<Link
				to="/market/$productSlug"
				params={{ productSlug: product.slug }}
				className="flex items-center gap-4 py-3 px-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors"
			>
				<img src={image} alt={name} className="w-14 h-14 rounded-lg object-cover bg-[var(--color-surface)]" loading="lazy" />
				<div className="flex-1 min-w-0">
					<p className="text-[14px] font-medium text-[var(--color-text)] line-clamp-1">{name}</p>
					<p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{t(`categories.${product.category}`)} · {unit}</p>
				</div>
				<div className="relative">
					<button
						ref={btnRef}
						type="button"
						onClick={handleBtnClick}
						className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors backdrop-blur-sm ${inCart ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-primary)]/30 hover:text-[var(--color-primary)]'}`}
					>
						{inCart ? <Check size={14} /> : <Plus size={14} />}
					</button>
					{popoverOpen && (
						<AddPopover product={product} onClose={() => setPopoverOpen(false)} anchorRef={btnRef} />
					)}
				</div>
			</Link>
		)
	}

	return (
		<Link
			to="/market/$productSlug"
			params={{ productSlug: product.slug }}
			className="group block"
		>
			<div className="relative aspect-[3/2] overflow-hidden bg-[var(--color-surface)]">
				<img
					src={image}
					alt={name}
					className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
					loading="lazy"
				/>
				<button
					ref={btnRef}
					type="button"
					onClick={handleBtnClick}
					className={`absolute bottom-3 end-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md text-white ring-1 ring-white/20 shadow-lg ${
						inCart
							? 'bg-white/25'
							: 'bg-white/15 opacity-0 group-hover:opacity-100 max-lg:opacity-100 hover:bg-white/30'
					}`}
					aria-label={t('market.addToQuote')}
				>
					{inCart ? <Check size={16} /> : <Plus size={16} />}
				</button>
				{popoverOpen && (
					<AddPopover product={product} onClose={() => setPopoverOpen(false)} anchorRef={btnRef} />
				)}
			</div>

			<div className="mt-3 px-0.5">
				<h3 className="text-[15px] font-medium text-[var(--color-text)] line-clamp-2 leading-snug">
					{name}
				</h3>
				<p className="text-[13px] text-[var(--color-text-muted)] mt-1">
					{t(`categories.${product.category}`)} · {unit}
				</p>
			</div>
		</Link>
	)
}
