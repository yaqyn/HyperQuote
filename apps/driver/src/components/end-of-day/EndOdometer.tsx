import { Group, Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { capturePhoto } from '@/lib/camera'
import { useEODStore } from '@/stores/end-of-day'
import { useShiftStore } from '@/stores/shift'

export function EndOdometer() {
	const { t } = useTranslation('driver')
	const endOdometer = useEODStore((s) => s.endOdometer)
	const odometerPhotoUri = useEODStore((s) => s.odometerPhotoUri)
	const setEndOdometer = useEODStore((s) => s.setEndOdometer)
	const setOdometerPhoto = useEODStore((s) => s.setOdometerPhoto)
	const nextStep = useEODStore((s) => s.nextStep)
	const startOdometer = useShiftStore((s) => s.odometerReading)

	const distance =
		endOdometer !== null && startOdometer !== null
			? endOdometer - startOdometer
			: null

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

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-xl font-semibold">
				{t('eod.endOdometer', 'End Odometer')}
			</h2>

			{/* Start odometer reference */}
			{startOdometer !== null && (
				<div className="text-sm text-[var(--text-secondary)]">
					{t('eod.startOdometer', 'Start:')}{' '}
					<span className="font-[var(--font-mono)] font-medium">
						{startOdometer.toLocaleString()}
					</span>{' '}
					{t('home.km', 'km')}
				</div>
			)}

			{/* Large numeric input */}
			<NumberField
				value={endOdometer ?? Number.NaN}
				onChange={(value) => setEndOdometer(Number.isNaN(value) ? null : value)}
				minValue={startOdometer !== null ? startOdometer + 1 : 0}
				formatOptions={{ useGrouping: false }}
			>
				<Label className="text-sm font-medium text-[var(--text-secondary)]">
					{t('eod.enterEndOdometer', 'End odometer reading')}
				</Label>
				<Group className="mt-2">
					<Input
						className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-4xl font-[var(--font-mono)] outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: '2.25rem',
							lineHeight: '3rem',
							height: '64px',
						}}
						placeholder="0"
					/>
				</Group>
			</NumberField>

			{/* Computed distance */}
			{distance !== null && distance > 0 && (
				<div className="rounded-xl bg-[var(--bg-secondary)] p-4 text-center">
					<div className="text-sm text-[var(--text-secondary)]">
						{t('eod.distanceDriven', 'Distance driven today')}
					</div>
					<div className="mt-1 font-[var(--font-mono)] text-2xl font-medium">
						{distance.toLocaleString()} {t('home.km', 'km')}
					</div>
				</div>
			)}

			{/* Odometer photo */}
			<DriverButton variant="secondary" onPress={handleCapturePhoto}>
				<span className="me-2">&#128247;</span>
				{odometerPhotoUri
					? t('eod.retakeOdometerPhoto', 'Retake Odometer Photo')
					: t('eod.takeOdometerPhoto', 'Take Odometer Photo')}
			</DriverButton>

			{odometerPhotoUri && (
				<img
					src={odometerPhotoUri}
					alt={t('shift.odometerPhotoAlt', 'Odometer photo')}
					className="h-32 w-full rounded-xl object-cover"
				/>
			)}

			{/* Continue */}
			<DriverButton onPress={nextStep} isDisabled={endOdometer === null}>
				{t('common.next', 'Continue')}
			</DriverButton>
		</div>
	)
}
