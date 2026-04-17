import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

interface ConfettiEffectProps {
	isActive: boolean
}

interface Particle {
	id: number
	x: number
	drift: number
	color: 'blue' | 'white'
	rotation: number
	delay: number
}

export function ConfettiEffect({ isActive }: ConfettiEffectProps) {
	const [particles, setParticles] = useState<Particle[]>([])

	useEffect(() => {
		if (!isActive) return

		const count = 25
		const generated: Particle[] = []
		for (let i = 0; i < count; i++) {
			generated.push({
				id: i,
				x:
					Math.random() *
					(typeof window !== 'undefined' ? window.innerWidth : 1000),
				drift: (Math.random() - 0.5) * 200,
				color: i % 2 === 0 ? 'blue' : 'white',
				rotation: 180 + Math.random() * 540,
				delay: i * 10,
			})
		}
		setParticles(generated)

		const timer = setTimeout(() => {
			setParticles([])
		}, 500)

		return () => clearTimeout(timer)
	}, [isActive])

	if (particles.length === 0) return null

	return (
		<div className="fixed inset-0 z-[100] pointer-events-none">
			{particles.map((p) => (
				<motion.div
					key={p.id}
					initial={{
						x: p.x,
						y: 0,
						opacity: 1,
						rotate: 0,
					}}
					animate={{
						y: typeof window !== 'undefined' ? window.innerHeight : 800,
						x: p.x + p.drift,
						opacity: 0,
						rotate: p.rotation,
					}}
					transition={{
						duration: 0.3,
						ease: 'easeOut',
						delay: p.delay / 1000,
					}}
					className={[
						'absolute w-2 h-2 rounded-full',
						p.color === 'blue'
							? 'bg-[var(--color-primary)]'
							: 'bg-white border border-[var(--color-border)]',
					].join(' ')}
				/>
			))}
		</div>
	)
}
