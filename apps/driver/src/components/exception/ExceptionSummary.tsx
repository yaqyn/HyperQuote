import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EXCEPTION_TYPES, useExceptionStore } from '../../stores/exception'
import { DriverButton } from '../shared/DriverButton'
import { DriverCard } from '../shared/DriverCard'
import { PhotoGrid } from './PhotoGrid'

export function ExceptionSummary() {
	const { t, i18n } = useTranslation('driver')
	const navigate = useNavigate()

	const type = useExceptionStore((s) => s.type)
	const photos = useExceptionStore((s) => s.photos)
	const gpsLat = useExceptionStore((s) => s.gpsLat)
	const gpsLng = useExceptionStore((s) => s.gpsLng)
	const details = useExceptionStore((s) => s.details)
	const submit = useExceptionStore((s) => s.submit)
	const prevStep = useExceptionStore((s) => s.prevStep)
	const reset = useExceptionStore((s) => s.reset)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	const typeConfig = EXCEPTION_TYPES.find((e) => e.type === type)
	const timestamp = new Date().toISOString()

	const formatCoord = (val: number | null) => {
		if (val == null) return '-'
		return i18n.language === 'ar'
			? new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 6 }).format(val)
			: val.toFixed(6)
	}

	const handleSubmit = async () => {
		setIsSubmitting(true)
		setError(null)
		try {
			await submit()
			setSuccess(true)
			// Brief success display then navigate home
			setTimeout(() => {
				reset()
				navigate({ to: '/' })
			}, 1500)
		} catch (err) {
			setError(err instanceof Error ? err.message : t('exception.submitError'))
		} finally {
			setIsSubmitting(false)
		}
	}

	if (success) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
				<div className="text-4xl">✓</div>
				<p className="text-base font-medium text-[var(--text-primary)]">
					{t('exception.submitSuccess')}
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4 px-4 pb-4">
			{/* Exception type */}
			<DriverCard>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-sm text-[var(--text-secondary)]">
							{t('exception.type')}
						</span>
						<span className="text-sm font-medium">
							{typeConfig ? t(typeConfig.labelKey) : type}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-[var(--text-secondary)]">
							{t('exception.timestamp')}
						</span>
						<span
							className="text-sm"
							style={{ fontFamily: 'var(--font-mono)' }}
						>
							{new Intl.DateTimeFormat(
								i18n.language === 'ar' ? 'ar-EG' : 'en',
								{
									dateStyle: 'short',
									timeStyle: 'medium',
								},
							).format(new Date(timestamp))}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-[var(--text-secondary)]">
							{t('exception.gpsCoordinates')}
						</span>
						<span
							className="text-sm"
							style={{ fontFamily: 'var(--font-mono)' }}
						>
							{formatCoord(gpsLat)}, {formatCoord(gpsLng)}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-[var(--text-secondary)]">
							{t('exception.photoCount')}
						</span>
						<span
							className="text-sm"
							style={{ fontFamily: 'var(--font-mono)' }}
						>
							{i18n.language === 'ar'
								? new Intl.NumberFormat('ar-EG').format(photos.length)
								: photos.length}
						</span>
					</div>
				</div>
			</DriverCard>

			{/* Type-specific details */}
			{Object.keys(details).length > 0 && (
				<DriverCard
					header={
						<span className="text-sm font-medium">
							{t('exception.details')}
						</span>
					}
				>
					<div className="flex flex-col gap-1.5">
						{Object.entries(details).map(([key, value]) => {
							if (
								key === 'damagedItems' ||
								key === 'selectedItemIds' ||
								key === 'wantedItemIds' ||
								key === 'undeliveredItemIds'
							)
								return null
							return (
								<div
									key={key}
									className="flex items-start justify-between gap-2"
								>
									<span className="text-xs text-[var(--text-tertiary)] shrink-0">
										{t(`exception.detailKeys.${key}`, key)}
									</span>
									<span className="text-xs text-end">
										{typeof value === 'string' ? value : JSON.stringify(value)}
									</span>
								</div>
							)
						})}
					</div>
				</DriverCard>
			)}

			{/* Photos */}
			{photos.length > 0 && (
				<DriverCard
					header={
						<span className="text-sm font-medium">
							{t('exception.capturedPhotos')}
						</span>
					}
				>
					<PhotoGrid photos={photos} onAdd={() => {}} readOnly />
				</DriverCard>
			)}

			{/* Dispatch notification info */}
			<p className="text-xs text-center text-[var(--text-tertiary)]">
				{t('exception.dispatchNotified')}
			</p>

			{/* Error display */}
			{error && (
				<div className="rounded-xl bg-[#FEE2E2] px-4 py-3">
					<p className="text-sm text-[#991B1B]">{error}</p>
				</div>
			)}

			{/* Actions */}
			<div className="flex flex-col gap-2">
				<DriverButton
					variant="primary"
					onPress={handleSubmit}
					isLoading={isSubmitting}
					className="min-h-[56px]"
				>
					{t('exception.submitReport')}
				</DriverButton>
				<DriverButton
					variant="secondary"
					onPress={prevStep}
					isDisabled={isSubmitting}
				>
					{t('exception.edit')}
				</DriverButton>
			</div>
		</div>
	)
}
