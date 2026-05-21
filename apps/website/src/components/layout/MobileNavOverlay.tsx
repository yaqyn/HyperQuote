import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'

interface MobileNavOverlayProps {
	isOpen: boolean
	onClose: () => void
}

export function MobileNavOverlay({ isOpen, onClose }: MobileNavOverlayProps) {
	const { t } = useTranslation('website')

	return (
		<AnimatePresence>
			{isOpen && (
				<ModalOverlay
					isOpen={isOpen}
					onOpenChange={(open) => {
						if (!open) onClose()
					}}
					isDismissable
					className="fixed inset-0 z-50"
				>
					<Modal className="fixed inset-0 z-50">
						<Dialog
							aria-label={t('a11y.closeNav')}
							className="fixed inset-0 z-50 bg-[var(--color-base)] outline-none"
						>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{
									opacity: 1,
									transition: {
										type: 'spring',
										stiffness: 200,
										damping: 20,
									},
								}}
								exit={{
									opacity: 0,
									transition: { duration: 0.2, ease: 'easeIn' },
								}}
								className="flex flex-col h-full"
							>
								<div className="flex items-center justify-end px-6 h-14">
									<button
										type="button"
										onClick={onClose}
										aria-label={t('a11y.closeNav')}
										className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
									>
										<X size={24} />
									</button>
								</div>

								<nav className="flex flex-col items-center justify-center flex-1 gap-2">
									<Link
										to="/market"
										onClick={onClose}
										className="text-2xl font-semibold py-4 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
									>
										{t('nav.market')}
									</Link>
									<Link
										to="/about"
										onClick={onClose}
										className="text-2xl font-semibold py-4 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
									>
										{t('nav.about')}
									</Link>
									<Link
										to="/support"
										onClick={onClose}
										className="text-2xl font-semibold py-4 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
									>
										{t('nav.support')}
									</Link>
									<Link
										to="/docs"
										onClick={onClose}
										className="text-2xl font-semibold py-4 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
									>
										{t('nav.docs')}
									</Link>
								</nav>
							</motion.div>
						</Dialog>
					</Modal>
				</ModalOverlay>
			)}
		</AnimatePresence>
	)
}
