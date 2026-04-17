import { useState } from 'react'
import { Checkbox } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'
import { useShiftStore } from '@/stores/shift'

export function GPSConsent() {
	const { t } = useTranslation('driver')
	const gpsConsented = useShiftStore((s) => s.gpsConsented)
	const setGpsConsented = useShiftStore((s) => s.setGpsConsented)
	const setShiftStep = useShiftStore((s) => s.setShiftStep)
	const [isRequesting, setIsRequesting] = useState(false)

	const handleConsent = async (isSelected: boolean) => {
		setGpsConsented(isSelected)

		if (isSelected) {
			// Request GPS permission if not already granted
			setIsRequesting(true)
			try {
				const { Geolocation } = await import('@capacitor/geolocation')
				const perms = await Geolocation.checkPermissions()
				if (perms.location !== 'granted') {
					await Geolocation.requestPermissions()
				}
			} catch {
				// Permission request failed — continue anyway, consent is recorded
			} finally {
				setIsRequesting(false)
			}
		}
	}

	const handleContinue = () => {
		setShiftStep('sign-off')
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-xl font-semibold">{t('shift.gpsConsent')}</h2>

			<DriverCard>
				<div className="flex flex-col gap-4">
					<p className="text-sm leading-relaxed">
						{t(
							'shift.gpsConsentExplanation',
							'Your location is tracked during your shift for delivery coordination and safety. This data is processed in accordance with Egyptian Data Protection Law 151/2020.',
						)}
					</p>

					<div className="rounded-lg bg-[var(--bg-secondary)] p-3">
						<p className="text-xs text-[var(--text-secondary)]">
							{t(
								'shift.gpsConsentLegal',
								'Per Data Protection Law 151/2020: Location data is collected only during active shifts, used for delivery coordination, route optimization, and safety monitoring. Data is retained per company policy and applicable law.',
							)}
						</p>
					</div>

					<Checkbox
						isSelected={gpsConsented}
						onChange={handleConsent}
						className="group flex min-h-[var(--touch-min)] items-center gap-3 outline-none"
					>
						<div
							className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors
                ${
									gpsConsented
										? 'border-[var(--color-blue)] bg-[var(--color-blue)]'
										: 'border-[var(--border-color)] bg-[var(--bg-primary)]'
								}
                group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-blue)] group-focus-visible:ring-offset-2`}
						>
							{gpsConsented && (
								<span className="text-sm text-white">&#10003;</span>
							)}
						</div>
						<span className="text-sm font-medium">
							{t(
								'shift.gpsConsentCheckbox',
								'I consent to GPS tracking during my shift',
							)}
						</span>
					</Checkbox>
				</div>
			</DriverCard>

			{isRequesting && (
				<p className="text-center text-sm text-[var(--text-secondary)]">
					{t('shift.requestingPermission', 'Requesting location permission...')}
				</p>
			)}

			<DriverButton onPress={handleContinue} isDisabled={!gpsConsented}>
				{t('common.next')}
			</DriverButton>
		</div>
	)
}
