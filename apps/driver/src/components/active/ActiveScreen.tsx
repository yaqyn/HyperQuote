/**
 * Active order screen — the driver's primary surface.
 *
 * Mobile: map dominates the top half (~52vh), then a vertically scrolling
 * stack of cards: hero / manifest / dispatch / emergency.
 * Tablet desktop landscape: map and cards split into two scroll lanes.
 */

import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	ArrowUpRight,
	Compass,
	MapPin,
	Navigation,
	Package,
	Phone,
	Truck,
	UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientOnly } from '../../lib/client-only'
import {
	formatDistanceKm,
	formatEtaMinutes,
	formatNumber,
	formatWeight,
} from '../../lib/format'
import {
	bearingDeg,
	compassPoint,
	distanceKm,
	interpolate,
} from '../../lib/geo'
import { getActiveOrder } from '../../lib/mock'
import type { ActiveOrder, ContactCard, LineItem } from '../../lib/types'
import { useApp } from '../../stores/cockpit'
import { ActiveMap } from './ActiveMap'

const AVG_KMH = 32

export function ActiveScreen() {
	const { t } = useTranslation()
	const { data: order, isLoading } = useQuery({
		queryKey: ['active-order'],
		queryFn: getActiveOrder,
	})

	if (isLoading || !order) {
		return (
			<div className="grid h-full place-items-center text-[var(--ink-3)]">
				<span className="text-sm">{t('active.loading')}</span>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Map */}
			<div className="map-frame relative h-[52dvh] min-h-[280px] shrink-0 lg:h-[55dvh]">
				<ClientOnly
					fallback={<div className="h-full w-full bg-[var(--surface-2)]" />}
				>
					<ActiveMap
						origin={order.originCoords}
						destination={order.deliveryCoords}
					/>
				</ClientOnly>
			</div>

			{/* Card stack */}
			<div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
				<div className="mx-auto flex max-w-[640px] flex-col gap-3">
					<HeroCard order={order} />
					<ManifestCard items={order.items} />
					<DispatchCard
						customer={order.contact}
						dispatch={order.dispatchContact}
					/>
					<EmergencyCard />
				</div>
			</div>
		</div>
	)
}

function HeroCard({ order }: { order: ActiveOrder }) {
	const { t } = useTranslation()
	const lang = useApp((s) => s.lang)

	const [progress, setProgress] = useState(0.18)
	useEffect(() => {
		const id = setInterval(() => {
			setProgress((p) => Math.min(0.95, p + 0.02))
		}, 6_000)
		return () => clearInterval(id)
	}, [])

	const truckPos = useMemo(
		() => interpolate(order.originCoords, order.deliveryCoords, progress),
		[order.originCoords, order.deliveryCoords, progress],
	)
	const remainingKm = useMemo(
		() => distanceKm(truckPos, order.deliveryCoords),
		[truckPos, order.deliveryCoords],
	)
	const bearing = bearingDeg(truckPos, order.deliveryCoords)
	const etaMin = (remainingKm / AVG_KMH) * 60
	const cardinal = compassPoint(bearing)

	return (
		<section className="card rise rise-1 overflow-hidden">
			<div className="flex items-start gap-3 p-5">
				<div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
					<Truck size={20} strokeWidth={1.6} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
						<span className="t-num">{order.displayId}</span>
						<span aria-hidden>·</span>
						<span>{t(`active.stage.${order.stage}`)}</span>
					</div>
					<h1 className="t-display mt-1 truncate">
						{lang === 'ar' ? order.customerNameAr : order.customerName}
					</h1>
					<p className="mt-1 flex items-start gap-1.5 text-[14px] text-[var(--ink-2)]">
						<MapPin
							size={14}
							strokeWidth={1.6}
							className="mt-1 shrink-0 text-[var(--ink-3)]"
						/>
						<span>
							{lang === 'ar' ? order.deliveryAddressAr : order.deliveryAddress}
						</span>
					</p>
				</div>
			</div>

			<div className="grid grid-cols-3 border-t border-[var(--line)]">
				<Stat
					icon={<Navigation size={14} strokeWidth={1.6} />}
					label={t('active.distance')}
					value={formatDistanceKm(remainingKm, lang)}
				/>
				<Stat
					icon={<Compass size={14} strokeWidth={1.6} />}
					label={t('active.eta')}
					value={formatEtaMinutes(etaMin, lang)}
					accent
				/>
				<Stat
					icon={<ArrowUpRight size={14} strokeWidth={1.6} />}
					label={t('active.heading')}
					value={cardinal}
				/>
			</div>

			{order.notes ? (
				<div className="border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-3">
					<p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
						<span className="font-medium text-[var(--ink)]">
							{t('active.note')}:{' '}
						</span>
						{lang === 'ar' && order.notesAr ? order.notesAr : order.notes}
					</p>
				</div>
			) : null}
		</section>
	)
}

interface StatProps {
	icon: React.ReactNode
	label: string
	value: string
	accent?: boolean
}

function Stat({ icon, label, value, accent }: StatProps) {
	return (
		<div className="flex flex-col gap-1.5 px-4 py-3 [&+&]:border-s [&+&]:border-[var(--line)]">
			<span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-3)]">
				{icon}
				{label}
			</span>
			<span
				className="t-num text-[18px] font-semibold tracking-tight"
				style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}
			>
				{value}
			</span>
		</div>
	)
}

function ManifestCard({ items }: { items: LineItem[] }) {
	const { t } = useTranslation()
	const lang = useApp((s) => s.lang)
	const totalWeight = items.reduce((s, i) => s + i.weightKg, 0)

	return (
		<section className="card rise rise-2 overflow-hidden">
			<header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
				<div className="flex items-center gap-2">
					<Package
						size={16}
						strokeWidth={1.6}
						className="text-[var(--ink-3)]"
					/>
					<h2 className="t-title">{t('active.manifest')}</h2>
				</div>
				<span className="t-num text-[13px] text-[var(--ink-3)]">
					{formatWeight(totalWeight, lang)}
				</span>
			</header>
			<ul className="border-t border-[var(--line)]">
				{items.map((item, idx) => (
					<li
						key={item.productSlug}
						className="grid grid-cols-[24px_1fr_auto] items-start gap-3 px-5 py-3.5 [&+&]:border-t [&+&]:border-[var(--line)]"
					>
						<span className="t-num pt-0.5 text-[12px] text-[var(--ink-4)]">
							{String(idx + 1).padStart(2, '0')}
						</span>
						<div className="min-w-0">
							<div className="text-[14.5px] font-medium leading-tight text-[var(--ink)]">
								{lang === 'ar' ? item.productNameAr : item.productName}
							</div>
							{item.weightKg > 0 ? (
								<div className="t-num mt-0.5 text-[12px] text-[var(--ink-3)]">
									{formatWeight(item.weightKg, lang)}
								</div>
							) : null}
						</div>
						<div className="text-end">
							<span className="t-num text-[15px] font-semibold text-[var(--ink)]">
								{formatNumber(item.quantity, lang)}
							</span>
							<span className="ms-1 text-[11px] text-[var(--ink-3)]">
								{item.unit}
							</span>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}

function DispatchCard({
	customer,
	dispatch,
}: {
	customer: ContactCard
	dispatch: ContactCard
}) {
	const { t } = useTranslation()
	const lang = useApp((s) => s.lang)

	const dial = (phone: string) => {
		window.location.href = `tel:${phone.replace(/\s/g, '')}`
	}

	return (
		<section className="card rise rise-3 overflow-hidden">
			<header className="flex items-center gap-2 px-5 pb-3 pt-4">
				<UserRound
					size={16}
					strokeWidth={1.6}
					className="text-[var(--ink-3)]"
				/>
				<h2 className="t-title">{t('active.contacts')}</h2>
			</header>
			<div className="border-t border-[var(--line)]">
				<ContactRow
					name={customer.name}
					role={customer.role}
					phone={customer.phone}
					ctaLabel={t('active.callSite')}
					onCall={() => dial(customer.phone)}
					tone="neutral"
					lang={lang}
				/>
				<ContactRow
					name={dispatch.name}
					role={dispatch.role}
					phone={dispatch.phone}
					ctaLabel={t('active.callDispatch')}
					onCall={() => dial(dispatch.phone)}
					tone="accent"
					lang={lang}
				/>
			</div>
		</section>
	)
}

interface ContactRowProps {
	name: string
	role: string
	phone: string
	ctaLabel: string
	tone: 'neutral' | 'accent'
	onCall: () => void
	lang: string
}

function ContactRow({
	name,
	role,
	phone,
	ctaLabel,
	tone,
	onCall,
}: ContactRowProps) {
	return (
		<div className="card-row">
			<div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--ink-2)]">
				<UserRound size={16} strokeWidth={1.6} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-[14.5px] font-medium leading-tight text-[var(--ink)]">
					{name}
				</div>
				<div className="t-num mt-0.5 text-[12.5px] text-[var(--ink-3)]">
					{role} · {phone}
				</div>
			</div>
			<button
				type="button"
				onClick={onCall}
				className={`btn ${tone === 'accent' ? 'btn--primary' : ''}`}
				aria-label={ctaLabel}
			>
				<Phone size={14} strokeWidth={1.8} />
				<span className="hidden sm:inline">{ctaLabel}</span>
			</button>
		</div>
	)
}

function EmergencyCard() {
	const { t } = useTranslation()
	const [armed, setArmed] = useState<null | 'police' | 'ambulance'>(null)

	useEffect(() => {
		if (!armed) return
		const id = setTimeout(() => setArmed(null), 4000)
		return () => clearTimeout(id)
	}, [armed])

	const dial = (n: string) => {
		window.location.href = `tel:${n}`
	}

	return (
		<section className="card rise rise-4 overflow-hidden">
			<header className="flex items-center gap-2 px-5 pb-3 pt-4">
				<AlertTriangle
					size={16}
					strokeWidth={1.6}
					className="text-[var(--ink-3)]"
				/>
				<h2 className="t-title">{t('active.emergency')}</h2>
				<span className="t-meta ms-auto">{t('active.tapTwice')}</span>
			</header>
			<div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] p-3">
				<button
					type="button"
					className={`btn ${armed === 'police' ? 'btn--primary' : 'btn--critical'}`}
					onClick={() => {
						if (armed === 'police') {
							dial('122')
							setArmed(null)
						} else setArmed('police')
					}}
				>
					{armed === 'police' ? t('active.tapAgain') : t('active.police')}
				</button>
				<button
					type="button"
					className={`btn ${armed === 'ambulance' ? 'btn--primary' : 'btn--critical'}`}
					onClick={() => {
						if (armed === 'ambulance') {
							dial('123')
							setArmed(null)
						} else setArmed('ambulance')
					}}
				>
					{armed === 'ambulance' ? t('active.tapAgain') : t('active.ambulance')}
				</button>
			</div>
		</section>
	)
}
