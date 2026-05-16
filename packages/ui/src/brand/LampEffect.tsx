import { motion } from 'motion/react'
import type React from 'react'
import { cn } from '../utils/cn'

const BG = '#060606'

// Starts at normal speed, decelerates heavily near the end
const lampEase = [0.15, 0.85, 0.05, 1] as const

const beam = {
	initial: { opacity: 0, width: '0rem' },
	animate: { opacity: 1, width: '30rem' },
	transition: { delay: 0.3, duration: 6, ease: lampEase },
}

const glow = {
	initial: { opacity: 0, width: '0rem' },
	animate: { opacity: 0.5, width: '28rem' },
	transition: { delay: 0.3, duration: 6, ease: lampEase },
}

const innerGlow = {
	initial: { opacity: 0, width: '0rem' },
	animate: { opacity: 1, width: '16rem' },
	transition: { delay: 0.3, duration: 6, ease: lampEase },
}

const horizon = {
	initial: { opacity: 0, width: '0rem' },
	animate: { opacity: 1, width: '30rem' },
	transition: { delay: 0.3, duration: 6, ease: lampEase },
}

export const LampContainer = ({
	children,
	className,
}: {
	children?: React.ReactNode
	className?: string
}) => {
	return (
		<div
			className={cn(
				'relative flex flex-col items-center justify-center overflow-hidden w-full rounded-md z-0',
				className,
			)}
			style={{ backgroundColor: BG }}
		>
			<div
				className="relative flex w-full flex-1 items-center justify-center isolate z-0"
				style={{ transform: 'scaleY(1.25)' }}
			>
				{/* Left beam */}
				<motion.div
					initial={beam.initial}
					animate={beam.animate}
					transition={beam.transition}
					style={{
						position: 'absolute',
						right: '50%',
						height: '14rem',
						overflow: 'visible',
						background:
							'conic-gradient(from 70deg at center top, rgba(255,255,255,0.35), transparent 50%)',
					}}
				>
					<div
						style={{
							position: 'absolute',
							width: '100%',
							left: 0,
							bottom: 0,
							height: '10rem',
							background: BG,
							zIndex: 20,
							maskImage: 'linear-gradient(to top, white, transparent)',
							WebkitMaskImage: 'linear-gradient(to top, white, transparent)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							width: '10rem',
							height: '100%',
							left: 0,
							bottom: 0,
							background: BG,
							zIndex: 20,
							maskImage: 'linear-gradient(to right, white, transparent)',
							WebkitMaskImage: 'linear-gradient(to right, white, transparent)',
						}}
					/>
				</motion.div>

				{/* Right beam */}
				<motion.div
					initial={beam.initial}
					animate={beam.animate}
					transition={beam.transition}
					style={{
						position: 'absolute',
						left: '50%',
						height: '14rem',
						background:
							'conic-gradient(from 290deg at center top, transparent 50%, rgba(255,255,255,0.35))',
					}}
				>
					<div
						style={{
							position: 'absolute',
							width: '10rem',
							height: '100%',
							right: 0,
							bottom: 0,
							background: BG,
							zIndex: 20,
							maskImage: 'linear-gradient(to left, white, transparent)',
							WebkitMaskImage: 'linear-gradient(to left, white, transparent)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							width: '100%',
							right: 0,
							bottom: 0,
							height: '10rem',
							background: BG,
							zIndex: 20,
							maskImage: 'linear-gradient(to top, white, transparent)',
							WebkitMaskImage: 'linear-gradient(to top, white, transparent)',
						}}
					/>
				</motion.div>

				{/* Bottom fill + blur */}
				<div
					style={{
						position: 'absolute',
						top: '50%',
						height: '12rem',
						width: '100%',
						transform: 'translateY(3rem) scaleX(1.5)',
						background: BG,
						filter: 'blur(24px)',
					}}
				/>
				<div
					style={{
						position: 'absolute',
						top: '50%',
						height: '12rem',
						width: '100%',
						zIndex: 50,
						opacity: 0.1,
						backdropFilter: 'blur(12px)',
					}}
				/>

				{/* Large glow */}
				<motion.div
					initial={glow.initial}
					animate={glow.animate}
					transition={glow.transition}
					style={{
						position: 'absolute',
						zIndex: 50,
						height: '9rem',
						transform: 'translateY(-50%)',
						borderRadius: '9999px',
						background: 'rgba(255,255,255,0.15)',
						filter: 'blur(48px)',
					}}
				/>

				{/* Inner glow */}
				<motion.div
					initial={innerGlow.initial}
					animate={innerGlow.animate}
					transition={innerGlow.transition}
					style={{
						position: 'absolute',
						zIndex: 30,
						height: '9rem',
						borderRadius: '9999px',
						background: 'rgba(255,255,255,0.10)',
						filter: 'blur(32px)',
						transform: 'translateY(-6rem)',
					}}
				/>

				{/* Horizon line */}
				<motion.div
					initial={horizon.initial}
					animate={horizon.animate}
					transition={horizon.transition}
					style={{
						position: 'absolute',
						zIndex: 50,
						height: '3px',
						background: 'rgba(255,255,255,0.8)',
						transform: 'translateY(-7rem)',
						boxShadow:
							'0 0 20px 2px rgba(255,255,255,0.3), 0 0 60px 4px rgba(255,255,255,0.1)',
					}}
				/>

				{/* Top mask */}
				<div
					style={{
						position: 'absolute',
						zIndex: 40,
						height: '11rem',
						width: '100%',
						background: BG,
						transform: 'translateY(-12.5rem)',
					}}
				/>
			</div>

			{children && (
				<div
					className="relative z-50 flex flex-col items-center px-5"
					style={{ transform: 'translateY(-20rem)' }}
				>
					{children}
				</div>
			)}
		</div>
	)
}

export { LampContainer as LampEffect }
