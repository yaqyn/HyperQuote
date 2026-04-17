import { useTranslation } from 'react-i18next'

interface PhotoGridProps {
	photos: string[]
	onAdd: () => void
	onRemove?: (index: number) => void
	minRequired?: number
	maxPhotos?: number
	readOnly?: boolean
}

export function PhotoGrid({
	photos,
	onAdd,
	onRemove,
	minRequired,
	maxPhotos = 6,
	readOnly = false,
}: PhotoGridProps) {
	const { t } = useTranslation('driver')
	const canAdd = !readOnly && photos.length < maxPhotos

	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-4 gap-2">
				{photos.map((uri, index) => (
					<div key={uri} className="relative">
						<img
							src={uri}
							alt={`${t('exception.photo')} ${index + 1}`}
							className="h-20 w-20 rounded-lg object-cover border border-[var(--border-color)]"
						/>
						{!readOnly && onRemove && (
							<button
								type="button"
								onClick={() => onRemove(index)}
								className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-xs text-white"
								aria-label={t('exception.removePhoto')}
							>
								x
							</button>
						)}
					</div>
				))}

				{canAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-color)] text-[var(--text-tertiary)] min-h-[56px]"
						aria-label={t('exception.addPhoto')}
					>
						<span className="text-2xl">+</span>
					</button>
				)}
			</div>

			{minRequired != null && (
				<span className="text-xs text-[var(--text-secondary)] font-[var(--font-mono)]">
					<span style={{ fontFamily: 'var(--font-mono)' }}>
						{photos.length}/{minRequired}
					</span>{' '}
					{t('exception.photosRequired')}
				</span>
			)}
		</div>
	)
}
