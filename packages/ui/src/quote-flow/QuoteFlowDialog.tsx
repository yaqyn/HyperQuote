import {
	ArrowLeft,
	ArrowRight,
	CalendarDays,
	Check,
	ContactRound,
	FolderKanban,
	Info,
	LoaderCircle,
	MapPin,
	Send,
	ShieldCheck,
	X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'

export type QuoteFlowStep =
	| 'agreement'
	| 'contact'
	| 'delivery'
	| 'location'
	| 'project'
export type QuoteFlowNamespace = 'portal' | 'website'

interface QuoteFlowDialogProps {
	children: ReactNode
	currentStep: QuoteFlowStep | null
	error?: string | null
	isOpen: boolean
	namespace: QuoteFlowNamespace
	nextLabel?: string
	nextIsSubmit?: boolean
	onBack?: () => void
	onClose: () => void
	onNext?: () => void
	pending?: boolean
	requirementMessage?: string | null
	nextDisabled?: boolean
	terminalAction?: boolean
}

const FLOW_STEPS: Array<{
	id: QuoteFlowStep
	icon: typeof MapPin
}> = [
	{ id: 'project', icon: FolderKanban },
	{ id: 'location', icon: MapPin },
	{ id: 'delivery', icon: CalendarDays },
	{ id: 'contact', icon: ContactRound },
	{ id: 'agreement', icon: ShieldCheck },
]

export function QuoteFlowDialog({
	children,
	currentStep,
	error,
	isOpen,
	namespace,
	nextIsSubmit = false,
	nextDisabled = false,
	nextLabel,
	onBack,
	onClose,
	onNext,
	pending = false,
	requirementMessage,
	terminalAction = false,
}: QuoteFlowDialogProps) {
	const { t } = useTranslation(namespace)

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open && !pending) onClose()
			}}
			isDismissable={!pending}
			className="fixed inset-0 z-[80] grid place-items-center bg-[#08090b]/68 backdrop-blur-[6px] xl:p-4"
		>
			<Modal className="h-[100dvh] w-full max-w-none overflow-hidden bg-[var(--color-base,var(--color-bg))] text-[var(--color-text)] outline-none xl:h-auto xl:max-w-[1040px] xl:rounded-[18px] xl:border xl:border-white/10 xl:shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
				<Dialog
					aria-label={t('quoteFlow.title')}
					className="flex h-[100dvh] min-h-0 flex-col outline-none xl:h-auto xl:max-h-[calc(100dvh-2rem)] xl:min-h-[min(680px,calc(100dvh-2rem))]"
				>
					<header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--site-rule,var(--color-border))] px-4 sm:px-6">
						<div className="min-w-0">
							<p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-primary)]">
								{t('quoteFlow.eyebrow')}
							</p>
							<h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em]">
								{t('quoteFlow.title')}
							</h2>
						</div>
						<button
							type="button"
							disabled={pending}
							onClick={onClose}
							aria-label={t('quoteFlow.close')}
							className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--site-concrete,var(--color-surface))] hover:text-[var(--color-text)] disabled:opacity-40"
						>
							<X size={16} strokeWidth={1.8} />
						</button>
					</header>

					<div className="flex min-h-0 flex-1 flex-col md:flex-row">
						{currentStep && (
							<QuoteFlowProgress
								currentStep={currentStep}
								namespace={namespace}
							/>
						)}
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

							{currentStep && onNext && (
								<footer className="shrink-0 border-t border-[var(--site-rule,var(--color-border))] bg-[var(--color-base,var(--color-bg))] px-4 py-3 sm:px-6">
									{error && <QuoteFlowError>{error}</QuoteFlowError>}
									{nextDisabled && requirementMessage && !error && (
										<p className="mb-2 flex items-center justify-end gap-1.5 text-[11px] font-medium text-[var(--color-primary)]">
											<Info size={13} strokeWidth={1.8} />
											{requirementMessage}
										</p>
									)}
									<div className="flex items-center justify-between gap-3">
										{onBack ? (
											<button
												type="button"
												disabled={pending}
												onClick={onBack}
												className="inline-flex h-10 items-center gap-2 rounded-[9px] px-2 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
											>
												<ArrowLeft size={14} className="rtl:rotate-180" />
												{t('quoteFlow.back')}
											</button>
										) : (
											<span className="hidden text-[10px] text-[var(--color-text-subtle)] sm:block">
												{t('quoteFlow.location.mapHint')}
											</span>
										)}
										<QuoteFlowPrimaryButton
											disabled={nextDisabled}
											label={nextLabel ?? t('quoteFlow.next')}
											loading={pending}
											onClick={onNext}
											submit={nextIsSubmit}
										/>
									</div>
								</footer>
							)}

							{terminalAction && (
								<footer className="shrink-0 border-t border-[var(--site-rule,var(--color-border))] px-4 py-3 text-end sm:px-6">
									<button
										type="button"
										onClick={onClose}
										className="h-10 rounded-[9px] bg-[var(--color-text)] px-5 text-[12px] font-semibold text-[var(--color-base,var(--color-bg))] hover:opacity-85"
									>
										{t('quoteFlow.close')}
									</button>
								</footer>
							)}
						</div>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}

function QuoteFlowProgress({
	currentStep,
	namespace,
}: {
	currentStep: QuoteFlowStep
	namespace: QuoteFlowNamespace
}) {
	const { t } = useTranslation(namespace)
	const currentIndex = FLOW_STEPS.findIndex((step) => step.id === currentStep)

	return (
		<aside className="shrink-0 border-b border-[var(--site-rule,var(--color-border))] bg-[var(--site-concrete,var(--color-surface))]/45 px-4 py-3 md:w-[190px] md:border-b-0 md:border-e md:px-5 md:py-7">
			<ol className="grid grid-cols-5 gap-1 md:grid-cols-1 md:gap-2">
				{FLOW_STEPS.map((step, index) => {
					const Icon = step.icon
					const active = index === currentIndex
					const complete = index < currentIndex
					return (
						<li
							key={step.id}
							aria-current={active ? 'step' : undefined}
							className={`flex min-w-0 items-center gap-2 rounded-[9px] px-2 py-2 text-[10px] font-semibold transition-colors md:text-[11px] ${
								active
									? 'bg-[var(--color-card,var(--color-bg))] text-[var(--color-text)] shadow-sm'
									: complete
										? 'text-[var(--color-primary)]'
										: 'text-[var(--color-text-subtle)]'
							}`}
						>
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20">
								{complete ? (
									<Check size={11} strokeWidth={2.4} />
								) : (
									<Icon size={12} strokeWidth={1.8} />
								)}
							</span>
							<span className="hidden truncate sm:block">
								{t(`quoteFlow.steps.${step.id}`)}
							</span>
						</li>
					)
				})}
			</ol>
		</aside>
	)
}

function QuoteFlowPrimaryButton({
	disabled,
	label,
	loading,
	onClick,
	submit,
}: {
	disabled: boolean
	label: string
	loading: boolean
	onClick: () => void
	submit: boolean
}) {
	return (
		<button
			type="button"
			disabled={loading || disabled}
			onClick={onClick}
			className="group inline-flex h-10 min-w-[132px] items-stretch overflow-hidden rounded-[9px] border border-[#1d4ed8] bg-[#2563eb] text-white outline-none transition-[background-color,border-color,opacity] hover:bg-[#1d4ed8] focus-visible:ring-3 focus-visible:ring-[#2563eb]/25 disabled:cursor-not-allowed disabled:border-[#93b4fb] disabled:bg-[#8eaff4] disabled:text-white/85 disabled:opacity-55 dark:disabled:border-[#31599f] dark:disabled:bg-[#244b8f]"
		>
			<span className="flex flex-1 items-center justify-center px-4 text-[12px] font-semibold">
				{loading ? <LoaderCircle size={15} className="animate-spin" /> : label}
			</span>
			{!loading && (
				<span className="flex w-10 items-center justify-center border-s border-white/20">
					{submit ? (
						<Send size={13} strokeWidth={1.8} />
					) : (
						<ArrowRight size={13} className="rtl:rotate-180" />
					)}
				</span>
			)}
		</button>
	)
}

function QuoteFlowError({ children }: { children: ReactNode }) {
	return (
		<p role="alert" className="mb-2 text-[11px] text-[var(--color-error)]">
			{children}
		</p>
	)
}
