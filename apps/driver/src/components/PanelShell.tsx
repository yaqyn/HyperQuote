import { cubicBezier, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function PanelShell({
	children,
	reserveRail = true,
	title,
}: {
	children: ReactNode
	reserveRail?: boolean
	title: string
}) {
	const reduceMotion = useReducedMotion()
	const transition = reduceMotion
		? { duration: 0 }
		: { duration: 0.22, ease: cubicBezier(0.22, 1, 0.36, 1) }

	return (
		<motion.section
			className="driver-panel-shell absolute inset-0 z-20 flex flex-col bg-[var(--color-panel)] text-[var(--color-text)]"
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			transition={transition}
		>
			<header className="driver-panel-header flex h-16 shrink-0 items-center justify-center border-b border-[var(--color-border)] px-4 pt-[env(safe-area-inset-top)] text-center">
				<h2 className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-lg font-bold">
					{title}
				</h2>
			</header>
			<div
				className={`driver-panel-body min-h-0 flex-1 overflow-auto ${
					reserveRail
						? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'
						: 'pb-[env(safe-area-inset-bottom)]'
				}`}
			>
				{children}
			</div>
		</motion.section>
	)
}
