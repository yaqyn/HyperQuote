import { formatWeightKg } from '@hyperquote/i18n'
import { useQuantityPopoverDismiss } from '@hyperquote/ui/market/QuantityPopover'
import { Link } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { Package, Plus, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import type { PublicProduct } from '../../lib/catalog'

type Product = PublicProduct

interface ProductCardProps {
	product: Product
	variant: 'grid' | 'list'
	categoryLabel?: string
}

function productUnitLabel(product: Product, locale: 'ar' | 'en') {
	return locale === 'ar' && product.unit_of_measure_ar
		? product.unit_of_measure_ar
		: product.unit_of_measure
}

function AddPopover({
	product,
	onClose,
	anchorRef,
}: {
	product: Product
	onClose: () => void
	anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const locale = isAr ? 'ar' : 'en'
	const { add, remove, updateQuantity, items } = useQuoteCart()
	const existingItem = items.find((i) => i.productId === product.id)
	const [qtyStr, setQtyStr] = useState(String(existingItem?.quantity ?? 1))
	const qty = parseInt(qtyStr, 10) || 0
	const isOrderable = product.availability_status !== 'out_of_stock'
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const weight = product.weight_kg

	useEffect(() => {
		inputRef.current?.select()
	}, [])

	useQuantityPopoverDismiss({ anchorRef, onClose, popoverRef })

	const handleSubmit = () => {
		if (!isOrderable && !existingItem) return
		if (!isOrderable && existingItem) {
			if (qty <= 0) remove(product.id)
			onClose()
			return
		}
		if (qty > 0) {
			onClose()
			if (existingItem) {
				updateQuantity(product.id, qty)
			} else {
				add(
					{
						productId: product.id,
						slug: product.slug,
						name: product.name,
						nameAr: product.name_ar,
						category: product.category,
						unitOfMeasure: product.unit_of_measure,
						unitOfMeasureAr: product.unit_of_measure_ar,
						imageUrl: product.image_urls?.[0] ?? null,
					},
					qty,
				)
			}
		}
	}

	const totalWeight =
		weight && qty > 0 ? formatWeightKg(weight * qty, locale) : null

	const [pos, setPos] = useState({ top: 0, left: 0 })

	useEffect(() => {
		if (!anchorRef.current) return
		const rect = anchorRef.current.getBoundingClientRect()
		setPos({
			top: rect.top - 12,
			left: Math.max(8, rect.right - 208),
		})
	}, [anchorRef])

	return createPortal(
		<motion.div
			ref={popoverRef}
			initial={{ opacity: 0, scale: 0.9, y: 8 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.9, y: 8 }}
			transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
			style={{
				position: 'fixed',
				bottom: `calc(100vh - ${pos.top}px + 12px)`,
				left: pos.left,
			}}
			className="z-[100] w-52 backdrop-blur-xl bg-black/60 border border-white/15 rounded-xl shadow-2xl p-3"
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
			}}
		>
			<p className="text-[12px] font-medium text-white line-clamp-1 mb-2">
				{isAr ? product.name_ar || product.name : product.name}
			</p>

			<div className="relative mb-2">
				<input
					ref={inputRef}
					aria-label={t('product.quantityLabel')}
					type="text"
					inputMode="numeric"
					value={qtyStr}
					onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9]/g, ''))}
					onKeyDown={(e) => {
						e.stopPropagation()
						if (e.key === 'Enter') {
							e.preventDefault()
							if (qty <= 0) {
								remove(product.id)
								onClose()
							} else handleSubmit()
						}
						if (e.key === 'Escape') onClose()
					}}
					min={1}
					className="w-full h-8 rounded-lg border border-white/15 bg-white/10 ps-2.5 pe-12 font-mono text-[14px] text-white outline-none focus:border-white/40 transition-colors text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] text-white/40 pointer-events-none">
					{productUnitLabel(product, locale)}
				</span>
			</div>

			{totalWeight && (
				<p className="text-[11px] text-white/40 mb-2">≈ {totalWeight}</p>
			)}

			<div className="flex items-center gap-2">
				{existingItem && (
					<button
						type="button"
						onClick={() => {
							remove(product.id)
							onClose()
						}}
						className="w-8 h-8 shrink-0 rounded-lg border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
					>
						<Undo2 size={14} />
					</button>
				)}
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!isOrderable && !existingItem}
					className="flex-1 h-8 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors disabled:pointer-events-none disabled:opacity-50"
				>
					{existingItem ? t('market.confirm') : t('market.addToQuote')}
				</button>
			</div>
		</motion.div>,
		document.body,
	)
}

export function ProductCard({
	product,
	variant,
	categoryLabel: categoryLabelProp,
}: ProductCardProps) {
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
	const name = locale === 'ar' ? product.name_ar || product.name : product.name
	const image = product.image_urls?.[0] ?? null
	const { items } = useQuoteCart()
	const existingItem = items.find((i) => i.productId === product.id)
	const inCart = !!existingItem
	const cartQty = existingItem?.quantity ?? 0
	const isOrderable = product.availability_status !== 'out_of_stock'
	const unit = productUnitLabel(product, locale)
	const categoryLabel =
		categoryLabelProp ??
		t(`categories.${product.category}` as ParseKeys<'website'>, {
			defaultValue: product.category.replace(/_/g, ' '),
		})
	const [popoverOpen, setPopoverOpen] = useState(false)
	const btnRef = useRef<HTMLButtonElement>(null)

	const handleBtnClick = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (!isOrderable && !inCart) return
		setPopoverOpen(!popoverOpen)
	}

	if (variant === 'list') {
		return (
			<Link
				to="/market/$productSlug"
				params={{ productSlug: product.slug }}
				className="flex items-center gap-4 py-3 px-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors"
			>
				{image ? (
					<img
						src={image}
						alt={name}
						className="w-14 h-14 rounded-lg object-cover bg-[var(--color-surface)]"
						loading="lazy"
					/>
				) : (
					<div
						aria-hidden="true"
						className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)]"
					>
						<Package size={18} />
					</div>
				)}
				<div className="flex-1 min-w-0">
					<p className="text-[14px] font-medium text-[var(--color-text)] line-clamp-1">
						{name}
					</p>
					<p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
						{categoryLabel} · {unit}
					</p>
				</div>
				<div className="relative">
					<button
						ref={btnRef}
						type="button"
						onClick={handleBtnClick}
						disabled={!isOrderable && !inCart}
						className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors backdrop-blur-sm disabled:pointer-events-none disabled:opacity-50 ${inCart ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-primary)]/30 hover:text-[var(--color-primary)]'}`}
						aria-label={
							inCart
								? t('market.editQuantity')
								: isOrderable
									? t('market.addToQuote')
									: t('market.outOfStock')
						}
					>
						{inCart ? (
							<span
								className={`font-mono font-semibold leading-none tabular-nums ${cartQty >= 100 ? 'text-[9px]' : 'text-[11px]'}`}
							>
								{cartQty}
							</span>
						) : (
							<Plus size={14} />
						)}
					</button>
					{popoverOpen && (
						<AddPopover
							product={product}
							onClose={() => setPopoverOpen(false)}
							anchorRef={btnRef}
						/>
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
			<div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-surface)] sm:aspect-[3/2]">
				{image ? (
					<img
						src={image}
						alt={name}
						className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
						<Package size={34} />
					</div>
				)}
				<button
					ref={btnRef}
					type="button"
					onClick={handleBtnClick}
					disabled={!isOrderable && !inCart}
					className={`absolute bottom-2 end-2 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ring-1 shadow-lg disabled:pointer-events-none sm:bottom-3 sm:end-3 sm:h-10 sm:w-10 ${
						inCart
							? 'backdrop-blur-md bg-white ring-white/40'
							: isOrderable
								? 'backdrop-blur-xl bg-black/20 ring-white/10 opacity-0 group-hover:opacity-100 max-lg:opacity-100 hover:bg-black/35'
								: 'bg-black/20 text-white/45 ring-white/10 opacity-60'
					}`}
					aria-label={
						inCart
							? t('market.editQuantity')
							: isOrderable
								? t('market.addToQuote')
								: t('market.outOfStock')
					}
				>
					{inCart ? (
						<span
							className={`font-mono font-semibold leading-none tabular-nums text-black ${cartQty >= 100 ? 'text-[11px]' : 'text-[13px]'}`}
						>
							{cartQty}
						</span>
					) : (
						<Plus size={16} className="text-white" />
					)}
				</button>
			</div>
			<AnimatePresence>
				{popoverOpen && (
					<AddPopover
						product={product}
						onClose={() => setPopoverOpen(false)}
						anchorRef={btnRef}
					/>
				)}
			</AnimatePresence>
			<div className="mt-2.5 px-0.5 sm:mt-3">
				<h3 className="text-[14px] font-medium text-[var(--color-text)] line-clamp-2 leading-snug sm:text-[15px]">
					{name}
				</h3>
				<p className="mt-1 text-[12px] text-[var(--color-text-muted)] sm:text-[13px]">
					{categoryLabel} · {unit}
				</p>
			</div>
		</Link>
	)
}
