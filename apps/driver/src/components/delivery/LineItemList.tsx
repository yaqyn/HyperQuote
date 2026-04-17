import type { TFunction } from 'i18next'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type DeliveryItem,
	type DeliveryItemStatus,
	useDeliveryStore,
} from '../../stores/delivery'
import { DriverCard } from '../shared/DriverCard'
import { DamageReport } from './DamageReport'
import { QuantityAdjust } from './QuantityAdjust'

const STATUS_ICONS: Record<
	DeliveryItemStatus,
	{ icon: string; color: string }
> = {
	pending: { icon: '\u25CB', color: 'text-gray-400' },
	delivered: { icon: '\u2713', color: 'text-green-600' },
	partial: { icon: '\u25D1', color: 'text-yellow-500' },
	damaged: { icon: '\u2717', color: 'text-red-500' },
	refused: { icon: '\u2717', color: 'text-gray-500' },
}

export function LineItemList() {
	const { t } = useTranslation('driver')
	const items = useDeliveryStore((s) => s.items)
	const confirmItem = useDeliveryStore((s) => s.confirmItem)
	const startUnloadingTimer = useDeliveryStore((s) => s.startUnloadingTimer)
	const unloadingStartedAt = useDeliveryStore((s) => s.unloadingStartedAt)

	const [adjustItemId, setAdjustItemId] = useState<string | null>(null)
	const [damageItemId, setDamageItemId] = useState<string | null>(null)

	const adjustItem = items.find((i) => i.id === adjustItemId)

	const handleConfirm = useCallback(
		async (itemId: string) => {
			// Start timer on first confirmation
			if (!unloadingStartedAt) {
				startUnloadingTimer()
			}
			await confirmItem(itemId)
		},
		[confirmItem, startUnloadingTimer, unloadingStartedAt],
	)

	const confirmedCount = items.filter((i) => i.status !== 'pending').length
	const partialCount = items.filter((i) => i.status === 'partial').length
	const damagedCount = items.filter((i) => i.status === 'damaged').length

	return (
		<div className="flex flex-col gap-3">
			{items.map((item) => (
				<LineItemRow
					key={item.id}
					item={item}
					onConfirm={handleConfirm}
					onAdjust={setAdjustItemId}
					onDamage={setDamageItemId}
					t={t}
				/>
			))}

			{/* Bottom summary */}
			<div className="rounded-xl bg-[var(--bg-secondary)] p-3 flex items-center justify-between">
				<span className="text-sm text-[var(--text-secondary)]">
					{t('delivery.itemsProgress')}
				</span>
				<div className="flex items-center gap-3">
					<span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
						{confirmedCount}/{items.length}
					</span>
					{partialCount > 0 && (
						<span className="font-mono text-xs text-yellow-600">
							{partialCount} {t('delivery.partial')}
						</span>
					)}
					{damagedCount > 0 && (
						<span className="font-mono text-xs text-red-500">
							{damagedCount} {t('delivery.damaged')}
						</span>
					)}
				</div>
			</div>

			{/* Modals */}
			{adjustItemId && adjustItem && (
				<QuantityAdjust
					itemId={adjustItemId}
					maxQuantity={adjustItem.quantity_expected}
					isOpen={!!adjustItemId}
					onClose={() => setAdjustItemId(null)}
				/>
			)}

			{damageItemId && (
				<DamageReport
					itemId={damageItemId}
					isOpen={!!damageItemId}
					onClose={() => setDamageItemId(null)}
				/>
			)}
		</div>
	)
}

interface LineItemRowProps {
	item: DeliveryItem
	onConfirm: (itemId: string) => void
	onAdjust: (itemId: string) => void
	onDamage: (itemId: string) => void
	t: TFunction<'driver'>
}

function LineItemRow({
	item,
	onConfirm,
	onAdjust,
	onDamage,
	t,
}: LineItemRowProps) {
	const status = STATUS_ICONS[item.status]
	const isPending = item.status === 'pending'

	return (
		<DriverCard>
			<div className="flex items-center gap-3 min-h-[56px]">
				{/* Status icon */}
				<AnimatePresence mode="wait">
					<motion.span
						key={item.status}
						initial={{ scale: 0.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.5, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 200, damping: 20 }}
						className={`text-2xl ${status.color}`}
					>
						{status.icon}
					</motion.span>
				</AnimatePresence>

				{/* Product info */}
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-[var(--text-primary)] truncate">
						{item.product_name}
					</p>
					<p className="text-sm text-[var(--text-secondary)]">
						<span className="font-mono">{item.quantity_expected}</span>{' '}
						{item.unit}
						{item.status === 'partial' && (
							<span className="text-yellow-600 ms-2">
								({t('delivery.partial')}:{' '}
								<span className="font-mono">{item.quantity_delivered}</span>)
							</span>
						)}
					</p>
				</div>

				{/* Tap to confirm full quantity */}
				{isPending && (
					<button
						type="button"
						onClick={() => onConfirm(item.id)}
						className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 active:bg-green-100"
					>
						{t('delivery.fullQuantity')}
					</button>
				)}
			</div>

			{/* Action buttons for pending items */}
			{isPending && (
				<div className="flex gap-2 mt-2 pt-2 border-t border-[var(--border-color)]">
					<button
						type="button"
						onClick={() => onAdjust(item.id)}
						className="flex-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-secondary)] active:bg-[var(--bg-secondary)]"
					>
						{t('delivery.adjustQuantity')}
					</button>
					<button
						type="button"
						onClick={() => onDamage(item.id)}
						className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 active:bg-red-50"
					>
						{t('delivery.flagDamage')}
					</button>
				</div>
			)}
		</DriverCard>
	)
}
