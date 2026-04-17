import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeliveryStore } from '../../stores/delivery'

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = seconds % 60
	return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function UnloadingTimer() {
	const { t } = useTranslation('driver')
	const duration = useDeliveryStore((s) => s.unloadingDuration)
	const startedAt = useDeliveryStore((s) => s.unloadingStartedAt)
	const allResolved = useDeliveryStore((s) => s.allItemsResolved)

	// Pulse animation while running
	const opacity = useMotionValue(1)
	const animatedOpacity = useTransform(opacity, (v) => v)

	useEffect(() => {
		if (startedAt && !allResolved) {
			const controls = animate(opacity, [1, 0.5, 1], {
				duration: 2,
				repeat: Infinity,
				ease: 'easeInOut',
			})
			return () => controls.stop()
		}
		opacity.set(1)
	}, [startedAt, allResolved, opacity])

	if (!startedAt) return null

	return (
		<motion.div
			style={{ opacity: animatedOpacity }}
			className="flex items-center justify-between rounded-xl bg-[var(--bg-primary)] px-4 py-3 border border-[var(--border-color)]"
		>
			<span className="text-sm text-[var(--text-secondary)]">
				{t('delivery.unloadingTime')}
			</span>
			<span className="font-mono text-2xl font-semibold text-[var(--text-primary)]">
				{formatDuration(duration)}
			</span>
		</motion.div>
	)
}
