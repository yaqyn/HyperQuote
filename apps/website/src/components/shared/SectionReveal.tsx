import { motion, useInView, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef } from 'react'

interface SectionRevealProps {
	children: ReactNode
	delay?: number
	className?: string
}

export function SectionReveal({
	children,
	delay = 0,
	className,
}: SectionRevealProps) {
	const ref = useRef<HTMLDivElement>(null)
	const isInView = useInView(ref, { once: true, amount: 0.2 })
	const shouldReduceMotion = useReducedMotion()
	const offset = shouldReduceMotion ? 0 : 12

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: offset }}
			animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: offset }}
			transition={{
				duration: shouldReduceMotion ? 0.01 : 0.42,
				ease: [0.22, 1, 0.36, 1],
				delay,
			}}
			className={className}
		>
			{children}
		</motion.div>
	)
}
