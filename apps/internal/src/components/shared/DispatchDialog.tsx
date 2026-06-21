import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ButtonProps as AriaButtonProps } from 'react-aria-components/Button'
import { Button as AriaButton } from 'react-aria-components/Button'
import { Dialog, Heading } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'

/**
 * DispatchDialog — the single shared frame for every modal in the app.
 *
 * The shell is intentionally quiet: compact chrome, clear title hierarchy,
 * consistent scroll behavior, and action buttons that feel like the same app
 * across sales, procurement, warehouse, finance, and dispatch.
 *
 * Consumers compose:
 *   <DispatchDialog isOpen onClose title eyebrow size="md">
 *     <DispatchBody>...form fields / content...</DispatchBody>
 *     <DispatchFooter>
 *       <DispatchAction onPress={...}>Confirm</DispatchAction>
 *       <DispatchAction onPress={close} tone="ghost">Cancel</DispatchAction>
 *     </DispatchFooter>
 *   </DispatchDialog>
 *
 * For richer bodies (e.g. forms), callers can skip DispatchBody entirely
 * and render children directly.
 */

type DispatchSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAX: Record<DispatchSize, string> = {
	sm: 'sm:max-w-md',
	md: 'sm:max-w-xl',
	lg: 'sm:max-w-3xl',
	xl: 'sm:max-w-5xl',
}

interface DispatchDialogProps {
	isOpen: boolean
	onClose: () => void
	/** Main dialog title. */
	title: string
	/** Small mono eyebrow above the title, e.g. a module name or record id. */
	eyebrow?: ReactNode
	/** Optional sub-caption below the title. */
	caption?: ReactNode
	size?: DispatchSize
	/** Pass to disable the close button — e.g. during a submit */
	dismissDisabled?: boolean
	/** The body + footer — consumer composes */
	children: ReactNode
	/** Accessible label override (defaults to title) */
	ariaLabel?: string
	/** Let high-density workflows use the entire phone viewport. */
	fullScreenOnMobile?: boolean
	/** Preserve the accessible title while hiding visual chrome on phone. */
	hideHeaderOnMobile?: boolean
}

export function DispatchDialog({
	isOpen,
	onClose,
	title,
	eyebrow,
	caption,
	size = 'md',
	dismissDisabled,
	children,
	ariaLabel,
	fullScreenOnMobile = false,
	hideHeaderOnMobile = false,
}: DispatchDialogProps) {
	if (!isOpen) return null

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open && !dismissDisabled) onClose()
			}}
			isDismissable={!dismissDisabled}
			isKeyboardDismissDisabled={dismissDisabled}
			className={`fixed inset-0 z-50 flex items-center justify-center sm:p-5
        bg-black/35 dark:bg-black/55 backdrop-blur-[2px]
        entering:animate-in entering:fade-in entering:duration-150
        exiting:animate-out exiting:fade-out exiting:duration-100 ${
					fullScreenOnMobile ? 'p-0 sm:p-5' : 'p-3'
				}`}
		>
			<Modal
				className={`${SIZE_MAX[size]} w-full outline-none animate-dispatch-stamp ${
					fullScreenOnMobile
						? 'h-dvh max-w-none sm:h-auto sm:max-w-[calc(100vw-1.5rem)]'
						: 'max-w-[calc(100vw-1.5rem)]'
				}`}
			>
				<Dialog
					aria-label={ariaLabel ?? title}
					className={`relative flex min-h-0 flex-col overflow-hidden border border-black/[0.08] bg-[var(--color-surface)] text-[var(--color-text)]
            shadow-[0_24px_80px_-32px_rgba(0,0,0,0.72)] outline-none dark:border-white/[0.1] ${
							fullScreenOnMobile
								? 'h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-lg'
								: 'max-h-[calc(100dvh-1.5rem)] rounded-lg'
						}`}
				>
					<header
						className={`relative shrink-0 border-b border-black/[0.08] px-4 py-3 sm:px-5 sm:py-4 dark:border-white/[0.1] ${
							hideHeaderOnMobile
								? 'absolute right-2 top-2 z-20 border-b-0 p-0 sm:relative sm:right-auto sm:top-auto sm:border-b sm:px-5 sm:py-4'
								: ''
						}`}
					>
						<div className="flex items-start justify-between gap-4">
							<div
								className={`flex-1 min-w-0 ${
									hideHeaderOnMobile ? 'sr-only sm:not-sr-only' : ''
								}`}
							>
								{eyebrow && (
									<p className="mb-1.5 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
										{eyebrow}
									</p>
								)}
								<Heading
									slot="title"
									className="font-[family-name:var(--font-archivo)] text-[18px] font-semibold leading-tight text-[var(--color-text)] sm:text-[20px]"
								>
									{title}
								</Heading>
								{caption && (
									<p className="mt-1.5 font-[family-name:var(--font-archivo)] text-[12.5px] leading-snug text-[var(--color-text-muted)]">
										{caption}
									</p>
								)}
							</div>

							{!dismissDisabled && (
								<AriaButton
									onPress={onClose}
									aria-label="Close"
									className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md
                    text-[var(--color-text-muted)] transition-colors outline-none
                    hover:bg-black/[0.05] hover:text-[var(--color-text)] dark:hover:bg-white/[0.06]
                    focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
								>
									<X size={15} strokeWidth={1.8} />
								</AriaButton>
							)}
						</div>
					</header>

					{/* Body + footer — direct children from the caller */}
					<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
						{children}
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}

// ─── Body wrapper — scroll-safe reading column ────────────

export function DispatchBody({
	children,
	className = '',
}: {
	children: ReactNode
	className?: string
}) {
	return (
		<div
			className={`flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 ${className}`}
		>
			{children}
		</div>
	)
}

// ─── Footer — actions + optional leading note ─────────────

export function DispatchFooter({
	children,
	leading,
}: {
	children: ReactNode
	leading?: ReactNode
}) {
	return (
		<footer className="shrink-0 flex flex-col gap-3 border-t border-black/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 dark:border-white/[0.1]">
			{leading && (
				<div className="min-w-0 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
					{leading}
				</div>
			)}
			<div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-2">
				{children}
			</div>
		</footer>
	)
}

// ─── Dialog action ────────────────────────────────────────

type DispatchTone = 'primary' | 'danger' | 'ghost'

interface DispatchActionProps
	extends Omit<AriaButtonProps, 'className' | 'children'> {
	tone?: DispatchTone
	children: ReactNode
}

export function DispatchAction({
	tone = 'primary',
	children,
	...props
}: DispatchActionProps) {
	const toneClass =
		tone === 'primary'
			? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:opacity-90'
			: tone === 'danger'
				? 'border-[#B91C1C] bg-[#B91C1C] text-white hover:bg-[#991B1B]'
				: 'border-transparent text-[var(--color-text-muted)] hover:bg-black/[0.04] hover:text-[var(--color-text)] dark:hover:bg-white/[0.05]'

	return (
		<AriaButton
			{...props}
			className={`inline-flex min-h-9 w-full items-center justify-center rounded-md border px-3
        font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase tracking-[0.1em]
        outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30
        data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 sm:w-auto
        ${toneClass}`}
		>
			<span>{children}</span>
		</AriaButton>
	)
}

// ─── Form field primitives for use inside the dialog ──────

export function DispatchField({
	label,
	required,
	error,
	children,
}: {
	label: string
	required?: boolean
	error?: string
	children: ReactNode
}) {
	return (
		<span className="block">
			<span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] lg:tracking-[0.2em]">
				<span className="min-w-0">{label}</span>
				{required && (
					<span className="text-[var(--color-text-subtle)]">required</span>
				)}
			</span>
			<span className="block mt-1.5">{children}</span>
			{error && (
				<span className="block mt-1 font-[family-name:var(--font-archivo)] italic text-[12px] text-[#B3261E] dark:text-[#E46B63]">
					{error}
				</span>
			)}
		</span>
	)
}

/**
 * Dispatch-aesthetic input — flat, no rounded corners, hairline bottom
 * that thickens on focus. Use inside DispatchField for form modals.
 */
export function DispatchInputClass() {
	return 'min-h-10 w-full rounded-md border border-black/[0.1] bg-black/[0.015] px-3 py-2 font-[family-name:var(--font-archivo)] text-[16px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12] dark:bg-white/[0.025] sm:text-[14px]'
}

/**
 * Section header used inside DispatchBody to split form / detail blocks.
 * Renders a mono eyebrow with a trailing hairline.
 */
export function DispatchSection({ label }: { label: string }) {
	return (
		<div className="flex items-baseline gap-3 mt-6 mb-4 first:mt-0">
			<span className="min-w-0 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] lg:tracking-[0.22em]">
				{label}
			</span>
			<span className="flex-1 h-px bg-black/[0.1] dark:bg-white/[0.12]" />
		</div>
	)
}
