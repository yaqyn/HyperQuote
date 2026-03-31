import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { formatPriceRange } from '../../lib/price-range'

interface Product {
	id: string
	slug: string
	name: string
	name_ar: string | null
	category: string
	unit_of_measure: string
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

function AvailabilityDot({ status }: { status: string | null }) {
	const { t } = useTranslation('website')

	const dotColor =
		status === 'available'
			? 'bg-[#16A34A]'
			: status === 'low_stock'
				? 'bg-[#CA8A04]'
				: 'bg-[var(--color-text-muted)]'

	const label =
		status === 'available'
			? t('market.availabilityAvailable')
			: status === 'low_stock'
				? t('market.availabilityLowStock')
				: t('market.priceOnRequest')

	return (
		<span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
			<span className={`w-2 h-2 rounded-full ${dotColor}`} />
			{label}
		</span>
	)
}

function GridCard({ product }: { product: Product }) {
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
	const displayName =
		locale === 'ar' ? product.name_ar || product.name : product.name
	const imageUrl = product.image_urls?.[0] || PLACEHOLDER_IMAGE

	return (
		<Link
			to="/market/$productSlug"
			params={{ productSlug: product.slug }}
			className="group block rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
		>
			{/* Image */}
			<div className="aspect-[4/3] bg-[var(--color-surface)] overflow-hidden">
				<img
					src={imageUrl}
					alt={displayName}
					className="w-full h-full object-cover"
					loading="lazy"
				/>
			</div>

			{/* Content */}
			<div className="p-4">
				{/* Category badge */}
				<span className="text-xs font-medium text-[var(--color-primary)] mb-2 block">
					{t(`categories.${product.category}`)}
				</span>

				{/* Name */}
				<h3 className="text-base font-semibold text-[var(--color-text)] line-clamp-2 mb-2">
					{displayName}
				</h3>

				{/* Price range */}
				<p className="font-mono text-sm text-[var(--color-primary)] mb-2">
					{formatPriceRange(
						product.price_range_min,
						product.price_range_max,
						product.unit_of_measure,
						locale,
						t,
					)}
				</p>

				{/* Availability */}
				<AvailabilityDot status={product.availability_status} />

				{/* Add to Quote (visible on hover desktop, always on mobile) */}
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault()
						console.log('Add to Quote - Login Modal (Phase 6)')
					}}
					className="mt-3 w-full h-9 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity"
				>
					{t('market.addToQuote')}
				</button>
			</div>
		</Link>
	)
}

function ListCard({ product }: { product: Product }) {
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
	const displayName =
		locale === 'ar' ? product.name_ar || product.name : product.name
	const imageUrl = product.image_urls?.[0] || PLACEHOLDER_IMAGE

	return (
		<Link
			to="/market/$productSlug"
			params={{ productSlug: product.slug }}
			className="flex items-center gap-4 h-20 px-4 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] hover:shadow-sm transition-shadow"
		>
			{/* Thumbnail */}
			<img
				src={imageUrl}
				alt={displayName}
				className="w-12 h-12 rounded object-cover bg-[var(--color-surface)]"
				loading="lazy"
			/>

			{/* Name */}
			<span className="flex-1 text-sm font-medium text-[var(--color-text)] line-clamp-1">
				{displayName}
			</span>

			{/* Category */}
			<span className="w-30 text-xs text-[var(--color-text-muted)] hidden md:block">
				{t(`categories.${product.category}`)}
			</span>

			{/* Price range */}
			<span className="w-35 font-mono text-sm text-[var(--color-primary)] hidden md:block">
				{formatPriceRange(
					product.price_range_min,
					product.price_range_max,
					product.unit_of_measure,
					locale,
					t,
				)}
			</span>

			{/* Availability */}
			<span className="w-30 hidden md:block">
				<AvailabilityDot status={product.availability_status} />
			</span>

			{/* Add button */}
			<button
				type="button"
				onClick={(e) => {
					e.preventDefault()
					console.log('Add to Quote - Login Modal (Phase 6)')
				}}
				className="p-2 rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
				aria-label={t('market.addToQuote')}
			>
				<Plus size={18} aria-hidden="true" />
			</button>
		</Link>
	)
}

export function ProductCard({ product, variant }: ProductCardProps) {
	if (variant === 'list') {
		return <ListCard product={product} />
	}
	return <GridCard product={product} />
}
