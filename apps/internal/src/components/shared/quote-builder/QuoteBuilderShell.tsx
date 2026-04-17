import { AnimatePresence, motion } from 'motion/react'
import type { FieldValues } from 'react-hook-form'
import { FormProvider } from 'react-hook-form'
import type { QuoteBuilderShellProps } from './types'

export function QuoteBuilderShell<TForm extends FieldValues = FieldValues>({
	form,
	title,
	headerActions,
	tabs,
	activeTabId,
	onTabChange,
	canvas,
	footer,
	onBack,
	backLabel = 'Back',
}: QuoteBuilderShellProps<TForm>) {
	const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

	return (
		<div className="flex h-full flex-col">
			{/* Top bar — back + title + actions */}
			<div className="flex items-center border-b border-black/[0.06] px-5 py-2 dark:border-white/[0.06]">
				<div className="flex items-center gap-2">
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-black/40 outline-none transition-colors hover:bg-black/[0.04] hover:text-black/70 dark:text-white/40 dark:hover:bg-white/[0.04] dark:hover:text-white/70"
						>
							<svg
								aria-hidden="true"
								width="14"
								height="14"
								viewBox="0 0 16 16"
								fill="none"
								className="rtl:rotate-180"
							>
								<path
									d="M10 12L6 8l4-4"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							{backLabel}
						</button>
					)}
					<div className="flex items-center gap-2">{title}</div>
				</div>
				<div className="flex-1" />
				{headerActions && (
					<div className="flex items-center gap-2">{headerActions}</div>
				)}
			</div>

			{/* Tab strip */}
			{tabs.length > 1 && (
				<div className="flex items-center gap-1 border-b border-black/[0.06] px-5 py-2 dark:border-white/[0.06]">
					{tabs.map((tab) => {
						const isActive = tab.id === activeTabId
						return (
							<button
								key={tab.id}
								type="button"
								disabled={tab.disabled}
								onClick={() => onTabChange(tab.id)}
								className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium outline-none transition-all ${
									isActive
										? 'bg-[var(--color-primary)] text-white'
										: tab.disabled
											? 'cursor-not-allowed text-black/20 dark:text-white/20'
											: 'cursor-pointer text-black/40 hover:bg-black/[0.03] hover:text-black/60 dark:text-white/40 dark:hover:bg-white/[0.03] dark:hover:text-white/60'
								}`}
							>
								{tab.icon}
								{tab.label}
								{tab.completed && !isActive && (
									<svg
										width="10"
										height="10"
										viewBox="0 0 14 14"
										fill="none"
										aria-hidden="true"
									>
										<path
											d="M3.5 7l2.5 2.5L10.5 5"
											stroke="currentColor"
											strokeWidth="1.75"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								)}
							</button>
						)
					})}
				</div>
			)}

			{/* Body — content + canvas split */}
			<div className="flex flex-1 overflow-hidden">
				<FormProvider {...form}>
					<div
						className="flex-1 overflow-y-auto px-8 pb-16"
						data-module-content
					>
						<AnimatePresence mode="wait">
							<motion.div
								key={activeTab?.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: { duration: 0 } }}
								transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
							>
								{activeTab?.content}
							</motion.div>
						</AnimatePresence>
					</div>

					{canvas && (
						<div className="w-[420px] shrink-0 border-s border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
							{canvas}
						</div>
					)}
				</FormProvider>
			</div>

			{/* Footer — totals + primary actions */}
			{footer && (
				<div className="shrink-0 border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
					{footer}
				</div>
			)}
		</div>
	)
}
