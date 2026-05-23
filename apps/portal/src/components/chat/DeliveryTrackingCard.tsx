import { MapPin, Phone, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DeliveryTrackingData } from '../../lib/chat-types'
import { formatDeliveryTimestamp } from '../../lib/delivery-location-copy'
import { toArabicIndic } from '../../lib/localized-digits'

interface DeliveryTrackingCardProps {
	data: DeliveryTrackingData
}

export function DeliveryTrackingCard({ data }: DeliveryTrackingCardProps) {
	const { i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const eta = formatDeliveryTimestamp(data.estimatedArrival)
	const updated = formatDeliveryTimestamp(data.lastUpdated)

	return (
		<section className="mt-3 w-full max-w-[520px] border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="voice-mono text-[10px] uppercase tracking-[0.24em] text-[var(--p-text-faint)]">
						{isArabic ? 'تتبع التوصيل' : 'Delivery tracking'}
					</p>
					<p className="mt-1 break-words text-[14px] font-semibold text-[var(--p-text)]">
						{data.orderNumber} · {data.stage.replace(/_/g, ' ')}
					</p>
				</div>
				<Truck
					size={18}
					strokeWidth={1.8}
					className="mt-0.5 shrink-0 text-[var(--p-text-muted)]"
					aria-hidden
				/>
			</div>
			<div className="mt-3 grid gap-2 text-[12px] text-[var(--p-text)] sm:grid-cols-2">
				<div className="flex min-w-0 items-start gap-2">
					<Phone size={14} className="mt-0.5 shrink-0" aria-hidden />
					<span className="min-w-0 break-words">
						{data.driverName} · {data.driverPhone}
					</span>
				</div>
				<div className="flex min-w-0 items-start gap-2">
					<Truck size={14} className="mt-0.5 shrink-0" aria-hidden />
					<span className="min-w-0 break-words">
						{data.truckNumber} · {data.vehiclePlate}
					</span>
				</div>
				<div className="flex min-w-0 items-start gap-2 sm:col-span-2">
					<MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
					<span className="min-w-0 break-words">{data.driverPlace}</span>
				</div>
			</div>
			<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--p-rule)] pt-2 voice-mono text-[11px] text-[var(--p-text-muted)]">
				<span>
					{isArabic ? 'الوصول' : 'ETA'}: {isArabic ? toArabicIndic(eta) : eta}
				</span>
				<span>
					{isArabic ? 'آخر تحديث' : 'Updated'}:{' '}
					{isArabic ? toArabicIndic(updated) : updated}
				</span>
			</div>
		</section>
	)
}
