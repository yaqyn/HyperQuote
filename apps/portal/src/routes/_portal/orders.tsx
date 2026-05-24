/**
 * Orders - compact responsive order index.
 *
 * Matches the current portal market language: centered top action, compact
 * summary controls, card grids on mobile/tablet, and no horizontal overflow.
 */

import {
	buildOpenStreetMapTileView,
	type GeoPoint,
} from '@hyperquote/ui/maps/osm'
import { resolveRoadRoute } from '@hyperquote/ui/maps/road-route'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import {
	ChevronDown,
	Clock,
	Copy,
	MapPin,
	Navigation,
	Pencil,
	Plus,
	QrCode,
	Trash2,
	Truck,
	X,
} from 'lucide-react'
import {
	lazy,
	type RefObject,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import type {
	IncomingInteractiveMapPoint,
	IncomingRouteFeatureCollection,
} from '../../components/orders/IncomingOrdersInteractiveMap'
import { DraftQuoteTrigger } from '../../components/shared/DraftQuoteTrigger'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import {
	customerDeliveryDestinationPlace,
	describeDriverLocationForCustomer,
} from '../../lib/delivery-location-copy'
import { getDeliverySecret } from '../../lib/server/deliveries'
import {
	deleteOrder,
	getAllCustomerOrders,
	saveOrderAsDraft,
} from '../../lib/server/orders'
import { toast } from '../../lib/toast'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'
import type {
	Order,
	OrderDeliveryTracking,
	OrderStatus,
	OrderType,
} from '../../types/order'

const ordersSearchSchema = z.object({
	draft: z
		.preprocess(
			(value) =>
				value === true || value === 'true' || value === '1' || value === 1,
			z.boolean(),
		)
		.optional(),
})

export const Route = createFileRoute('/_portal/orders')({
	validateSearch: (search) => ordersSearchSchema.parse(search),
	component: OrdersPage,
})

const SECTION_META: Record<
	OrderType,
	{
		labelKey: 'orders.saved' | 'orders.submitted' | 'orders.confirmed'
	}
> = {
	saved: { labelKey: 'orders.saved' },
	submitted: { labelKey: 'orders.submitted' },
	confirmed: { labelKey: 'orders.confirmed' },
}

const ORDER_PREVIEW_SLOT_COUNT = 3
const ORDER_PREVIEW_SLOT_KEYS = ['slot-1', 'slot-2', 'slot-3'] as const
const ORDER_STATUS_LABEL_KEYS: Partial<
	Record<OrderStatus, ParseKeys<'portal'>>
> = {
	order_confirmed: 'tracking.confirmed',
	being_prepared: 'tracking.beingPrepared',
	out_for_delivery: 'tracking.outForDelivery',
	delivered: 'tracking.delivered',
	cancelled: 'tracking.cancelled',
	rejected: 'tracking.rejected',
}
const INCOMING_MAP_WIDTH = 1100
const INCOMING_MAP_HEIGHT = 430
const INCOMING_COLORS = [
	{ driver: '#f97316', destination: '#9a3412' },
	{ driver: '#2563eb', destination: '#1e3a8a' },
	{ driver: '#16a34a', destination: '#166534' },
	{ driver: '#9333ea', destination: '#581c87' },
	{ driver: '#dc2626', destination: '#7f1d1d' },
] as const
const PORTAL_LABEL_CLASS =
	'text-[11px] font-semibold text-[var(--p-text-faint)]'
type MarketDraftItem = ReturnType<
	typeof useDraftQuoteStore.getState
>['items'][number]
const IncomingOrdersInteractiveMap = lazy(() =>
	import('../../components/orders/IncomingOrdersInteractiveMap').then(
		(module) => ({
			default: module.IncomingOrdersInteractiveMap,
		}),
	),
)

interface IncomingRoadRoutePair {
	color: string
	deliveryId: string
	points: [GeoPoint, GeoPoint]
}

function canUseInteractiveMap(): boolean {
	const canvas = document.createElement('canvas')
	return Boolean(
		canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'),
	)
}

function emptyIncomingRouteFeatureCollection(): IncomingRouteFeatureCollection {
	return { features: [], type: 'FeatureCollection' }
}

function OrdersPage() {
	const { t, i18n } = useTranslation('portal')
	const { draft } = Route.useSearch()
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'
	const savedSectionRef = useRef<HTMLElement | null>(null)
	const submittedSectionRef = useRef<HTMLElement | null>(null)
	const confirmedSectionRef = useRef<HTMLElement | null>(null)
	const draftItems = useDraftQuoteStore((s) => s.items)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const [collapsedSections, setCollapsedSections] = useState<
		Record<OrderType, boolean>
	>({
		saved: false,
		submitted: false,
		confirmed: true,
	})

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		refetchInterval: 5_000,
		refetchIntervalInBackground: true,
		staleTime: 5_000,
	})

	const grouped = useMemo(() => {
		if (!data?.orders) return { saved: [], submitted: [], confirmed: [] }
		return {
			saved: data.orders.filter((order) => order.type === 'saved'),
			submitted: data.orders.filter((order) => order.type === 'submitted'),
			confirmed: data.orders.filter((order) => order.type === 'confirmed'),
		}
	}, [data])

	const totalCount =
		grouped.saved.length + grouped.submitted.length + grouped.confirmed.length
	const incomingDeliveries = data?.incomingDeliveries ?? []
	const hasDraft = draftItems.length > 0
	useEffect(() => {
		if (draft) {
			setDraftQuoteOpen(true)
			navigate({ to: '/orders', search: {}, replace: true })
		}
	}, [draft, navigate, setDraftQuoteOpen])

	const openDraft = () => {
		setDraftQuoteOpen(true)
	}
	const toggleSection = (type: OrderType) => {
		setCollapsedSections((current) => ({
			...current,
			[type]: !current[type],
		}))
	}
	const scrollToSection = (type: OrderType) => {
		setCollapsedSections((current) => ({
			...current,
			[type]: false,
		}))
		requestAnimationFrame(() => {
			const target =
				type === 'saved'
					? savedSectionRef.current
					: type === 'submitted'
						? submittedSectionRef.current
						: confirmedSectionRef.current

			target?.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'auto'
					: 'smooth',
				block: 'start',
			})
		})
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[var(--p-bg)]">
			<header className="sticky top-0 z-20 shrink-0 bg-[var(--p-bg)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12 lg:pb-6">
				<div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3">
					<PortalTitleRow title={t('sidebar.nav.orders')} className="flex-1" />
					<Link
						to="/market"
						className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:h-11 sm:px-5 sm:text-[14px]"
					>
						<Plus size={16} strokeWidth={1.8} />
						{t('orders.newQuote')}
					</Link>
				</div>
			</header>

			<section className="shrink-0 border-y border-[var(--p-border)] py-2.5 sm:py-3">
				<div className="mx-auto grid w-full max-w-[1400px] grid-cols-3 gap-2 px-4 sm:gap-3 sm:px-6 lg:px-12">
					<SummaryTile
						type="saved"
						count={grouped.saved.length}
						isAr={isAr}
						onSelect={() => scrollToSection('saved')}
					/>
					<SummaryTile
						type="submitted"
						count={grouped.submitted.length}
						isAr={isAr}
						onSelect={() => scrollToSection('submitted')}
					/>
					<SummaryTile
						type="confirmed"
						count={grouped.confirmed.length}
						isAr={isAr}
						onSelect={() => scrollToSection('confirmed')}
					/>
				</div>
			</section>

			<main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-8 lg:px-12">
				{isLoading && <OrdersSkeleton />}

				{isError && (
					<div className="flex flex-col items-center gap-4 px-4 py-20 text-center sm:py-24">
						<p className="text-[16px] font-medium text-[var(--p-text)]">
							{t('orders.error')}
						</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--p-border)] px-5 text-[14px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)]"
						>
							{t('orders.retry')}
						</button>
					</div>
				)}

				{!isLoading && !isError && totalCount === 0 && !hasDraft && (
					<OrdersEmpty />
				)}

				{!isLoading && !isError && (totalCount > 0 || hasDraft) && (
					<div className="space-y-8 sm:space-y-10 lg:space-y-12">
						{incomingDeliveries.length > 0 && (
							<IncomingOrdersSection
								deliveries={incomingDeliveries}
								isAr={isAr}
							/>
						)}
						{hasDraft && (
							<MarketDraftTile
								items={draftItems}
								isAr={isAr}
								onOpen={openDraft}
							/>
						)}
						<OrdersSection
							type="saved"
							orders={grouped.saved}
							isAr={isAr}
							isCollapsed={collapsedSections.saved}
							onToggle={() => toggleSection('saved')}
							sectionRef={savedSectionRef}
						/>
						<OrdersSection
							type="submitted"
							orders={grouped.submitted}
							isAr={isAr}
							isCollapsed={collapsedSections.submitted}
							onToggle={() => toggleSection('submitted')}
							sectionRef={submittedSectionRef}
						/>
						<OrdersSection
							type="confirmed"
							orders={grouped.confirmed}
							isAr={isAr}
							isCollapsed={collapsedSections.confirmed}
							onToggle={() => toggleSection('confirmed')}
							sectionRef={confirmedSectionRef}
						/>
					</div>
				)}
			</main>
		</div>
	)
}

function SummaryTile({
	type,
	count,
	isAr,
	onSelect,
}: {
	type: OrderType
	count: number
	isAr: boolean
	onSelect: () => void
}) {
	const { t } = useTranslation('portal')
	const meta = SECTION_META[type]

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={count === 0}
			className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-2 py-2 text-center transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] disabled:cursor-default disabled:opacity-45 sm:min-h-[52px] sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:text-start"
		>
			<p
				className="shrink-0 text-[16px] font-semibold leading-none text-[var(--p-text)] sm:text-[17px]"
				style={{ fontVariantNumeric: 'tabular-nums' }}
			>
				{isAr ? count.toLocaleString('ar-EG') : count.toLocaleString('en-EG')}
			</p>
			<p className="min-w-0 truncate text-[11px] font-medium leading-tight text-[var(--p-text-muted)] sm:text-[12px]">
				{t(meta.labelKey)}
			</p>
		</button>
	)
}

function MarketDraftTile({
	items,
	isAr,
	onOpen,
}: {
	items: MarketDraftItem[]
	isAr: boolean
	onOpen: () => void
}) {
	const { t } = useTranslation('portal')
	const previewItems = items.slice(0, ORDER_PREVIEW_SLOT_COUNT)
	const extraItemCount = Math.max(0, items.length - previewItems.length)

	return (
		<section aria-label={t('market.draftQuote')}>
			<article className="flex min-w-0 flex-col rounded-xl border border-dashed border-[var(--p-border-strong)] bg-[var(--p-card)] p-3.5 sm:p-4">
				<DraftQuoteTrigger count={items.length} isAr={isAr} onClick={onOpen} />

				<div className="mt-3 grid gap-2">
					{previewItems.map((item) => {
						const itemName = isAr && item.nameAr ? item.nameAr : item.name
						return (
							<div
								key={item.productId}
								className="flex min-w-0 items-center gap-2.5"
							>
								<OrderItemImage
									imageUrl={item.imageUrl}
									alt={itemName}
									className="h-9 w-9 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)] sm:h-10 sm:w-10"
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-[13px] font-medium text-[var(--p-text)]">
										{itemName}
									</p>
									<p
										className="text-[12px] font-medium text-[var(--p-text-muted)]"
										style={{ fontVariantNumeric: 'tabular-nums' }}
									>
										{formatQuantity(item.quantity, isAr)}{' '}
										{isAr && item.unitOfMeasureAr
											? item.unitOfMeasureAr
											: item.unitOfMeasure}
									</p>
								</div>
							</div>
						)
					})}
					{extraItemCount > 0 && (
						<p className="px-0.5 text-[12px] font-medium text-[var(--p-text-muted)]">
							+
							{t('market.cartItemCount', {
								count: formatQuantity(extraItemCount, isAr),
							})}
						</p>
					)}
				</div>
			</article>
		</section>
	)
}

function IncomingOrdersSection({
	deliveries,
	isAr,
}: {
	deliveries: OrderDeliveryTracking[]
	isAr: boolean
}) {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-GB'

	return (
		<section aria-label={t('orders.incoming')} className="scroll-mt-24">
			<div className="overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)]">
				<header className="border-b border-[var(--p-border)] px-4 py-4 sm:px-5 lg:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<p className={PORTAL_LABEL_CLASS}>{t('orders.incomingMap')}</p>
							<h2 className="mt-1 text-[22px] font-semibold leading-tight text-[var(--p-text)] sm:text-[26px]">
								{t('orders.incoming')}
							</h2>
							<p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--p-text-muted)]">
								{t('orders.incomingBody', {
									count: deliveries.length,
								})}
							</p>
						</div>
						<span
							className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-[var(--p-border)] bg-[var(--p-bg)] px-3 text-[12px] font-medium text-[var(--p-text-muted)]"
							style={{ fontVariantNumeric: 'tabular-nums' }}
						>
							<Navigation size={14} strokeWidth={1.8} />
							{t('orders.incomingCount', {
								count: isAr
									? deliveries.length.toLocaleString('ar-EG')
									: deliveries.length.toLocaleString('en-EG'),
							})}
						</span>
					</div>
				</header>

				<div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
					<IncomingOrdersMap deliveries={deliveries} />
					<div className="grid gap-3 md:grid-cols-2">
						{deliveries.map((delivery, index) => {
							const palette = INCOMING_COLORS[index % INCOMING_COLORS.length]
							const driverPlaceLabel =
								describeDriverLocationForCustomer(delivery)
							const destinationLabel =
								customerDeliveryDestinationPlace(delivery) ??
								delivery.route.destination
							return (
								<article
									key={delivery.id}
									className="grid gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] p-3 sm:grid-cols-[1fr_auto] sm:items-center"
								>
									<div className="min-w-0">
										<div className="flex min-w-0 flex-wrap items-center gap-2">
											<span
												aria-hidden="true"
												className="h-2.5 w-2.5 rounded-full"
												style={{ backgroundColor: palette.driver }}
											/>
											<p className="min-w-0 truncate text-[14px] font-semibold text-[var(--p-text)]">
												{t('orders.incomingOrder', {
													reference:
														delivery.orderNumber || delivery.deliveryNumber,
												})}
											</p>
											<span className="rounded-full border border-[var(--p-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--p-text-muted)]">
												{t('tracking.outForDelivery')}
											</span>
										</div>
										<dl className="mt-2 grid gap-1.5 text-[12px] text-[var(--p-text-muted)]">
											<div className="flex min-w-0 items-center gap-2">
												<Truck
													size={14}
													strokeWidth={1.8}
													className="shrink-0"
												/>
												<span className="truncate">
													{t('orders.incomingDriver', {
														name:
															delivery.driverName || delivery.deliveryNumber,
													})}
												</span>
											</div>
											<div className="flex min-w-0 items-center gap-2">
												<MapPin
													size={14}
													strokeWidth={1.8}
													className="shrink-0"
													style={{ color: palette.driver }}
												/>
												<span className="min-w-0 break-words">
													{t('orders.incomingDriverLocation', {
														place: driverPlaceLabel,
													})}
												</span>
											</div>
											<div className="flex min-w-0 items-center gap-2">
												<MapPin
													size={14}
													strokeWidth={1.8}
													className="shrink-0"
													style={{ color: palette.destination }}
												/>
												<span className="min-w-0 break-words">
													{t('orders.incomingDestination', {
														address: destinationLabel,
													})}
												</span>
											</div>
											<div className="flex min-w-0 items-center gap-2">
												<Clock
													size={14}
													strokeWidth={1.8}
													className="shrink-0"
												/>
												<span className="truncate">
													{t('orders.incomingUpdated', {
														time: formatTime(delivery.lastUpdated, locale),
													})}
												</span>
											</div>
										</dl>
									</div>
									<IncomingOrderActions
										delivery={delivery}
										onView={() =>
											navigate({
												to: '/orders/$orderId',
												params: { orderId: delivery.orderId },
											})
										}
									/>
								</article>
							)
						})}
					</div>
				</div>
			</div>
		</section>
	)
}

function IncomingOrderActions({
	delivery,
	onView,
}: {
	delivery: OrderDeliveryTracking
	onView: () => void
}) {
	const { t } = useTranslation('portal')
	const [isSecretOpen, setIsSecretOpen] = useState(false)
	const secret = useMutation({
		mutationFn: () =>
			getDeliverySecret({ data: { orderId: delivery.orderId } }),
	})

	useEffect(() => {
		if (!isSecretOpen) return undefined
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setIsSecretOpen(false)
		}
		globalThis.addEventListener('keydown', handleKeyDown)
		return () => globalThis.removeEventListener('keydown', handleKeyDown)
	}, [isSecretOpen])

	function handleSecretOpen() {
		setIsSecretOpen(true)
		if (!secret.data && !secret.isPending) {
			secret.mutate()
		}
	}

	return (
		<div className="grid min-w-0 gap-2 sm:w-[300px]">
			<div className="grid min-w-0 grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onView}
					className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
				>
					<span className="truncate">{t('orders.view')}</span>
				</button>
				<button
					type="button"
					aria-haspopup="dialog"
					aria-expanded={isSecretOpen}
					onClick={handleSecretOpen}
					className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)]"
				>
					<QrCode aria-hidden="true" size={14} strokeWidth={2} />
					<span className="truncate">
						{secret.isPending
							? t('tracking.secretLoading')
							: t('tracking.secretAndQr')}
					</span>
				</button>
			</div>

			{isSecretOpen && typeof document !== 'undefined'
				? createPortal(
						<div className="fixed inset-0 z-[80] grid place-items-center px-4 py-6">
							<button
								type="button"
								aria-label={t('window.close')}
								className="absolute inset-0 bg-black/45"
								onClick={() => setIsSecretOpen(false)}
							/>
							<div
								aria-labelledby={`delivery-secret-${delivery.id}`}
								aria-modal="true"
								className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
								role="dialog"
							>
								<header className="flex items-center justify-between gap-3 border-b border-[var(--p-border)] px-5 py-4">
									<div className="min-w-0">
										<p
											className={PORTAL_LABEL_CLASS}
											id={`delivery-secret-${delivery.id}`}
										>
											{t('tracking.secretCode')}
										</p>
										<p className="mt-1 truncate text-[13px] font-medium text-[var(--p-text-muted)]">
											{delivery.orderNumber || delivery.deliveryNumber}
										</p>
									</div>
									<button
										type="button"
										aria-label={t('window.close')}
										onClick={() => setIsSecretOpen(false)}
										className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:text-[var(--p-text)]"
									>
										<X aria-hidden="true" size={18} strokeWidth={1.9} />
									</button>
								</header>

								{secret.data ? (
									<div className="grid gap-5 px-5 py-6 text-center sm:px-6">
										<p
											className="break-all text-[40px] font-semibold leading-none text-[var(--p-text)] sm:text-[46px]"
											style={{ fontVariantNumeric: 'tabular-nums' }}
										>
											{secret.data.code}
										</p>
										<div className="mx-auto grid h-64 w-64 place-items-center rounded-2xl border border-[var(--p-border)] bg-white p-3 sm:h-72 sm:w-72">
											<img
												alt={t('tracking.secretQrAlt')}
												src={secret.data.qrCodeDataUrl}
												className="h-full w-full object-contain"
											/>
										</div>
									</div>
								) : (
									<div className="grid min-h-80 place-items-center px-5 py-6">
										<p
											role={secret.isError ? 'alert' : undefined}
											className={`text-[13px] font-semibold ${
												secret.isError
													? 'text-red-700'
													: 'text-[var(--p-text-muted)]'
											}`}
										>
											{secret.isError
												? t('tracking.secretUnavailable')
												: t('tracking.secretLoading')}
										</p>
									</div>
								)}
							</div>
						</div>,
						document.body,
					)
				: null}
		</div>
	)
}

function IncomingOrdersMap({
	deliveries,
}: {
	deliveries: OrderDeliveryTracking[]
}) {
	const { t } = useTranslation('portal')
	const [mapFailed, setMapFailed] = useState(false)
	const [interactiveMapReady, setInteractiveMapReady] = useState<
		boolean | null
	>(null)
	const interactivePoints = useMemo<IncomingInteractiveMapPoint[]>(
		() =>
			deliveries.flatMap((delivery, index) => {
				const palette = INCOMING_COLORS[index % INCOMING_COLORS.length]
				const driverPoint = toGeoPoint(delivery.route.driverLocation)
				const destinationPoint = toGeoPoint(delivery.route.destinationLocation)
				const entries: IncomingInteractiveMapPoint[] = []
				if (driverPoint) {
					entries.push({
						caption: t('tracking.driver'),
						color: palette.driver,
						icon: 'driver',
						key: `driver-${delivery.id}`,
						label: delivery.driverName || delivery.deliveryNumber,
						point: driverPoint,
					})
				}
				if (destinationPoint) {
					entries.push({
						caption: t('tracking.destination'),
						color: palette.destination,
						icon: 'destination',
						key: `destination-${delivery.id}`,
						label: delivery.route.destination || delivery.deliveryNumber,
						point: destinationPoint,
					})
				}
				return entries
			}),
		[deliveries, t],
	)
	const routePairs = useMemo<IncomingRoadRoutePair[]>(
		() =>
			deliveries.flatMap((delivery, index) => {
				const driverPoint = toGeoPoint(delivery.route.driverLocation)
				const destinationPoint = toGeoPoint(delivery.route.destinationLocation)
				if (!driverPoint || !destinationPoint) return []
				return [
					{
						color: INCOMING_COLORS[index % INCOMING_COLORS.length].driver,
						deliveryId: delivery.id,
						points: [driverPoint, destinationPoint],
					},
				]
			}),
		[deliveries],
	)
	const [routeLinesGeoJSON, setRouteLinesGeoJSON] =
		useState<IncomingRouteFeatureCollection>(() =>
			emptyIncomingRouteFeatureCollection(),
		)

	useEffect(() => {
		if (routePairs.length === 0) {
			setRouteLinesGeoJSON(emptyIncomingRouteFeatureCollection())
			return
		}

		const controller = new AbortController()
		void Promise.all(
			routePairs.map(async (routePair) => {
				const route = await resolveRoadRoute({
					endpoint: import.meta.env.VITE_ROAD_ROUTE_ENDPOINT,
					points: routePair.points,
					signal: controller.signal,
				})
				return {
					geometry: {
						coordinates: route.coordinates,
						type: 'LineString' as const,
					},
					properties: {
						color: routePair.color,
						deliveryId: routePair.deliveryId,
					},
					type: 'Feature' as const,
				}
			}),
		).then((features) => {
			if (controller.signal.aborted) return
			setRouteLinesGeoJSON({
				features,
				type: 'FeatureCollection',
			})
		})

		return () => controller.abort()
	}, [routePairs])

	const mapCenter = interactivePoints[0]?.point ?? null
	const staticMap = <IncomingStaticMap deliveries={deliveries} />
	const staticMapOverlay = (
		<IncomingStaticMap deliveries={deliveries} isOverlay={true} />
	)

	useEffect(() => {
		setInteractiveMapReady(canUseInteractiveMap())
	}, [])

	if (interactiveMapReady && !mapFailed && mapCenter) {
		return (
			<Suspense fallback={staticMap}>
				<IncomingOrdersInteractiveMap
					center={mapCenter}
					fallback={staticMapOverlay}
					onMapFailed={() => setMapFailed(true)}
					points={interactivePoints}
					routeLines={routeLinesGeoJSON}
				/>
			</Suspense>
		)
	}

	return staticMap
}

function IncomingStaticMap({
	deliveries,
	isOverlay = false,
}: {
	deliveries: OrderDeliveryTracking[]
	isOverlay?: boolean
}) {
	const { t } = useTranslation('portal')
	const geoEntries = buildIncomingGeoEntries(deliveries)
	const mapView = buildOpenStreetMapTileView(
		geoEntries.map((entry) => entry.point),
		{
			height: INCOMING_MAP_HEIGHT,
			maxZoom: 14,
			minZoom: 9,
			padding: 112,
			width: INCOMING_MAP_WIDTH,
		},
	)
	const mapPositionByKey = new Map(
		mapView
			? geoEntries.map((entry, index) => {
					const projected = mapView.points[index]
					return [
						entry.key,
						projected
							? {
									left: (projected.x / mapView.width) * 100,
									top: (projected.y / mapView.height) * 100,
								}
							: null,
					] as const
				})
			: [],
	)
	const markers = deliveries.flatMap((delivery, index) => {
		const palette = INCOMING_COLORS[index % INCOMING_COLORS.length]
		const driverPosition =
			mapPositionByKey.get(`driver-${delivery.id}`) ??
			fallbackIncomingPosition(index, 'driver')
		const destinationPosition =
			mapPositionByKey.get(`destination-${delivery.id}`) ??
			fallbackIncomingPosition(index, 'destination')

		return [
			{
				caption: t('tracking.driver'),
				color: palette.driver,
				icon: 'driver' as const,
				key: `driver-${delivery.id}`,
				label: delivery.driverName || delivery.deliveryNumber,
				position: driverPosition,
			},
			{
				caption: t('tracking.destination'),
				color: palette.destination,
				icon: 'destination' as const,
				key: `destination-${delivery.id}`,
				label: delivery.route.destination || delivery.deliveryNumber,
				position: destinationPosition,
			},
		]
	})
	const lines = deliveries.map((delivery, index) => ({
		color: INCOMING_COLORS[index % INCOMING_COLORS.length].driver,
		destination:
			mapPositionByKey.get(`destination-${delivery.id}`) ??
			fallbackIncomingPosition(index, 'destination'),
		key: delivery.id,
		origin:
			mapPositionByKey.get(`driver-${delivery.id}`) ??
			fallbackIncomingPosition(index, 'driver'),
	}))

	return (
		<figure
			aria-hidden={isOverlay ? 'true' : undefined}
			className={
				isOverlay
					? 'absolute inset-0 overflow-hidden rounded-xl bg-[var(--p-bg)]'
					: 'relative h-[340px] overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] sm:h-[390px] lg:h-[430px]'
			}
		>
			{mapView ? <IncomingOsmBackdrop mapView={mapView} /> : null}
			{!mapView && (
				<div
					aria-hidden="true"
					className="absolute inset-0 opacity-80"
					style={{
						background:
							'linear-gradient(90deg, rgba(17,17,17,0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(17,17,17,0.05) 1px, transparent 1px)',
						backgroundSize: '52px 52px',
					}}
				/>
			)}
			<svg
				aria-label={t('orders.incomingMap')}
				role="img"
				viewBox="0 0 100 100"
				className="absolute inset-0 h-full w-full"
				preserveAspectRatio="none"
			>
				<title>{t('orders.incomingMap')}</title>
				{lines.map((line) => (
					<line
						key={line.key}
						x1={line.origin.left}
						y1={line.origin.top}
						x2={line.destination.left}
						y2={line.destination.top}
						stroke={line.color}
						strokeDasharray="4 4"
						strokeLinecap="round"
						strokeWidth="0.65"
						opacity="0.72"
					/>
				))}
			</svg>
			{markers.map((marker) => (
				<div
					key={marker.key}
					className="absolute z-10 flex max-w-[150px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center"
					style={{
						left: `${marker.position.left}%`,
						top: `${marker.position.top}%`,
					}}
				>
					<span
						className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg"
						style={{
							backgroundColor: marker.color,
							boxShadow: '0 10px 30px rgba(17, 24, 39, 0.2)',
						}}
					>
						{marker.icon === 'driver' ? (
							<Truck size={16} strokeWidth={2.1} />
						) : (
							<MapPin size={16} strokeWidth={2.1} />
						)}
					</span>
					<span className="max-w-full rounded-lg bg-[rgba(17,24,39,0.82)] px-2 py-1 text-[10px] font-semibold leading-tight text-white shadow-sm">
						<span className="block truncate">{marker.label}</span>
						<span className="block truncate text-[9px] font-medium text-white/75">
							{marker.caption}
						</span>
					</span>
				</div>
			))}
		</figure>
	)
}

type IncomingMapView = NonNullable<
	ReturnType<typeof buildOpenStreetMapTileView>
>

function IncomingOsmBackdrop({ mapView }: { mapView: IncomingMapView }) {
	return (
		<svg
			aria-hidden="true"
			className="absolute inset-0 h-full w-full opacity-95"
			preserveAspectRatio="xMidYMid slice"
			viewBox={`0 0 ${mapView.width} ${mapView.height}`}
		>
			{mapView.tiles.map((tile) => (
				<image
					height="256"
					href={tile.href}
					key={tile.key}
					opacity="0.86"
					width="256"
					x={tile.x}
					y={tile.y}
				/>
			))}
			<rect
				fill="rgba(250,250,250,0.24)"
				height={mapView.height}
				width={mapView.width}
				x="0"
				y="0"
			/>
		</svg>
	)
}

function buildIncomingGeoEntries(deliveries: OrderDeliveryTracking[]) {
	return deliveries.flatMap((delivery) => {
		const entries: Array<{ key: string; point: GeoPoint }> = []
		const driverPoint = toGeoPoint(delivery.route.driverLocation)
		const destinationPoint = toGeoPoint(delivery.route.destinationLocation)
		if (driverPoint) {
			entries.push({ key: `driver-${delivery.id}`, point: driverPoint })
		}
		if (destinationPoint) {
			entries.push({
				key: `destination-${delivery.id}`,
				point: destinationPoint,
			})
		}
		return entries
	})
}

function toGeoPoint(point: OrderDeliveryTracking['route']['driverLocation']) {
	if (!point) return null
	if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null
	return { lat: point.lat, lng: point.lng }
}

function fallbackIncomingPosition(
	index: number,
	type: 'destination' | 'driver',
) {
	const lane = index % 4
	const row = Math.floor(index / 4)
	const left = 16 + lane * 22
	const topOffset = (row % 3) * 8
	return type === 'driver'
		? { left: Math.min(left, 88), top: 28 + topOffset }
		: { left: Math.min(left + 8, 92), top: 70 + topOffset }
}

function OrdersSection({
	type,
	orders,
	isAr,
	isCollapsed,
	onToggle,
	sectionRef,
}: {
	type: OrderType
	orders: Order[]
	isAr: boolean
	isCollapsed: boolean
	onToggle: () => void
	sectionRef: RefObject<HTMLElement | null>
}) {
	const { t } = useTranslation('portal')
	const meta = SECTION_META[type]

	if (orders.length === 0) return null

	return (
		<section aria-label={t(meta.labelKey)}>
			<header
				ref={sectionRef}
				className="scroll-mt-[76px] mb-3 border-b border-[var(--p-border)] pb-2.5 sm:scroll-mt-24 lg:scroll-mt-28"
			>
				<button
					type="button"
					aria-expanded={!isCollapsed}
					onClick={onToggle}
					className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-start transition-colors hover:bg-[var(--p-hover)] sm:px-3"
				>
					<span className="flex min-w-0 items-center gap-2">
						<ChevronDown
							size={17}
							strokeWidth={1.8}
							className={`shrink-0 text-[var(--p-text-muted)] transition-transform ${
								isCollapsed ? '-rotate-90 rtl:rotate-90' : ''
							}`}
						/>
						<span className="truncate text-[17px] font-semibold text-[var(--p-text)] sm:text-[18px]">
							{t(meta.labelKey)}
						</span>
					</span>
					<span
						className="shrink-0 text-[12px] font-medium text-[var(--p-text-muted)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{isAr
							? orders.length.toLocaleString('ar-EG')
							: orders.length.toLocaleString('en-EG')}
					</span>
				</button>
			</header>
			{!isCollapsed &&
				(type === 'saved' ? (
					<SavedDraftList orders={orders} isAr={isAr} />
				) : (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{orders.map((order) => (
							<OrderTile key={order.id} order={order} isAr={isAr} />
						))}
					</div>
				))}
		</section>
	)
}

function SavedDraftList({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
	const { t } = useTranslation('portal')

	return (
		<div className="space-y-3">
			<p className="px-1 text-[13px] leading-relaxed text-[var(--p-text-muted)]">
				{t('orders.savedDraftsHelp')}
			</p>
			<div className="grid gap-2">
				{orders.map((order) => (
					<SavedDraftRow key={order.id} order={order} isAr={isAr} />
				))}
			</div>
		</div>
	)
}

function SavedDraftRow({ order, isAr }: { order: Order; isAr: boolean }) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [confirmDelete, setConfirmDelete] = useState(false)
	const title = order.name ?? order.reference ?? order.id
	const dateLabel = formatDate(order.date, isAr)
	const sourceLabel =
		order.draftSource === 'lyon'
			? t('orders.lyonDraft')
			: t('orders.manualDraft')
	const previewItems = order.items.slice(0, ORDER_PREVIEW_SLOT_COUNT)
	const extraItemCount = Math.max(0, order.items.length - previewItems.length)

	const deleteMutation = useMutation({
		mutationFn: () => deleteOrder({ data: { orderId: order.id } }),
		onSuccess: () => {
			queryClient.setQueryData<{
				incomingDeliveries: OrderDeliveryTracking[]
				orders: Order[]
			}>(['customer-orders-all'], (current) =>
				current
					? {
							incomingDeliveries: current.incomingDeliveries.filter(
								(delivery) => delivery.orderId !== order.linkedOrderId,
							),
							orders: current.orders.filter((item) => item.id !== order.id),
						}
					: current,
			)
		},
	})

	function openEditor() {
		navigate({
			to: '/orders/edit/$orderId',
			params: { orderId: order.id },
		})
	}

	const duplicateMutation = useMutation({
		mutationFn: () => saveOrderAsDraft({ data: { orderId: order.id } }),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.savedAsDraft', { ref: result.reference }))
		},
		onError: () => {
			toast.error(t('orders.saveDraftFailed'))
		},
	})

	return (
		<article className="grid min-w-0 gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3.5 transition-colors hover:border-[var(--p-border-strong)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
			<div className="min-w-0">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<span className="rounded-full border border-[var(--p-border)] bg-[var(--p-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--p-text-muted)]">
						{sourceLabel}
					</span>
					<span className="text-[12px] font-medium text-[var(--p-text-faint)]">
						{t('orders.lastEdited', { date: dateLabel })}
					</span>
				</div>
				<h3 className="mt-2 truncate text-[16px] font-semibold text-[var(--p-text)] sm:text-[17px]">
					{title}
				</h3>
				{order.reference && order.reference !== title ? (
					<p className="mt-1 font-mono text-[12px] text-[var(--p-text-muted)]">
						{order.reference}
					</p>
				) : null}
				<div className="mt-3 flex min-w-0 flex-wrap items-center gap-2.5">
					{previewItems.map((item) => {
						const itemName = isAr ? item.productNameAr : item.productName
						return (
							<div
								key={`${order.id}-${item.productId}`}
								className="flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-bg)] py-1 pe-2 ps-1"
							>
								<OrderItemImage
									imageUrl={item.imageUrl}
									alt={itemName}
									className="h-7 w-7 shrink-0 rounded-md bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
								/>
								<span className="min-w-0 truncate text-[12px] text-[var(--p-text)]">
									{itemName}
								</span>
							</div>
						)
					})}
					{extraItemCount > 0 && (
						<span className="rounded-full border border-[var(--p-border)] px-2.5 py-1 text-[11px] text-[var(--p-text-muted)]">
							{t('orders.itemPreviewMore', { count: extraItemCount })}
						</span>
					)}
				</div>
				<p className="mt-2 text-[12px] text-[var(--p-text-muted)]">
					{t('orders.items', { count: order.itemCount })}
				</p>
			</div>

			{confirmDelete ? (
				<div className="grid gap-2 sm:w-[240px] sm:grid-cols-2">
					<button
						type="button"
						onClick={() => deleteMutation.mutate()}
						disabled={deleteMutation.isPending}
						className="h-10 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-error)] transition-colors hover:bg-[var(--p-hover)] disabled:opacity-50"
					>
						{t('orders.confirmDelete')}
					</button>
					<button
						type="button"
						onClick={() => setConfirmDelete(false)}
						className="h-10 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					>
						{t('orders.cancel')}
					</button>
				</div>
			) : (
				<div className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px] items-center gap-2 sm:w-[360px]">
					<button
						type="button"
						onClick={openEditor}
						className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
					>
						<span className="truncate">{t('orders.reviewSubmit')}</span>
					</button>
					<button
						type="button"
						onClick={openEditor}
						aria-label={t('orders.edit')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)]"
					>
						<Pencil size={15} strokeWidth={1.8} />
					</button>
					<button
						type="button"
						onClick={() => duplicateMutation.mutate()}
						disabled={duplicateMutation.isPending}
						aria-label={t('orders.duplicate')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					>
						<Copy size={15} strokeWidth={1.8} />
					</button>
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						aria-label={t('orders.delete')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-error)] hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
					>
						<Trash2 size={15} strokeWidth={1.8} />
					</button>
				</div>
			)}
		</article>
	)
}

function OrderTile({ order, isAr }: { order: Order; isAr: boolean }) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [savedDraftReference, setSavedDraftReference] = useState<string | null>(
		null,
	)

	const isSubmitted = order.type === 'submitted'
	const title = order.name ?? order.reference ?? order.id
	const statusKey = order.status ? ORDER_STATUS_LABEL_KEYS[order.status] : null
	const statusLabel =
		order.type === 'saved' && order.draftSource === 'lyon'
			? t('orders.lyon')
			: statusKey
				? t(statusKey)
				: t(SECTION_META[order.type].labelKey)
	const dateLabel = formatDate(order.date, isAr)
	const amountLabel = formatAmount(order, isAr)
	const previewItems = order.items.slice(0, ORDER_PREVIEW_SLOT_COUNT)
	const previewSlots = ORDER_PREVIEW_SLOT_KEYS.map((slotKey, index) => ({
		slotKey,
		item: previewItems[index],
	}))

	function openOrder() {
		navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
	}

	const saveDraftMutation = useMutation({
		mutationFn: () => saveOrderAsDraft({ data: { orderId: order.id } }),
		onMutate: () => {
			setSavedDraftReference(null)
		},
		onSuccess: (result) => {
			setSavedDraftReference(result.reference)
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.savedAsDraft', { ref: result.reference }))
		},
		onError: () => {
			toast.error(t('orders.saveDraftFailed'))
		},
	})

	return (
		<article className="flex min-w-0 flex-col rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3.5 sm:p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-[12px] font-medium text-[var(--p-text-muted)]">
						{statusLabel}
					</p>
					<h3 className="mt-0.5 line-clamp-2 break-words text-[16px] font-semibold leading-snug text-[var(--p-text)] sm:mt-1 sm:text-[17px]">
						{title}
					</h3>
				</div>
				<span className="shrink-0 rounded-full border border-[var(--p-border)] bg-[var(--p-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--p-text-muted)]">
					{dateLabel}
				</span>
			</div>

			<div className="mt-3 grid gap-2">
				{previewSlots.map(({ slotKey, item }) => {
					if (!item) {
						return (
							<div
								key={`${order.id}-${slotKey}`}
								aria-hidden="true"
								className="flex h-9 min-w-0 items-center gap-2.5 sm:h-10"
							/>
						)
					}

					const itemName = isAr ? item.productNameAr : item.productName
					return (
						<div
							key={`${order.id}-${item.productId}`}
							className="flex min-w-0 items-center gap-2.5"
						>
							<OrderItemImage
								imageUrl={item.imageUrl}
								alt={itemName}
								className="h-9 w-9 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)] sm:h-10 sm:w-10"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[13px] font-medium text-[var(--p-text)]">
									{itemName}
								</p>
								<p
									className="text-[12px] font-medium text-[var(--p-text-muted)]"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									{formatQuantity(item.quantity, isAr)}{' '}
									{isAr && item.unitOfMeasureAr
										? item.unitOfMeasureAr
										: item.unitOfMeasure}
								</p>
							</div>
						</div>
					)
				})}
			</div>

			{isSubmitted && (
				<p className="mt-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-[12px] leading-relaxed text-[var(--p-text-muted)]">
					{t('tracking.reviewingOrderMessage')}
				</p>
			)}

			<div className="mt-3 border-t border-[var(--p-border)] pt-3">
				<div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
					<div className="min-w-0">
						<p className="truncate text-[12px] text-[var(--p-text-muted)]">
							{t('orders.items', { count: order.itemCount })}
						</p>
						{amountLabel && (
							<p
								className="mt-0.5 truncate text-[12px] font-semibold text-[var(--p-text)] sm:text-[13px]"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							>
								{amountLabel}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={() => saveDraftMutation.mutate()}
						disabled={saveDraftMutation.isPending}
						className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl border border-[var(--p-border)] px-3 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-60"
					>
						<span className="truncate">
							{saveDraftMutation.isPending
								? t('quoteBuilder.savingDraft')
								: t('orders.saveAsDraft')}
						</span>
					</button>
					<button
						type="button"
						onClick={openOrder}
						className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
					>
						<span className="truncate">{t('orders.view')}</span>
					</button>
					{savedDraftReference && (
						<p className="text-[12px] font-medium text-[var(--p-text-muted)] sm:col-span-3">
							{t('orders.savedAsDraft', { ref: savedDraftReference })}
						</p>
					)}
				</div>
			</div>
		</article>
	)
}

function OrdersEmpty() {
	const { t } = useTranslation('portal')
	return (
		<div className="flex flex-col items-center gap-4 px-4 py-20 text-center sm:py-24">
			<p className="text-[18px] font-semibold text-[var(--p-text)]">
				{t('orders.noOrders')}
			</p>
			<p className="max-w-sm text-[13px] leading-relaxed text-[var(--p-text-muted)]">
				{t('orders.noOrdersBody')}
			</p>
			<Link
				to="/market"
				className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-5 text-[14px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
			>
				<Plus size={16} strokeWidth={1.8} />
				{t('orders.newQuote')}
			</Link>
		</div>
	)
}

const SKELETON_SECTIONS = ['saved', 'submitted'] as const
const SKELETON_CARDS = ['a', 'b', 'c'] as const

function OrdersSkeleton() {
	return (
		<div className="space-y-10 sm:space-y-12">
			{SKELETON_SECTIONS.map((section) => (
				<section key={section}>
					<div className="mb-4 flex items-center justify-between border-b border-[var(--p-border)] pb-3">
						<div className="h-5 w-28 animate-pulse rounded bg-[var(--p-border)]" />
						<div className="h-4 w-6 animate-pulse rounded bg-[var(--p-border)]" />
					</div>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{SKELETON_CARDS.map((card) => (
							<div
								key={`${section}-${card}`}
								className="rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4"
							>
								<div className="flex justify-between gap-4">
									<div className="h-5 w-2/3 animate-pulse rounded bg-[var(--p-border)]" />
									<div className="h-5 w-14 animate-pulse rounded-full bg-[var(--p-border)]" />
								</div>
								<div className="mt-5 space-y-3">
									<div className="h-10 w-full animate-pulse rounded-lg bg-[var(--p-border)]" />
									<div className="h-10 w-full animate-pulse rounded-lg bg-[var(--p-border)]" />
									<div className="h-10 w-5/6 animate-pulse rounded-lg bg-[var(--p-border)]" />
								</div>
								<div className="mt-5 h-11 animate-pulse rounded-xl bg-[var(--p-border)]" />
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	)
}

function formatQuantity(value: number, isAr: boolean): string {
	return value.toLocaleString(isAr ? 'ar-EG' : 'en-EG', {
		maximumFractionDigits: 0,
	})
}

function formatDate(iso: string, isAr: boolean): string {
	return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-EG', {
		day: '2-digit',
		month: 'short',
	}).format(new Date(iso))
}

function formatTime(iso: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(iso))
}

function formatAmount(order: Order, isAr: boolean): string | null {
	if (order.amount == null) return null
	const amount = order.amount.toLocaleString(isAr ? 'ar-EG' : 'en-EG', {
		maximumFractionDigits: 0,
	})
	return `${order.currency} ${amount}`
}

function OrderItemImage({
	imageUrl,
	alt,
	className,
}: {
	imageUrl: string
	alt: string
	className: string
}) {
	if (!imageUrl) {
		return <div aria-hidden="true" className={className} />
	}

	return (
		<img
			src={imageUrl}
			alt={alt}
			loading="lazy"
			decoding="async"
			className={className}
		/>
	)
}
