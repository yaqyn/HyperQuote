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

/**
 * GlassWindow — the shell frame. A precise, composed plate: sharp
 * 12px radius, hairline border, directional shadow with a 1px top-edge
 * highlight so the surface catches light like a real object. Consumers
 * may layer additional classes (e.g. `shell-plate` for corner
 * registration ticks) via the className prop.
 *
 * Entry: opacity fade with a small y-rise so the plate lands rather
 * than flashes into view.
 */
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
					{/* Plate */}
					<motion.div
						initial={{ y: 8, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 4, opacity: 0 }}
						transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
						className={cn(
							'relative flex flex-col w-full h-full overflow-hidden rounded-xl',
							'bg-[var(--color-surface)]',
							'[box-shadow:inset_0_1px_0_rgba(255,255,255,0.72),0_2px_6px_-2px_rgba(0,0,0,0.08),0_20px_48px_-12px_rgba(0,0,0,0.18)]',
							'dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.04),0_2px_6px_-2px_rgba(0,0,0,0.5),0_24px_64px_-12px_rgba(0,0,0,0.65)]',
							className,
						)}
						role="dialog"
					>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
