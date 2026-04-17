import { motion, useInView } from 'motion/react'
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

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 20 }}
			animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
			transition={{
				type: 'spring',
				stiffness: 120,
				damping: 14,
				delay,
			}}
			className={className}
		>
			{children}
		</motion.div>
	)
}
