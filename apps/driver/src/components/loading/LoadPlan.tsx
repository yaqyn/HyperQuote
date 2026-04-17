import { useState } from 'react'
import { Checkbox, Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'
import { type LoadItem, useLoadingStore } from '@/stores/loading'
import { BarcodeScanner } from './BarcodeScanner'

interface LoadItemWithStop extends LoadItem {
	stopName?: string
	stopOrder?: number
	unit?: string
}

interface LoadPlanProps {
	items: LoadItemWithStop[]
}

interface ShortageReport {
	itemId: string
	shortageCount: number
	reason: string
}

export function LoadPlan({ items }: LoadPlanProps) {
	const { t } = useTranslation('driver')
	const manualCheck = useLoadingStore((s) => s.manualCheck)
	const [showShortageForm, setShowShortageForm] = useState(false)
	const [shortageReport, setShortageReport] = useState<ShortageReport>({
		itemId: '',
		shortageCount: 0,
		reason: '',
	})

	// Group items by stop, sorted by loading sequence (last delivery first)
	const groupedItems = groupByStop(items)

	function handleManualCheck(itemId: string) {
		manualCheck(itemId)
	}

	function handleShortageSubmit() {
		// Shortage report would be stored/synced via PowerSync
		setShowShortageForm(false)
		setShortageReport({ itemId: '', shortageCount: 0, reason: '' })
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">
					{t('loading.loadPlan', 'Load Plan')}
				</h2>
				<DriverButton
					variant="secondary"
					onPress={() => setShowShortageForm(true)}
					className="!w-auto !min-h-[44px] px-3 text-sm"
				>
					{t('loading.reportShortage', 'Report Shortage')}
				</DriverButton>
			</div>

			{/* Loading sequence note */}
			<p className="text-xs text-[var(--text-secondary)]">
				{t(
					'loading.loadingSequence',
					'Items ordered by loading sequence: last delivery loaded first',
				)}
			</p>

			{groupedItems.map((group) => (
				<DriverCard
					key={group.stopName}
					header={
						<span className="text-sm font-medium text-[var(--text-secondary)]">
							{group.stopName}
						</span>
					}
				>
					<div className="space-y-3">
						{group.items.map((item) => (
							<LoadItemRow
								key={item.id}
								item={item}
								onManualCheck={handleManualCheck}
							/>
						))}
					</div>
				</DriverCard>
			))}

			{/* Shortage report form */}
			{showShortageForm && (
				<DriverCard
					header={
						<span className="font-medium">
							{t('loading.reportShortage', 'Report Shortage')}
						</span>
					}
				>
					<div className="space-y-3">
						{/* Item select */}
						<label className="block text-sm font-medium">
							{t('loading.selectItem', 'Select Item')}
							<select
								value={shortageReport.itemId}
								onChange={(e) =>
									setShortageReport((r) => ({ ...r, itemId: e.target.value }))
								}
								className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-base"
							>
								<option value="">
									{t('loading.selectItem', 'Select Item')}
								</option>
								{items.map((item) => (
									<option key={item.id} value={item.id}>
										{item.productName}
									</option>
								))}
							</select>
						</label>

						{/* Shortage count */}
						<NumberField
							value={shortageReport.shortageCount}
							onChange={(val) =>
								setShortageReport((r) => ({ ...r, shortageCount: val }))
							}
							minValue={0}
						>
							<Label className="text-sm font-medium">
								{t('loading.shortageCount', 'Shortage Count')}
							</Label>
							<Input className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 font-mono text-base" />
						</NumberField>

						{/* Reason */}
						<label className="block text-sm font-medium">
							{t('loading.reason', 'Reason')}
							<textarea
								value={shortageReport.reason}
								onChange={(e) =>
									setShortageReport((r) => ({ ...r, reason: e.target.value }))
								}
								className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-base"
								rows={2}
							/>
						</label>

						<div className="flex gap-2">
							<DriverButton
								variant="secondary"
								onPress={() => setShowShortageForm(false)}
								className="flex-1"
							>
								{t('common.cancel', 'Cancel')}
							</DriverButton>
							<DriverButton
								variant="primary"
								onPress={handleShortageSubmit}
								isDisabled={
									!shortageReport.itemId || shortageReport.shortageCount <= 0
								}
								className="flex-1"
							>
								{t('common.confirm', 'Confirm')}
							</DriverButton>
						</div>
					</div>
				</DriverCard>
			)}
		</div>
	)
}

// --- LoadItemRow ---

interface LoadItemRowProps {
	item: LoadItemWithStop
	onManualCheck: (itemId: string) => void
}

function LoadItemRow({ item, onManualCheck }: LoadItemRowProps) {
	const { t } = useTranslation('driver')
	const scanResults = useLoadingStore((s) => s.scanResults)

	// Count scans for this item
	const itemScans = scanResults.filter((r) => r.itemId === item.id && r.matched)
	const scannedCount = itemScans.length
	const isShort = item.checked
		? false
		: scannedCount < item.quantityExpected && scannedCount > 0

	return (
		<div className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3">
			{/* Status icon */}
			<div className="flex-shrink-0">
				{item.checked ? (
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
						<svg
							aria-hidden="true"
							className="h-4 w-4 text-white"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
				) : (
					<div className="h-7 w-7 rounded-full border-2 border-[var(--border-color)]" />
				)}
			</div>

			{/* Item info */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{item.productName}</p>
				<div className="flex items-center gap-2 mt-0.5">
					<span className="font-mono text-sm text-[var(--text-secondary)]">
						{item.quantityExpected}
					</span>
					{item.unit && (
						<span className="text-xs text-[var(--text-secondary)]">
							{item.unit}
						</span>
					)}
					{isShort && (
						<span className="font-mono text-xs font-bold text-[var(--color-danger)]">
							SHORT {item.quantityExpected - scannedCount}
						</span>
					)}
				</div>
			</div>

			{/* Actions */}
			{!item.checked && (
				<div className="flex items-center gap-2 flex-shrink-0">
					{item.barcode ? (
						<BarcodeScanner itemId={item.id} expectedBarcode={item.barcode} />
					) : (
						<Checkbox
							isSelected={item.checked}
							onChange={() => onManualCheck(item.id)}
							className="flex h-[56px] min-w-[56px] items-center justify-center rounded-xl border-2 border-[var(--color-blue)] text-sm font-medium text-[var(--color-blue)] data-[selected]:bg-[var(--color-blue)] data-[selected]:text-white"
						>
							{t('loading.manualCheck', 'Check')}
						</Checkbox>
					)}
				</div>
			)}
		</div>
	)
}

// --- Helpers ---

interface StopGroup {
	stopName: string
	stopOrder: number
	items: LoadItemWithStop[]
}

function groupByStop(items: LoadItemWithStop[]): StopGroup[] {
	const groups = new Map<string, StopGroup>()

	for (const item of items) {
		const name = item.stopName ?? 'Unknown Stop'
		const order = item.stopOrder ?? 0
		let group = groups.get(name)
		if (!group) {
			group = { stopName: name, stopOrder: order, items: [] }
			groups.set(name, group)
		}
		group.items.push(item)
	}

	// Sort by reverse stop order (last delivery loaded first)
	return Array.from(groups.values()).sort((a, b) => b.stopOrder - a.stopOrder)
}
