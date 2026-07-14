import { Link } from '@tanstack/react-router'
import { ArrowUpRight, X } from 'lucide-react'
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
								className="flex h-full flex-col"
							>
								<div className="flex h-[68px] items-center justify-between border-b border-[var(--site-rule)] px-5">
									<Link
										to="/"
										onClick={onClose}
										className="text-[19px] font-extrabold tracking-[-0.035em]"
									>
										HyperQuote
									</Link>
									<button
										type="button"
										onClick={onClose}
										aria-label={t('a11y.closeNav')}
										className="rounded-lg p-2 transition-colors hover:bg-[var(--site-concrete)]"
									>
										<X size={24} />
									</button>
								</div>

								<nav className="flex flex-1 flex-col justify-center px-5 py-8">
									<Link
										to="/market"
										onClick={onClose}
										className="group flex items-center justify-between border-b border-[var(--site-rule)] py-5 text-[var(--color-text)]"
									>
										<span className="hq-display text-[clamp(2.25rem,11vw,4rem)] font-bold">
											{t('nav.market')}
										</span>
										<ArrowUpRight className="text-[var(--color-primary)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
									</Link>
									<Link
										to="/about"
										onClick={onClose}
										className="group flex items-center justify-between border-b border-[var(--site-rule)] py-5 text-[var(--color-text)]"
									>
										<span className="hq-display text-[clamp(2.25rem,11vw,4rem)] font-bold">
											{t('nav.about')}
										</span>
										<ArrowUpRight className="text-[var(--color-primary)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
									</Link>
									<Link
										to="/support"
										onClick={onClose}
										className="group flex items-center justify-between border-b border-[var(--site-rule)] py-5 text-[var(--color-text)]"
									>
										<span className="hq-display text-[clamp(2.25rem,11vw,4rem)] font-bold">
											{t('nav.support')}
										</span>
										<ArrowUpRight className="text-[var(--color-primary)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
									</Link>
									<Link
										to="/docs"
										onClick={onClose}
										className="group flex items-center justify-between border-b border-[var(--site-rule)] py-5 text-[var(--color-text)]"
									>
										<span className="hq-display text-[clamp(2.25rem,11vw,4rem)] font-bold">
											{t('nav.docs')}
										</span>
										<ArrowUpRight className="text-[var(--color-primary)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
									</Link>
								</nav>

								<div className="flex items-center justify-between border-t border-[var(--site-rule)] px-5 py-5 text-[12px] text-[var(--color-text-muted)]">
									<span>{t('hero.address')}</span>
									<span className="font-mono text-[10px] text-[var(--color-primary)]">
										HQ / EG
									</span>
								</div>
							</motion.div>
						</Dialog>
					</Modal>
				</ModalOverlay>
			)}
		</AnimatePresence>
	)
}
