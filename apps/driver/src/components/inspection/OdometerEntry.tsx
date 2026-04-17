import { Group, Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { capturePhoto } from '@/lib/camera'
import { useShiftStore } from '@/stores/shift'

export function OdometerEntry() {
	const { t } = useTranslation('driver')
	const odometerReading = useShiftStore((s) => s.odometerReading)
	const odometerPhotoUri = useShiftStore((s) => s.odometerPhotoUri)
	const setOdometerReading = useShiftStore((s) => s.setOdometerReading)
	const setOdometerPhoto = useShiftStore((s) => s.setOdometerPhoto)
	const setShiftStep = useShiftStore((s) => s.setShiftStep)

	const handleCapturePhoto = async () => {
		try {
			const uri = await capturePhoto()
			if (uri) {
				setOdometerPhoto(uri)
			}
		} catch {
			// Photo capture failed
		}
	}

	const handleContinue = () => {
		setShiftStep('gps-consent')
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-xl font-semibold">{t('shift.odometer')}</h2>

			<NumberField
				value={odometerReading ?? undefined}
				onChange={(value) =>
					setOdometerReading(Number.isNaN(value) ? null : value)
				}
				minValue={0}
				formatOptions={{ useGrouping: false }}
			>
				<Label className="text-sm font-medium text-[var(--text-secondary)]">
					{t('shift.enterOdometer')}
				</Label>
				<Group className="mt-2">
					<Input
						className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-2xl outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: '24px',
							height: '48px',
							lineHeight: '48px',
						}}
						placeholder="0"
					/>
				</Group>
			</NumberField>

			{/* Camera button for odometer photo */}
			<button
				type="button"
				onClick={handleCapturePhoto}
				className="flex min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
			>
				<span>&#128247;</span>
				{odometerPhotoUri
					? t('shift.inspection.retakePhoto', 'Retake Odometer Photo')
					: t('shift.odometerPhoto', 'Take Odometer Photo')}
			</button>

			{odometerPhotoUri && (
				<img
					src={odometerPhotoUri}
					alt={t('shift.odometerPhotoAlt', 'Odometer photo')}
					className="h-32 w-full rounded-xl object-cover"
				/>
			)}

			<DriverButton
				onPress={handleContinue}
				isDisabled={odometerReading === null || odometerReading === undefined}
			>
				{t('common.next')}
			</DriverButton>
		</div>
	)
}
