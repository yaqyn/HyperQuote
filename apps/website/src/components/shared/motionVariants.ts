import { cubicBezier } from 'motion/react'

export const EASE = cubicBezier(0.25, 0.1, 0.25, 1)

export const revealUp = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: EASE },
	},
}

export const staggerUp = (delay: number) => ({
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: EASE, delay },
	},
})

export const viewportOnce = { once: true, margin: '-60px' as const }
