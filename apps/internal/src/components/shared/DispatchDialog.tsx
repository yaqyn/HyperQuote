import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ButtonProps as AriaButtonProps } from 'react-aria-components'
import {
	Button as AriaButton,
	Dialog,
	Heading,
	Modal,
	ModalOverlay,
} from 'react-aria-components'

/**
 * DispatchDialog — the single shared frame for every modal in the app.
 *
 * Aesthetic reference: a printed dispatch form. Sharp corners, dashed
 * perforated edges at top and bottom (tear-off strip), an "Archivo
 * Black" title that lands like a stamp, a mono eyebrow with the
 * station / form number, and bracketed text-actions in place of filled
 * buttons. The backdrop is dense to force focus; entry animation
 * snaps down instead of floating in.
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

export type DispatchSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAX: Record<DispatchSize, string> = {
	sm: 'max-w-md',
	md: 'max-w-xl',
	lg: 'max-w-3xl',
	xl: 'max-w-5xl',
}

export interface DispatchDialogProps {
	isOpen: boolean
	onClose: () => void
	/** Main dispatch title — rendered in Archivo Black */
	title: string
	/** Small mono eyebrow above the title — e.g. "FORM No. 007" or "RFQ · ACME" */
	eyebrow?: ReactNode
	/** Optional sub-caption below the title (italic, muted) */
	caption?: ReactNode
	size?: DispatchSize
	/** Pass to disable the close button — e.g. during a submit */
	dismissDisabled?: boolean
	/** The body + footer — consumer composes */
	children: ReactNode
	/** Accessible label override (defaults to title) */
	ariaLabel?: string
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
			className="fixed inset-0 z-50 flex items-center justify-center p-6
        bg-black/55 dark:bg-black/70 backdrop-blur-[2px]
        entering:animate-in entering:fade-in entering:duration-150
        exiting:animate-out exiting:fade-out exiting:duration-100"
		>
			<Modal
				className={`${SIZE_MAX[size]} w-full outline-none animate-dispatch-stamp`}
			>
				<Dialog
					aria-label={ariaLabel ?? title}
					className="relative bg-[var(--color-surface)] text-[var(--color-text)]
            border border-black/80 dark:border-white/85 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]
            outline-none flex flex-col max-h-[85vh]"
				>
					{/* Top perforation */}
					<div aria-hidden className="h-2 edge-perforated-t" />

					{/* Header — reads like a dispatch form banner */}
					<header className="relative px-8 pt-7 pb-6">
						{/* Rubber-stamp glyph anchor — decorative only */}
						<span
							aria-hidden
							className="pointer-events-none absolute top-5 end-16 select-none font-[family-name:var(--font-plex-mono)] text-[22px] tracking-[-0.05em] text-[var(--color-text-subtle)]/30 rotate-[-6deg]"
						>
							⊚
						</span>

						<div className="flex items-start justify-between gap-6">
							<div className="flex-1 min-w-0">
								{eyebrow && (
									<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)] mb-3">
										{eyebrow}
									</p>
								)}
								<Heading
									slot="title"
									className="font-[family-name:var(--font-archivo-black)] text-[28px] leading-[1.02] tracking-[-0.015em] uppercase text-[var(--color-text)]"
								>
									{title}
								</Heading>
								{caption && (
									<p className="mt-2 font-[family-name:var(--font-archivo)] italic text-[13.5px] text-[var(--color-text-muted)]">
										{caption}
									</p>
								)}
							</div>

							{!dismissDisabled && (
								<AriaButton
									onPress={onClose}
									aria-label="Close"
									className="mt-0.5 w-8 h-8 inline-flex items-center justify-center
                    border border-black/80 dark:border-white/85
                    text-[var(--color-text)] hover:bg-black/90 dark:hover:bg-white/90
                    hover:text-[var(--color-surface)] transition-colors outline-none
                    focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-1"
								>
									<X size={14} strokeWidth={1.75} />
								</AriaButton>
							)}
						</div>
					</header>

					{/* Body + footer — direct children from the caller */}
					<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
						{children}
					</div>

					{/* Bottom perforation */}
					<div aria-hidden className="h-2 edge-perforated-b" />
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
		<div className={`flex-1 min-h-0 overflow-y-auto px-8 py-6 ${className}`}>
			{children}
		</div>
	)
}

// ─── Footer — bracketed actions + optional leading note ────

export function DispatchFooter({
	children,
	leading,
}: {
	children: ReactNode
	leading?: ReactNode
}) {
	return (
		<footer className="shrink-0 flex items-center justify-between gap-4 px-8 py-4 border-t border-black/[0.12] dark:border-white/[0.12]">
			<div className="min-w-0 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
				{leading}
			</div>
			<div className="flex items-center gap-5 shrink-0">{children}</div>
		</footer>
	)
}

// ─── Bracketed action — [ Confirm ] / [ Cancel ] ───────────

type DispatchTone = 'primary' | 'danger' | 'ghost'

export interface DispatchActionProps
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
			? 'text-[var(--color-text)] hover:text-[var(--color-primary)]'
			: tone === 'danger'
				? 'text-[#B3261E] dark:text-[#E46B63] hover:text-[#8A1912]'
				: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'

	return (
		<AriaButton
			{...props}
			className={`group inline-flex items-center gap-1
        font-[family-name:var(--font-archivo)] text-[12.5px] font-semibold uppercase tracking-[0.14em]
        outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/50 rounded-sm
        data-[disabled]:opacity-40 transition-colors
        ${toneClass}`}
		>
			<span
				aria-hidden
				className="font-[family-name:var(--font-plex-mono)] text-[14px] leading-none opacity-60 group-hover:opacity-100 transition-opacity"
			>
				[
			</span>
			<span>{children}</span>
			<span
				aria-hidden
				className="font-[family-name:var(--font-plex-mono)] text-[14px] leading-none opacity-60 group-hover:opacity-100 transition-opacity"
			>
				]
			</span>
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
			<span className="flex items-baseline justify-between gap-3 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
				<span>{label}</span>
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
	return 'w-full bg-transparent font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text)] outline-none py-1.5 border-b border-black/[0.14] dark:border-white/[0.14] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-text)]/80 transition-colors'
}

/**
 * Section header used inside DispatchBody to split form / detail blocks.
 * Renders a mono eyebrow with a trailing hairline.
 */
export function DispatchSection({ label }: { label: string }) {
	return (
		<div className="flex items-baseline gap-3 mt-6 mb-4 first:mt-0">
			<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
				{label}
			</span>
			<span className="flex-1 h-px bg-black/[0.1] dark:bg-white/[0.12]" />
		</div>
	)
}
