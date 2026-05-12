/**
 * Favorite toggle button.
 * Lucide Heart 16px -- outline default, fill red when active.
 * Red fill is an exception to three-color rule (data state).
 * Instant toggle, no animation per UI-VISION.
 */

import { Heart } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface FavoriteButtonProps {
	productId: string
	initialFavorite?: boolean
	onToggle?: (isFavorite: boolean) => void
}

function getFavoriteKey(productId: string) {
	return `hq-favorite-${productId}`
}

export function FavoriteButton({
	productId,
	initialFavorite,
	onToggle,
}: FavoriteButtonProps) {
	const { t } = useTranslation('portal')

	const [isFavorite, setIsFavorite] = useState(() => {
		if (initialFavorite !== undefined) return initialFavorite
		// localStorage fallback for dev mode
		try {
			return localStorage.getItem(getFavoriteKey(productId)) === 'true'
		} catch {
			return false
		}
	})

	const handleToggle = useCallback(() => {
		const newValue = !isFavorite
		setIsFavorite(newValue)

		// Persist to localStorage as fallback for dev mode
		try {
			if (newValue) {
				localStorage.setItem(getFavoriteKey(productId), 'true')
			} else {
				localStorage.removeItem(getFavoriteKey(productId))
			}
		} catch {
			// localStorage not available
		}

		onToggle?.(newValue)
	}, [isFavorite, productId, onToggle])

	return (
		<Button
			onPress={handleToggle}
			aria-label={
				isFavorite
					? t('tracking.removeFromFavorites')
					: t('tracking.addToFavorites')
			}
			className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface)] sm:h-9 sm:w-9"
		>
			<Heart
				size={16}
				fill={isFavorite ? 'var(--color-error)' : 'none'}
				stroke={isFavorite ? 'var(--color-error)' : 'currentColor'}
				className={isFavorite ? '' : 'text-[var(--color-text-muted)]'}
			/>
		</Button>
	)
}
