import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { capturePhoto } from '@/lib/camera'
import { useEODStore } from '@/stores/end-of-day'

type FuelLevel = '1/4' | '1/2' | '3/4' | 'full'

const FUEL_LEVELS: { value: FuelLevel; label: string; fillPercent: number }[] =
	[
		{ value: '1/4', label: '1/4', fillPercent: 25 },
		{ value: '1/2', label: '1/2', fillPercent: 50 },
		{ value: '3/4', label: '3/4', fillPercent: 75 },
		{ value: 'full', label: 'Full', fillPercent: 100 },
	]

export function FuelReport() {
	const { t } = useTranslation('driver')
	const fuelLevel = useEODStore((s) => s.fuelLevel)
	const isFuelLow = useEODStore((s) => s.isFuelLow)
	const fuelReceiptPhotoUri = useEODStore((s) => s.fuelReceiptPhotoUri)
	const setFuelLevel = useEODStore((s) => s.setFuelLevel)
	const setFuelReceiptPhoto = useEODStore((s) => s.setFuelReceiptPhoto)
	const nextStep = useEODStore((s) => s.nextStep)
	const [isCapturing, setIsCapturing] = useState(false)

	const handleCaptureReceipt = async () => {
		setIsCapturing(true)
		try {
			const uri = await capturePhoto()
			if (uri) {
				setFuelReceiptPhoto(uri)
			}
		} catch {
			// Photo capture failed
		} finally {
			setIsCapturing(false)
		}
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-xl font-semibold">
				{t('eod.fuelReport', 'Fuel Level')}
			</h2>

			<p className="text-sm text-[var(--text-secondary)]">
				{t(
					'eod.fuelDescription',
					'Select the current fuel level of the vehicle.',
				)}
			</p>

			{/* Fuel gauge selector — 4 large buttons */}
			<div className="flex gap-3">
				{FUEL_LEVELS.map((level) => {
					const isSelected = fuelLevel === level.value
					return (
						<button
							key={level.value}
							type="button"
							onClick={() => setFuelLevel(level.value)}
							className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]
                ${
									isSelected
										? 'border-[var(--color-blue)] bg-[var(--color-blue)] text-white'
										: 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
								}`}
							style={{ minHeight: '56px' }}
						>
							{/* Fuel gauge visual */}
							<div className="flex h-6 w-6 items-end overflow-hidden rounded-sm border border-current">
								<div
									className={`w-full transition-all ${isSelected ? 'bg-white' : 'bg-[var(--color-blue)]'}`}
									style={{ height: `${level.fillPercent}%` }}
								/>
							</div>
							<span className="font-[var(--font-mono)] text-sm font-medium">
								{level.label}
							</span>
						</button>
					)
				})}
			</div>

			{/* Low fuel warning */}
			{isFuelLow && (
				<div className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-4">
					<p className="text-sm font-medium text-[var(--color-warning)]">
						{t(
							'eod.fuelWarning',
							'Fill up before ending shift. Minimum 1/2 tank required at end of shift.',
						)}
					</p>
				</div>
			)}

			{/* Fuel receipt photo */}
			<DriverButton
				variant="secondary"
				onPress={handleCaptureReceipt}
				isLoading={isCapturing}
			>
				{fuelReceiptPhotoUri
					? t('eod.retakeFuelReceipt', 'Retake Fuel Receipt Photo')
					: t('eod.addFuelReceipt', 'Add Fuel Receipt Photo')}
			</DriverButton>

			{fuelReceiptPhotoUri && (
				<img
					src={fuelReceiptPhotoUri}
					alt={t('eod.fuelReceiptAlt', 'Fuel receipt photo')}
					className="h-32 w-full rounded-xl object-cover"
				/>
			)}

			{/* Continue — enabled once a level is selected */}
			<DriverButton onPress={nextStep} isDisabled={fuelLevel === null}>
				{t('common.next', 'Continue')}
			</DriverButton>
		</div>
	)
}
