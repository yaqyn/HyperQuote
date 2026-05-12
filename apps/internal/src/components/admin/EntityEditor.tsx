import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditorMode } from '../../types/admin'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { SlidePanel } from '../shared/SlidePanel'

interface EntityEditorProps {
	isOpen: boolean
	onClose: () => void
	mode: EditorMode | null
	/** Short id label shown in the editor header — omitted for create mode */
	idLabel?: string | null
	/** The form body — typography primitives + fields supplied by the volume */
	children: ReactNode
	/** Footer action row — save/cancel/delete links supplied by the volume */
	footer?: ReactNode
}

/**
 * The shared editor frame. Every volume's record view slots into this
 * wrapper, which handles the full-screen small-device panel, readable
 * header, and pinned action footer. Typography is the frame's job; the
 * child form is pure fields.
 */
export function EntityEditor({
	isOpen,
	onClose,
	mode,
	idLabel,
	children,
	footer,
}: EntityEditorProps) {
	const { t } = useTranslation('admin')

	const title =
		mode === 'create'
			? t('editor.titleCreate')
			: mode === 'edit'
				? t('editor.titleEdit', { id: idLabel ?? '' })
				: t('editor.titleView', { id: idLabel ?? '' })

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={560}
			ariaLabel={title}
			panelKey="admin-editor"
			scope="admin"
		>
			<header className="relative border-b border-black/[0.06] px-4 pb-5 pt-5 dark:border-white/[0.08] sm:px-6 lg:px-10 lg:pb-6 lg:pt-8">
				<div className="flex items-start justify-between gap-3">
					<EmployeeStatusPill className="min-w-0">
						{mode === 'create'
							? t('editor.caption')
							: (idLabel ?? t('editor.caption'))}
					</EmployeeStatusPill>

					<EmployeeActionButton
						onClick={onClose}
						tone="neutral"
						size="sm"
						leading={<X aria-hidden="true" size={14} strokeWidth={2.2} />}
						aria-label={t('actions.close')}
						className="shrink-0 px-2.5"
					>
						<span className="sr-only">{t('actions.close')}</span>
					</EmployeeActionButton>
				</div>

				<h2 className="mt-4 break-words font-[family-name:var(--font-bricolage)] text-[28px] font-semibold leading-[1.05] text-[var(--color-text)] sm:text-[30px] lg:text-[32px]">
					{title}
				</h2>
			</header>

			{/* Body ──────────────────────────────────────── */}
			<div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
				{children}
			</div>

			{/* Footer ────────────────────────────────────── */}
			{footer && (
				<footer className="flex shrink-0 flex-col gap-3 border-t border-black/[0.06] bg-[var(--color-surface)] px-4 py-4 dark:border-white/[0.08] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
					{footer}
				</footer>
			)}
		</SlidePanel>
	)
}

// ─── Shared form primitives ───────────────────────────

/**
 * A labeled block — keeps the form rhythm consistent across volumes.
 * In view mode the child is read-only; the wrapper is identical, which keeps
 * the layout from jumping between modes.
 */
export function Field({
	label,
	children,
	required,
}: {
	label: string
	children: ReactNode
	required?: boolean
}) {
	const { t } = useTranslation('admin')
	return (
		<div className="block">
			<div className="flex items-baseline justify-between gap-3 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
				<span className="min-w-0 break-words">{label}</span>
				{required && (
					<span className="shrink-0 text-[var(--color-primary)]/75">
						{t('editor.requiredMark')}
					</span>
				)}
			</div>
			<div className="mt-1.5 block">{children}</div>
		</div>
	)
}

export function Section({ title }: { title: string }) {
	return (
		<div className="mb-4 mt-7 flex items-center gap-3 first:mt-0">
			<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-muted)]">
				{title}
			</span>
			<span className="flex-1 h-px bg-[var(--color-border)]/60" />
		</div>
	)
}
