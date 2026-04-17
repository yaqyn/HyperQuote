import { useState } from 'react'
import {
	Checkbox,
	CheckboxGroup,
	Group,
	Input,
	Label,
	NumberField,
	Radio,
	RadioGroup,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { capturePhoto } from '../../lib/camera'
import { useDeliveryStore } from '../../stores/delivery'
import { useExceptionStore } from '../../stores/exception'
import { DriverButton } from '../shared/DriverButton'
import { DriverCard } from '../shared/DriverCard'
import { PhotoGrid } from './PhotoGrid'

const DISCOVERY_TIMES = ['at_loading', 'in_transit', 'at_delivery'] as const
const DAMAGE_TYPES = [
	'bent_deformed',
	'broken',
	'wet',
	'crushed',
	'rusted',
	'other',
] as const
const SEVERITIES = ['minor', 'moderate', 'severe'] as const
const NOTICERS = ['driver', 'customer', 'warehouse'] as const
const CUSTOMER_DECISIONS = [
	'accepts_undamaged',
	'refuses_entire',
	'accepts_with_notation',
] as const

interface DamagedItemDetail {
	itemId: string
	damageType: string
	severity: string
	quantityAffected: number
}

export function DamagedGoods() {
	const { t, i18n } = useTranslation('driver')
	const photos = useExceptionStore((s) => s.photos)
	const details = useExceptionStore((s) => s.details)
	const addPhoto = useExceptionStore((s) => s.addPhoto)
	const removePhoto = useExceptionStore((s) => s.removePhoto)
	const setDetails = useExceptionStore((s) => s.setDetails)
	const nextStep = useExceptionStore((s) => s.nextStep)
	const items = useDeliveryStore((s) => s.items)

	const discoveredAt = details.discoveredAt as string | undefined
	const selectedItemIds = (details.selectedItemIds as string[]) ?? []
	const damagedItems = (details.damagedItems as DamagedItemDetail[]) ?? []
	const noticedBy = details.noticedBy as string | undefined
	const customerDecision = details.customerDecision as string | undefined

	const [localDamagedItems, setLocalDamagedItems] =
		useState<DamagedItemDetail[]>(damagedItems)

	const handleAddPhoto = async () => {
		const uri = await capturePhoto()
		if (uri) addPhoto(uri)
	}

	const handleItemSelection = (ids: string[]) => {
		setDetails('selectedItemIds', ids)
		// Initialize damage details for newly selected items
		const updated = ids.map((id) => {
			const existing = localDamagedItems.find((d) => d.itemId === id)
			if (existing) return existing
			const item = items.find((i) => i.id === id)
			return {
				itemId: id,
				damageType: '',
				severity: '',
				quantityAffected: item?.quantity_expected ?? 1,
			}
		})
		setLocalDamagedItems(updated)
		setDetails('damagedItems', updated)
	}

	const updateItemDamage = (
		itemId: string,
		field: keyof DamagedItemDetail,
		value: string | number,
	) => {
		const updated = localDamagedItems.map((d) =>
			d.itemId === itemId ? { ...d, [field]: value } : d,
		)
		setLocalDamagedItems(updated)
		setDetails('damagedItems', updated)
	}

	const formatNumber = (num: number) =>
		new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en').format(num)

	const handleSubmit = () => {
		setDetails('resolution', 'damage_report')
		nextStep()
	}

	return (
		<div className="flex flex-col gap-4">
			{/* When discovered? */}
			<DriverCard>
				<RadioGroup
					value={discoveredAt ?? ''}
					onChange={(val) => setDetails('discoveredAt', val)}
				>
					<Label className="block text-sm font-medium mb-3">
						{t('exception.damagedGoods.whenDiscovered')}
					</Label>
					<div className="flex flex-col gap-1">
						{DISCOVERY_TIMES.map((time) => (
							<Radio
								key={time}
								value={time}
								className="flex items-center gap-3 min-h-[56px] cursor-pointer text-sm"
							>
								{t(`exception.damagedGoods.${time}`)}
							</Radio>
						))}
					</div>
				</RadioGroup>
			</DriverCard>

			{/* Affected items */}
			<DriverCard
				header={
					<span className="text-sm font-medium">
						{t('exception.damagedGoods.affectedItems')}
					</span>
				}
			>
				<CheckboxGroup value={selectedItemIds} onChange={handleItemSelection}>
					<div className="flex flex-col gap-1">
						{items.map((item) => (
							<Checkbox
								key={item.id}
								value={item.id}
								className="flex items-center gap-3 min-h-[56px] cursor-pointer"
							>
								<div className="flex flex-1 items-center justify-between">
									<span className="text-sm">{item.product_name}</span>
									<span
										className="text-sm text-[var(--text-secondary)]"
										style={{ fontFamily: 'var(--font-mono)' }}
									>
										{formatNumber(item.quantity_expected)} {item.unit}
									</span>
								</div>
							</Checkbox>
						))}
					</div>
				</CheckboxGroup>
			</DriverCard>

			{/* Per-item damage details */}
			{localDamagedItems.map((damaged) => {
				const item = items.find((i) => i.id === damaged.itemId)
				if (!item) return null
				return (
					<DriverCard
						key={damaged.itemId}
						header={
							<span className="text-sm font-medium">{item.product_name}</span>
						}
					>
						<div className="flex flex-col gap-3">
							{/* Damage type */}
							<RadioGroup
								value={damaged.damageType}
								onChange={(val) =>
									updateItemDamage(damaged.itemId, 'damageType', val)
								}
							>
								<Label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
									{t('exception.damagedGoods.damageType')}
								</Label>
								<div className="flex flex-wrap gap-2">
									{DAMAGE_TYPES.map((type) => (
										<Radio
											key={type}
											value={type}
											className="flex items-center gap-1.5 min-h-[44px] cursor-pointer text-xs"
										>
											{t(`exception.damagedGoods.damageTypes.${type}`)}
										</Radio>
									))}
								</div>
							</RadioGroup>

							{/* Severity */}
							<RadioGroup
								value={damaged.severity}
								onChange={(val) =>
									updateItemDamage(damaged.itemId, 'severity', val)
								}
							>
								<Label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
									{t('exception.damagedGoods.severity')}
								</Label>
								<div className="flex gap-3">
									{SEVERITIES.map((sev) => (
										<Radio
											key={sev}
											value={sev}
											className="flex items-center gap-1.5 min-h-[44px] cursor-pointer text-xs"
										>
											{t(`exception.damagedGoods.severities.${sev}`)}
										</Radio>
									))}
								</div>
							</RadioGroup>

							{/* Quantity affected */}
							<NumberField
								value={damaged.quantityAffected}
								onChange={(val) =>
									updateItemDamage(damaged.itemId, 'quantityAffected', val)
								}
								minValue={1}
								maxValue={item.quantity_expected}
							>
								<Label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
									{t('exception.damagedGoods.quantityAffected')}
								</Label>
								<Group className="flex items-center border border-[var(--border-color)] rounded-xl overflow-hidden">
									<Input
										className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-center"
										style={{ fontFamily: 'var(--font-mono)' }}
									/>
								</Group>
							</NumberField>
						</div>
					</DriverCard>
				)
			})}

			{/* Photos */}
			<DriverCard
				header={
					<span className="text-sm font-medium">
						{t('exception.damagedGoods.photos')}
					</span>
				}
			>
				<p className="text-xs text-[var(--text-tertiary)] mb-2">
					{t('exception.damagedGoods.photosHint')}
				</p>
				<PhotoGrid
					photos={photos}
					onAdd={handleAddPhoto}
					onRemove={removePhoto}
					minRequired={2}
					maxPhotos={6}
				/>
			</DriverCard>

			{/* Who noticed? */}
			<DriverCard>
				<RadioGroup
					value={noticedBy ?? ''}
					onChange={(val) => setDetails('noticedBy', val)}
				>
					<Label className="block text-sm font-medium mb-3">
						{t('exception.damagedGoods.whoNoticed')}
					</Label>
					<div className="flex gap-3">
						{NOTICERS.map((who) => (
							<Radio
								key={who}
								value={who}
								className="flex items-center gap-2 min-h-[56px] cursor-pointer text-sm"
							>
								{t(`exception.damagedGoods.noticers.${who}`)}
							</Radio>
						))}
					</div>
				</RadioGroup>
			</DriverCard>

			{/* Customer decision */}
			<DriverCard>
				<RadioGroup
					value={customerDecision ?? ''}
					onChange={(val) => setDetails('customerDecision', val)}
				>
					<Label className="block text-sm font-medium mb-3">
						{t('exception.damagedGoods.customerDecision')}
					</Label>
					<div className="flex flex-col gap-1">
						{CUSTOMER_DECISIONS.map((decision) => (
							<Radio
								key={decision}
								value={decision}
								className="flex items-center gap-3 min-h-[56px] cursor-pointer text-sm"
							>
								{t(`exception.damagedGoods.decisions.${decision}`)}
							</Radio>
						))}
					</div>
				</RadioGroup>
			</DriverCard>

			{/* Submit */}
			<DriverButton variant="danger" onPress={handleSubmit}>
				{t('exception.damagedGoods.submitDamageReport')}
			</DriverButton>
		</div>
	)
}
