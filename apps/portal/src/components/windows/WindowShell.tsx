import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { useShortcut } from '../../hooks/useShortcut'
import { PortalTitleRow } from '../shell/PortalTitleRow'

interface WindowShellProps {
	title: string
	subtitle?: string
	/** Max content width on desktop. Default 720px for comfortable reading. */
	maxWidth?: string
	children: ReactNode
}

export function WindowShell({
	title,
	subtitle,
	maxWidth = '720px',
	children,
}: WindowShellProps) {
	const navigate = useNavigate()
	const { t } = useTranslation('portal')

	const handleClose = () => {
		navigate({ to: '/' })
	}

	useShortcut('Escape', handleClose)

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{
				opacity: 0,
				y: 4,
				transition: { duration: 0.2, ease: 'easeIn' },
			}}
			transition={{ type: 'spring', stiffness: 200, damping: 20 }}
			className="absolute inset-0 z-40 flex flex-col overflow-auto bg-[var(--color-base)]"
		>
			{/* Sticky header — centered like content */}
			<div className="sticky top-0 z-10 bg-[var(--color-base)] border-b border-[var(--color-border)]/50 shrink-0">
				<div
					className="flex items-center justify-between h-14 px-6 mx-auto"
					style={{ maxWidth }}
				>
					<PortalTitleRow
						title={title}
						subtitle={subtitle}
						className="flex-1"
						action={
							<Button
								onPress={handleClose}
								aria-label={t('window.close')}
								className="flex items-center justify-center w-9 h-9 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer -me-2"
							>
								<X size={18} strokeWidth={1.5} />
							</Button>
						}
					/>
				</div>
			</div>

			{/* Centered content — comfortable width */}
			<div
				className="flex-1 mx-auto w-full px-6 max-md:px-4"
				style={{ maxWidth }}
			>
				{children}
			</div>
		</motion.div>
	)
}
