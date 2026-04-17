import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useState } from 'react'
import { Input, Label, TextField, ToggleButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { capturePhoto } from '@/lib/camera'
import {
	type InspectionItem as InspectionItemType,
	useShiftStore,
} from '@/stores/shift'

interface InspectionItemProps {
	item: InspectionItemType
}

export function InspectionItem({ item }: InspectionItemProps) {
	const { t } = useTranslation('driver')
	const setStatus = useShiftStore((s) => s.setInspectionItemStatus)
	const setSeverity = useShiftStore((s) => s.setInspectionItemSeverity)
	const setPhoto = useShiftStore((s) => s.setInspectionItemPhoto)
	const setNotes = useShiftStore((s) => s.setInspectionItemNotes)
	const [isExpanded, setIsExpanded] = useState(item.status === 'fail')

	const handleToggle = async (newStatus: 'pass' | 'fail' | 'na') => {
		try {
			await Haptics.impact({ style: ImpactStyle.Light })
		} catch {
			// Web fallback
		}

		if (item.status === newStatus) {
			// Deselect not allowed — must pick one
			return
		}

		setStatus(item.name, newStatus)
		setIsExpanded(newStatus === 'fail')
	}

	const handleCapturePhoto = async () => {
		try {
			const uri = await capturePhoto()
			if (uri) {
				setPhoto(item.name, uri)
			}
		} catch {
			// Photo capture failed
		}
	}

	return (
		<div className="border-b border-[var(--border-color)] py-3">
			<div className="flex items-center gap-3">
				<span
					className="flex-1 font-medium"
					style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
				>
					{item.name}
				</span>

				<div className="flex gap-2">
					{/* Pass button */}
					<ToggleButton
						isSelected={item.status === 'pass'}
						onChange={() => handleToggle('pass')}
						className={`flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center rounded-xl text-sm font-medium outline-none transition-colors
              ${
								item.status === 'pass'
									? 'bg-[var(--color-success)] text-white'
									: 'border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
							}
              focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]`}
						aria-label={`${item.name} ${t('shift.inspection.pass', 'Pass')}`}
					>
						{t('shift.inspection.pass', 'Pass')}
					</ToggleButton>

					{/* Fail button */}
					<ToggleButton
						isSelected={item.status === 'fail'}
						onChange={() => handleToggle('fail')}
						className={`flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center rounded-xl text-sm font-medium outline-none transition-colors
              ${
								item.status === 'fail'
									? 'bg-[var(--color-danger)] text-white'
									: 'border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
							}
              focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]`}
						aria-label={`${item.name} ${t('shift.inspection.fail', 'Fail')}`}
					>
						{t('shift.inspection.fail', 'Fail')}
					</ToggleButton>

					{/* N/A button */}
					<ToggleButton
						isSelected={item.status === 'na'}
						onChange={() => handleToggle('na')}
						className={`flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center rounded-xl text-sm font-medium outline-none transition-colors
              ${
								item.status === 'na'
									? 'bg-[var(--text-secondary)] text-white'
									: 'border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
							}
              focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]`}
						aria-label={`${item.name} ${t('shift.inspection.na', 'N/A')}`}
					>
						{t('shift.inspection.na', 'N/A')}
					</ToggleButton>
				</div>
			</div>

			{/* Expanded fail details */}
			{isExpanded && item.status === 'fail' && (
				<div className="mt-3 flex flex-col gap-3 ps-2 border-s-2 border-[var(--color-danger)]">
					{/* Severity selector */}
					<div className="flex gap-2">
						<ToggleButton
							isSelected={item.severity === 'minor'}
							onChange={() => setSeverity(item.name, 'minor')}
							className={`flex min-h-[40px] flex-1 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors
                ${
									item.severity === 'minor'
										? 'bg-[var(--color-warning)] text-white'
										: 'border border-[var(--border-color)] bg-[var(--bg-primary)]'
								}
                focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]`}
							aria-label={t('shift.inspection.minor', 'Minor - Can operate')}
						>
							{t('shift.inspection.minor', 'Minor')}
							<span className="ms-1 text-xs opacity-75">
								{t('shift.inspection.canOperate', '(can operate)')}
							</span>
						</ToggleButton>

						<ToggleButton
							isSelected={item.severity === 'major'}
							onChange={() => setSeverity(item.name, 'major')}
							className={`flex min-h-[40px] flex-1 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors
                ${
									item.severity === 'major'
										? 'bg-[var(--color-danger)] text-white'
										: 'border border-[var(--border-color)] bg-[var(--bg-primary)]'
								}
                focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]`}
							aria-label={t('shift.inspection.major', 'Major - Cannot leave')}
						>
							{t('shift.inspection.major', 'Major')}
							<span className="ms-1 text-xs opacity-75">
								{t('shift.inspection.cannotLeave', '(cannot leave)')}
							</span>
						</ToggleButton>
					</div>

					{/* Camera button + photo preview */}
					<button
						type="button"
						onClick={handleCapturePhoto}
						className="flex min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
					>
						<span>&#128247;</span>
						{item.photoUri
							? t('shift.inspection.retakePhoto', 'Retake Photo')
							: t('shift.inspection.takePhoto', 'Take Photo')}
					</button>

					{item.photoUri && (
						<img
							src={item.photoUri}
							alt={`${item.name} defect`}
							className="h-24 w-24 rounded-lg object-cover"
						/>
					)}

					{/* Notes */}
					<TextField
						value={item.notes}
						onChange={(value) => setNotes(item.name, value)}
					>
						<Label className="text-sm text-[var(--text-secondary)]">
							{t('shift.inspection.notes', 'Notes')}
						</Label>
						<Input
							className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
							placeholder={t(
								'shift.inspection.notesPlaceholder',
								'Describe the defect...',
							)}
						/>
					</TextField>
				</div>
			)}
		</div>
	)
}
