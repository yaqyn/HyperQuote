import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface GlassWindowProps {
	isOpen: boolean
	onClose: () => void
	children: ReactNode
	className?: string
	closeOnBackdropClick?: boolean
}

export function GlassWindow({
	isOpen,
	onClose,
	children,
	className,
	closeOnBackdropClick = true,
}: GlassWindowProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					key="glass-window"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18, ease: 'easeOut' }}
					className="fixed inset-0 flex items-center justify-center p-3 md:p-6"
					style={{ zIndex: 40 }}
					role="presentation"
				>
					{/* Backdrop: closes on click when enabled. Keyboard close is handled
					    by the consuming app's Escape hotkey (project convention). */}
					{closeOnBackdropClick && (
						<button
							type="button"
							aria-label="Close dialog"
							onClick={onClose}
							className="absolute inset-0 cursor-default bg-transparent"
							tabIndex={-1}
						/>
					)}
					{/* Panel */}
					<div
						className={cn(
							'relative flex flex-col w-full h-full',
							'bg-[var(--color-surface)]',
							'rounded-2xl',
							'shadow-2xl shadow-black/8 dark:shadow-black/25',
							'overflow-hidden',
							className,
						)}
						role="dialog"
					>
						{children}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
