import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface GlassElevatedProps {
	isOpen: boolean
	onClose: () => void
	children: ReactNode
	className?: string
}

export function GlassElevated({
	isOpen,
	onClose,
	children,
	className,
}: GlassElevatedProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.98 }}
					transition={{
						type: 'spring',
						stiffness: 200,
						damping: 20,
					}}
					className="fixed inset-0 z-50 flex items-center justify-center"
					role="presentation"
				>
					{/* Backdrop */}
					<motion.div
						className="absolute inset-0 bg-black/30 dark:bg-black/50"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeIn' }}
						onClick={onClose}
					/>
					{/* Elevated glass panel */}
					<motion.div
						className={cn(
							'relative backdrop-blur-2xl',
							'bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)]',
							'shadow-lg rounded-xl overflow-auto',
							className,
						)}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={{ duration: 0.2, ease: 'easeIn' }}
					>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
