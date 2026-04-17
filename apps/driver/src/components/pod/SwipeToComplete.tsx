import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { animate, useMotionValue, useTransform } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SwipeToCompleteProps {
	onComplete: () => void
	isDisabled?: boolean
}

const THRESHOLD = 0.8 // 80% of track width
const HAPTIC_MID = 0.5 // 50% progress feedback
const THUMB_SIZE = 56

export function SwipeToComplete({
	onComplete,
	isDisabled = false,
}: SwipeToCompleteProps) {
	const { t, i18n } = useTranslation('driver')
	const trackRef = useRef<HTMLDivElement>(null)
	const x = useMotionValue(0)
	const [isDragging, setIsDragging] = useState(false)
	const [completed, setCompleted] = useState(false)
	const hapticMidFired = useRef(false)
	const trackWidthRef = useRef(0)
	const isRtl = i18n.dir() === 'rtl'

	// Progress from 0 to 1 based on swipe distance
	const progress = useTransform(x, (latest) => {
		if (trackWidthRef.current <= 0) return 0
		const maxTravel = trackWidthRef.current - THUMB_SIZE
		return Math.min(1, Math.max(0, Math.abs(latest) / maxTravel))
	})

	// Track background gradient
	const trackBg = useTransform(progress, (p) => {
		const pct = Math.round(p * 100)
		return isRtl
			? `linear-gradient(to left, #2563EB ${pct}%, #e5e7eb ${pct}%)`
			: `linear-gradient(to right, #2563EB ${pct}%, #e5e7eb ${pct}%)`
	})

	const getTrackWidth = useCallback(() => {
		if (trackRef.current) {
			trackWidthRef.current = trackRef.current.offsetWidth
		}
		return trackWidthRef.current
	}, [])

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isDisabled || completed) return
			e.currentTarget.setPointerCapture(e.pointerId)
			setIsDragging(true)
			hapticMidFired.current = false
			getTrackWidth()
		},
		[isDisabled, completed, getTrackWidth],
	)

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging || isDisabled || completed) return

			const track = trackRef.current
			if (!track) return

			const rect = track.getBoundingClientRect()
			const maxTravel = rect.width - THUMB_SIZE

			let deltaX: number
			if (isRtl) {
				// RTL: swipe from end (right) to start (left)
				deltaX = rect.right - THUMB_SIZE / 2 - e.clientX
			} else {
				deltaX = e.clientX - rect.left - THUMB_SIZE / 2
			}

			const clamped = Math.min(maxTravel, Math.max(0, deltaX))
			x.set(clamped)

			// Haptic at 50%
			const currentProgress = clamped / maxTravel
			if (currentProgress >= HAPTIC_MID && !hapticMidFired.current) {
				hapticMidFired.current = true
				Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
			}
		},
		[isDragging, isDisabled, completed, isRtl, x],
	)

	const handlePointerUp = useCallback(() => {
		if (!isDragging) return
		setIsDragging(false)

		const trackWidth = trackWidthRef.current
		const maxTravel = trackWidth - THUMB_SIZE
		const currentProgress = Math.abs(x.get()) / maxTravel

		if (currentProgress >= THRESHOLD) {
			// Snap to end
			animate(x, maxTravel, {
				type: 'spring',
				stiffness: 300,
				damping: 30,
			})
			setCompleted(true)
			Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
			onComplete()
		} else {
			// Spring back to start
			animate(x, 0, {
				type: 'spring',
				stiffness: 200,
				damping: 20,
			})
		}
	}, [isDragging, x, onComplete])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (isDisabled || completed) return
			// Enter / Space triggers completion so keyboard users can confirm
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				const trackWidth = getTrackWidth()
				const maxTravel = trackWidth - THUMB_SIZE
				animate(x, maxTravel, {
					type: 'spring',
					stiffness: 300,
					damping: 30,
				})
				setCompleted(true)
				Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
				onComplete()
			}
		},
		[isDisabled, completed, x, onComplete, getTrackWidth],
	)

	return (
		<div
			ref={trackRef}
			className={`relative h-[64px] w-full overflow-hidden rounded-full select-none ${
				isDisabled ? 'opacity-50' : ''
			}`}
			style={{
				background: isDisabled ? '#e5e7eb' : undefined,
				touchAction: 'none',
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			onKeyDown={handleKeyDown}
			role="slider"
			tabIndex={isDisabled ? -1 : 0}
			aria-label={t('pod.swipeToConfirm')}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(progress.get() * 100)}
			aria-disabled={isDisabled}
			dir={isRtl ? 'rtl' : 'ltr'}
		>
			{/* Track background with gradient */}
			{!isDisabled && (
				<div
					className="absolute inset-0 rounded-full"
					style={{ background: trackBg.get() }}
					ref={(el) => {
						if (!el) return
						// Subscribe to background changes
						const unsub = trackBg.on('change', (v) => {
							el.style.background = v
						})
						// Cleanup on unmount handled by React
						return () => unsub()
					}}
				/>
			)}

			{/* Track label */}
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				<span
					className={`text-base font-medium ${
						isDisabled
							? 'text-[var(--text-secondary)]'
							: 'text-white mix-blend-difference'
					}`}
				>
					{t('pod.swipeToConfirm')}
				</span>
			</div>

			{/* Thumb */}
			<div
				className={`absolute top-1 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white shadow-lg ${
					isDisabled
						? 'cursor-not-allowed'
						: 'cursor-grab active:cursor-grabbing'
				}`}
				style={{
					[isRtl ? 'right' : 'left']: `${4 + x.get()}px`,
					// Subscribe reactively
				}}
				ref={(el) => {
					if (!el) return
					const prop = isRtl ? 'right' : 'left'
					const unsub = x.on('change', (v) => {
						el.style[prop] = `${4 + v}px`
					})
					return () => unsub()
				}}
			>
				<svg
					aria-hidden="true"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#2563EB"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={isRtl ? 'rotate-180' : ''}
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</div>
		</div>
	)
}
