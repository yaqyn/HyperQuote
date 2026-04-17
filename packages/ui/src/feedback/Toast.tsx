import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect } from 'react'
import { cn } from '../utils/cn'

interface ToastProps {
	message: string
	action?: { label: string; onClick: () => void }
	onClose: () => void
	duration?: number
}

export function Toast({ message, action, onClose, duration }: ToastProps) {
	const autoDismiss = duration ?? (action ? 8000 : 4000)

	const handleClose = useCallback(() => {
		onClose()
	}, [onClose])

	useEffect(() => {
		const timer = setTimeout(handleClose, autoDismiss)
		return () => clearTimeout(timer)
	}, [autoDismiss, handleClose])

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 16, scale: 0.95 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 8 }}
				transition={{
					type: 'spring',
					stiffness: 200,
					damping: 20,
				}}
				className={cn(
					'fixed bottom-4 end-4 z-50',
					'backdrop-blur-xl bg-[rgba(255,255,255,0.80)] dark:bg-[rgba(0,0,0,0.80)]',
					'shadow-lg rounded-xl',
					'px-4 py-3 flex items-center gap-3',
					'text-[var(--text-sm)] text-[var(--color-text)]',
				)}
				role="alert"
			>
				<span>{message}</span>
				{action && (
					<button
						type="button"
						onClick={action.onClick}
						className="text-[var(--color-primary)] font-medium hover:underline whitespace-nowrap"
					>
						{action.label}
					</button>
				)}
			</motion.div>
		</AnimatePresence>
	)
}
