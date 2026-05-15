import { cubicBezier, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { SidebarTitleButton } from './SidebarTitleButton'

const TITLE_EASE = cubicBezier(0.22, 1, 0.36, 1)

interface PortalTitleRowProps {
	title: ReactNode
	subtitle?: ReactNode
	action?: ReactNode
	className?: string
	align?: 'start' | 'center'
	fixed?: boolean
}

export function PortalTitleRow({
	title,
	subtitle,
	action,
	className = '',
	align = 'start',
	fixed = false,
}: PortalTitleRowProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.34, ease: TITLE_EASE }}
			className={`flex min-w-0 items-center gap-4 ${
				align === 'center' ? 'justify-center' : 'justify-between'
			} ${fixed ? 'sticky top-0 z-20 bg-[var(--p-bg)] py-3' : ''} ${className}`}
		>
			<div
				className={`flex min-w-0 items-center gap-2 ${
					align === 'center' ? 'justify-center' : ''
				}`}
			>
				<SidebarTitleButton className="-ms-2" />
				<div className="min-w-0">
					<h1 className="truncate font-sans text-[20px] font-semibold leading-tight tracking-tight text-[var(--p-text)] sm:text-[22px]">
						{title}
					</h1>
					{subtitle && (
						<p className="mt-0.5 truncate text-[13px] font-normal tracking-normal text-[var(--p-text-muted)]">
							{subtitle}
						</p>
					)}
				</div>
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</motion.div>
	)
}
