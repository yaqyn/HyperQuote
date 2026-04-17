import { useTranslation } from 'react-i18next'
import type { EditorMode } from '../../types/admin'
import { SlidePanel } from '../shared/SlidePanel'

interface EntityEditorProps {
	isOpen: boolean
	onClose: () => void
	mode: EditorMode | null
	/** Short id label shown in the editor header — omitted for create mode */
	idLabel?: string | null
	/** The form body — typography primitives + fields supplied by the volume */
	children: React.ReactNode
	/** Footer action row — save/cancel/delete links supplied by the volume */
	footer?: React.ReactNode
}

/**
 * The shared editor frame. Every volume's record view slots into this
 * wrapper, which handles the slide-in behavior, the editorial header
 * (entry ornament + title + close), and the sticky footer where
 * action links render. Typography is the frame's job; the child form
 * is pure fields.
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
			{/* Header — dismissal is handled by the outer module X via the
          admin store's overlay-close ladder, so no inner X here. */}
			<header className="relative px-10 pt-10 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
					{mode === 'create'
						? t('editor.caption')
						: (idLabel ?? t('editor.caption'))}
				</p>

				<h2
					className="mt-3 font-[family-name:var(--font-fraunces)] text-[34px] leading-[1.05] text-[var(--color-text)]"
					style={{
						fontFeatureSettings: '"ss01" on',
						fontVariationSettings: '"opsz" 144, "wght" 420, "SOFT" 40',
					}}
				>
					{title}
				</h2>
			</header>

			{/* Body ──────────────────────────────────────── */}
			<div className="flex-1 overflow-y-auto px-10 py-8">{children}</div>

			{/* Footer ────────────────────────────────────── */}
			{footer && (
				<footer className="border-t border-black/[0.06] dark:border-white/[0.08] px-10 py-5 flex items-center justify-between gap-4">
					{footer}
				</footer>
			)}
		</SlidePanel>
	)
}

// ─── Shared form primitives ───────────────────────────

/**
 * A labeled block — keeps the form rhythm consistent across volumes.
 * The label is a mono eyebrow; the field sits below it with a hairline.
 * In view mode the child is read-only; the wrapper is identical, which
 * keeps the layout from jumping between modes.
 */
export function Field({
	label,
	children,
	required,
}: {
	label: string
	children: React.ReactNode
	required?: boolean
}) {
	const { t } = useTranslation('admin')
	return (
		<span className="block">
			<span className="flex items-baseline justify-between gap-3 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
				<span>{label}</span>
				{required && (
					<span className="text-[var(--color-primary)]/60">
						{t('editor.requiredMark')}
					</span>
				)}
			</span>
			<span className="block mt-1.5">{children}</span>
		</span>
	)
}

/**
 * Section header between groups of fields. Fraunces italic + hairline —
 * feels like a chapter mark in a typeset document.
 */
export function Section({ title }: { title: string }) {
	return (
		<div className="mt-8 mb-5 flex items-baseline gap-4 first:mt-0">
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[13px] text-[var(--color-text-muted)]"
				style={{ fontVariationSettings: '"opsz" 14, "wght" 500' }}
			>
				§
			</span>
			<span className="font-[family-name:var(--font-inter)] text-[11px] uppercase tracking-[0.2em] font-medium text-[var(--color-text-muted)]">
				{title}
			</span>
			<span className="flex-1 h-px bg-[var(--color-border)]/60" />
		</div>
	)
}
