import {
	AlertTriangle,
	Copy,
	Eye,
	FilePenLine,
	Package,
	Plus,
	Send,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

export type SavedDraftsPanelTheme = 'portal' | 'website'
export type SavedDraftsPanelState = 'loading' | 'ready' | 'auth' | 'error'
export type SavedDraftsPanelActionMode = 'submit' | 'add'

export interface SavedQuoteDraftItemView {
	id?: string
	productId?: string
	name: string
	nameAr?: string
	quantity: number
	unitOfMeasure: string
	unitOfMeasureAr?: string
	imageUrl?: string | null
	notes?: string | null
}

export interface SavedQuoteDraftView {
	id: string
	name?: string | null
	reference?: string | null
	date: string
	itemCount: number
	notes?: string | null
	items: SavedQuoteDraftItemView[]
}

export interface SavedDraftsPanelLabels {
	title: string
	help: string
	loading: string
	error: string
	retry: string
	authTitle: string
	authAction: string
	emptyTitle: string
	emptyBody: string
	view: string
	add: string
	submit: string
	submitting: string
	confirmAddTitle: string
	confirmAddBody: (count: number) => string
	cancel: string
	confirm: string
	notes: string
	itemNotes: string
	copyNotes: string
	emptyOrder: string
	lastEdited: (date: string) => string
	defaultDraftName: string
}

interface SavedDraftsPanelViewProps<TDraft extends SavedQuoteDraftView> {
	actionMode?: SavedDraftsPanelActionMode
	className?: string
	drafts: TDraft[]
	footerError?: string | null
	headerAction?: ReactNode
	isArabic: boolean
	labels: SavedDraftsPanelLabels
	onAddDraft?: (draft: TDraft) => void
	onAuthRequired?: () => void
	onNotesCopied?: () => void
	onRetry?: () => void
	onSubmitDraft?: (draft: TDraft) => void
	state: SavedDraftsPanelState
	submittingDraftId?: string | null
	theme?: SavedDraftsPanelTheme
}

const SAVED_DRAFTS_EASE = cubicBezier(0.22, 1, 0.36, 1)

const THEME = {
	portal: {
		root: 'bg-[var(--p-bg)] text-[var(--p-text)]',
		border: 'border-[var(--p-border)]',
		divide: 'divide-[var(--p-border)]',
		strongBorder: 'border-[var(--p-border-strong)]',
		card: 'bg-[var(--p-card)]',
		surface: 'bg-[var(--p-surface)]',
		panel: 'bg-[var(--p-bg)]',
		hover: 'hover:bg-[var(--p-hover)]',
		text: 'text-[var(--p-text)]',
		hoverText: 'hover:text-[var(--p-text)]',
		muted: 'text-[var(--p-text-muted)]',
		faint: 'text-[var(--p-text-faint)]',
		accent: 'text-[var(--p-accent)]',
		accentBg: 'bg-[var(--p-accent)]',
		accentContrast: 'text-[var(--p-accent-contrast)]',
		accentDim: 'bg-[var(--p-accent-dim)]',
		error: 'text-[var(--p-error)]',
	},
	website: {
		root: 'bg-[var(--color-base)] text-[var(--color-text)]',
		border: 'border-[var(--color-border)]',
		divide: 'divide-[var(--color-border)]',
		strongBorder: 'border-[var(--color-border)]',
		card: 'bg-[var(--color-base)]',
		surface: 'bg-[var(--color-surface)]',
		panel: 'bg-[var(--color-base)]',
		hover: 'hover:bg-[var(--color-surface)]',
		text: 'text-[var(--color-text)]',
		hoverText: 'hover:text-[var(--color-text)]',
		muted: 'text-[var(--color-text-muted)]',
		faint: 'text-[var(--color-text-subtle)]',
		accent: 'text-[var(--color-primary)]',
		accentBg: 'bg-[var(--color-primary)]',
		accentContrast: 'text-white',
		accentDim: 'bg-[var(--color-primary)]/10',
		error: 'text-[var(--color-error)]',
	},
} satisfies Record<SavedDraftsPanelTheme, Record<string, string>>

function savedDraftRevealMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4 },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.14,
			ease: SAVED_DRAFTS_EASE,
		},
	}
}

function useDelayedVisibility(visible: boolean, delayMs = 160) {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!visible) {
			setReady(false)
			return
		}
		const timeout = window.setTimeout(() => setReady(true), delayMs)
		return () => window.clearTimeout(timeout)
	}, [delayMs, visible])

	return visible && ready
}

export function formatSavedDraftDate(value: string, isArabic: boolean) {
	return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(value))
}

export function SavedDraftsPanelView<TDraft extends SavedQuoteDraftView>({
	actionMode = 'submit',
	className = '',
	drafts,
	footerError,
	headerAction,
	isArabic,
	labels,
	onAddDraft,
	onAuthRequired,
	onNotesCopied,
	onRetry,
	onSubmitDraft,
	state,
	submittingDraftId,
	theme = 'portal',
}: SavedDraftsPanelViewProps<TDraft>) {
	const styles = THEME[theme]
	const shouldReduceMotion = useReducedMotion()
	const showLoading = useDelayedVisibility(state === 'loading')
	const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
	const [confirmAddDraftId, setConfirmAddDraftId] = useState<string | null>(
		null,
	)
	const selectedDraft = useMemo(
		() => drafts.find((draft) => draft.id === selectedDraftId),
		[drafts, selectedDraftId],
	)

	return (
		<section className={`flex min-h-0 flex-col ${styles.root} ${className}`}>
			<header
				className={`shrink-0 border-b ${styles.border} px-4 py-3 md:px-5`}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className={`text-[15px] font-semibold ${styles.text}`}>
							{labels.title}
						</p>
						<p className={`mt-1 text-[12px] leading-5 ${styles.muted}`}>
							{labels.help}
						</p>
					</div>
					{headerAction && <div className="shrink-0">{headerAction}</div>}
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-5">
				{state === 'loading' ? (
					<SavedDraftsLoadingState
						label={labels.loading}
						styles={styles}
						visible={showLoading}
					/>
				) : state === 'auth' ? (
					<SavedDraftsAuthState
						labels={labels}
						onAuthRequired={onAuthRequired}
						styles={styles}
					/>
				) : state === 'error' ? (
					<SavedDraftsErrorState
						labels={labels}
						onRetry={onRetry}
						styles={styles}
					/>
				) : drafts.length === 0 ? (
					<SavedDraftsEmptyState labels={labels} styles={styles} />
				) : (
					<div className="space-y-2">
						{drafts.map((draft) => {
							const title =
								draft.name ?? draft.reference ?? labels.defaultDraftName
							const dateLabel = formatSavedDraftDate(draft.date, isArabic)
							const isSelected = selectedDraftId === draft.id
							const isSubmitting = submittingDraftId === draft.id

							return (
								<motion.article
									key={draft.id}
									{...savedDraftRevealMotion(shouldReduceMotion)}
									className={`overflow-hidden rounded-xl border ${styles.border} ${styles.card}`}
								>
									<div className="p-3">
										<div className="flex min-w-0 items-start gap-3">
											<span
												className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.accentDim} ${styles.accent}`}
											>
												<FilePenLine size={15} strokeWidth={1.7} />
											</span>
											<div className="min-w-0 flex-1">
												<p
													className={`truncate text-[13px] font-semibold ${styles.text}`}
												>
													{title}
												</p>
												<p className={`mt-1 text-[11px] ${styles.muted}`}>
													{labels.lastEdited(dateLabel)}
												</p>
											</div>
											<span
												className={`shrink-0 rounded-full border ${styles.border} px-2 py-1 font-mono text-[10px] tabular-nums ${styles.muted}`}
											>
												{draft.itemCount}
											</span>
										</div>
										<div className="mt-3 grid grid-cols-2 gap-2">
											<motion.button
												type="button"
												onClick={() => {
													setConfirmAddDraftId(null)
													setSelectedDraftId(isSelected ? null : draft.id)
												}}
												className={`flex h-9 min-w-0 items-center justify-center gap-2 rounded-xl border ${styles.border} px-3 text-[12px] font-semibold ${styles.text} transition-colors ${styles.hover}`}
												whileTap={
													shouldReduceMotion ? undefined : { scale: 0.98 }
												}
											>
												<Eye size={14} strokeWidth={1.7} />
												<span className="truncate">{labels.view}</span>
											</motion.button>
											<SavedDraftActionButton
												actionMode={actionMode}
												disabled={
													draft.items.length === 0 ||
													(actionMode === 'submit' && isSubmitting)
												}
												isSubmitting={isSubmitting}
												labels={labels}
												onClick={() => {
													if (actionMode === 'add') {
														setSelectedDraftId(draft.id)
														setConfirmAddDraftId(draft.id)
														return
													}
													onSubmitDraft?.(draft)
												}}
												shouldReduceMotion={shouldReduceMotion}
												styles={styles}
											/>
										</div>
									</div>
									<AnimatePresence initial={false}>
										{isSelected && selectedDraft && (
											<DraftPreview
												draft={selectedDraft}
												isArabic={isArabic}
												labels={labels}
												onNotesCopied={onNotesCopied}
												styles={styles}
											/>
										)}
									</AnimatePresence>
									<AnimatePresence initial={false}>
										{actionMode === 'add' && confirmAddDraftId === draft.id && (
											<motion.div
												key="add-confirm"
												className={`overflow-hidden border-t ${styles.border} ${styles.panel} p-3`}
												{...savedDraftRevealMotion(shouldReduceMotion)}
											>
												<p
													className={`text-[12px] font-semibold ${styles.text}`}
												>
													{labels.confirmAddTitle}
												</p>
												<p
													className={`mt-1 text-[11px] leading-4 ${styles.muted}`}
												>
													{labels.confirmAddBody(draft.items.length)}
												</p>
												<div className="mt-2 grid grid-cols-2 gap-2">
													<button
														type="button"
														onClick={() => setConfirmAddDraftId(null)}
														className={`flex h-8 items-center justify-center rounded-lg border ${styles.border} text-[12px] font-semibold ${styles.text} transition-colors ${styles.hover}`}
													>
														{labels.cancel}
													</button>
													<button
														type="button"
														onClick={() => {
															onAddDraft?.(draft)
															setConfirmAddDraftId(null)
														}}
														className={`flex h-8 items-center justify-center rounded-lg ${styles.accentBg} text-[12px] font-semibold ${styles.accentContrast} transition-opacity hover:opacity-90`}
													>
														{labels.confirm}
													</button>
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</motion.article>
							)
						})}
					</div>
				)}
			</div>

			{footerError && (
				<p
					className={`shrink-0 border-t ${styles.border} px-4 py-3 text-[12px] font-medium ${styles.error} md:px-5`}
				>
					{footerError}
				</p>
			)}
		</section>
	)
}

function SavedDraftActionButton({
	actionMode,
	disabled,
	isSubmitting,
	labels,
	onClick,
	shouldReduceMotion,
	styles,
}: {
	actionMode: SavedDraftsPanelActionMode
	disabled: boolean
	isSubmitting: boolean
	labels: SavedDraftsPanelLabels
	onClick: () => void
	shouldReduceMotion: boolean | null
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`flex h-9 min-w-0 items-center justify-center gap-2 rounded-xl ${styles.accentBg} px-3 text-[12px] font-semibold ${styles.accentContrast} transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50`}
			whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
		>
			{actionMode === 'add' ? (
				<Plus size={14} strokeWidth={1.7} />
			) : (
				<Send size={14} strokeWidth={1.7} />
			)}
			<span className="truncate">
				{actionMode === 'add'
					? labels.add
					: isSubmitting
						? labels.submitting
						: labels.submit}
			</span>
		</motion.button>
	)
}

function DraftPreview({
	draft,
	isArabic,
	labels,
	onNotesCopied,
	styles,
}: {
	draft: SavedQuoteDraftView
	isArabic: boolean
	labels: SavedDraftsPanelLabels
	onNotesCopied?: () => void
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	const shouldReduceMotion = useReducedMotion()
	const notes = draft.notes?.trim()

	return (
		<motion.div
			key="draft-preview"
			className={`overflow-hidden border-t ${styles.border} ${styles.panel} px-3 py-2`}
			{...savedDraftRevealMotion(shouldReduceMotion)}
		>
			{notes && (
				<DraftNotes
					label={labels.notes}
					notes={notes}
					onNotesCopied={onNotesCopied}
					styles={styles}
					className="mb-2"
					copyLabel={labels.copyNotes}
				/>
			)}
			{draft.items.length === 0 ? (
				<p className={`py-3 text-center text-[12px] ${styles.muted}`}>
					{labels.emptyOrder}
				</p>
			) : (
				<div className={`divide-y ${styles.divide}`}>
					{draft.items.map((item, index) => {
						const itemName = isArabic && item.nameAr ? item.nameAr : item.name
						const unitLabel =
							isArabic && item.unitOfMeasureAr
								? item.unitOfMeasureAr
								: item.unitOfMeasure
						const itemKey =
							item.id ??
							item.productId ??
							`${item.name}:${item.quantity}:${item.unitOfMeasure}:${index}`
						const itemNotes = item.notes?.trim()

						return (
							<div key={`${draft.id}-${itemKey}`} className="py-2">
								<div className="flex min-w-0 items-center gap-2">
									<OrderItemImage imageUrl={item.imageUrl} styles={styles} />
									<div className="min-w-0 flex-1">
										<p
											className={`truncate text-[12px] font-medium ${styles.text}`}
										>
											{itemName}
										</p>
										<p className={`mt-0.5 text-[11px] ${styles.muted}`}>
											{item.quantity.toLocaleString(
												isArabic ? 'ar-EG' : 'en-EG',
											)}{' '}
											{unitLabel}
										</p>
									</div>
								</div>
								{itemNotes && (
									<DraftNotes
										label={labels.itemNotes}
										notes={itemNotes}
										onNotesCopied={onNotesCopied}
										styles={styles}
										className="mt-2 ms-11"
										copyLabel={labels.copyNotes}
									/>
								)}
							</div>
						)
					})}
				</div>
			)}
		</motion.div>
	)
}

function SavedDraftsLoadingState({
	label,
	styles,
	visible,
}: {
	label: string
	styles: (typeof THEME)[SavedDraftsPanelTheme]
	visible: boolean
}) {
	const shouldReduceMotion = useReducedMotion()

	return (
		<motion.div
			key="saved-drafts-loading"
			className="flex min-h-48 items-center justify-center"
			{...savedDraftRevealMotion(shouldReduceMotion)}
		>
			{visible && (
				<div
					className={`flex items-center gap-2 text-[12px] font-medium ${styles.muted}`}
				>
					<span
						className={`h-4 w-4 animate-spin rounded-full border-2 ${styles.border} border-t-current ${styles.accent}`}
					/>
					<span>{label}</span>
				</div>
			)}
		</motion.div>
	)
}

function SavedDraftsAuthState({
	labels,
	onAuthRequired,
	styles,
}: {
	labels: SavedDraftsPanelLabels
	onAuthRequired?: () => void
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	return (
		<div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
			<FilePenLine size={28} strokeWidth={1.5} className={styles.faint} />
			<p className={`text-[13px] font-medium ${styles.text}`}>
				{labels.authTitle}
			</p>
			{onAuthRequired && (
				<button
					type="button"
					onClick={onAuthRequired}
					className={`h-9 rounded-xl ${styles.accentBg} px-4 text-[12px] font-semibold ${styles.accentContrast} transition-opacity hover:opacity-90`}
				>
					{labels.authAction}
				</button>
			)}
		</div>
	)
}

function SavedDraftsErrorState({
	labels,
	onRetry,
	styles,
}: {
	labels: SavedDraftsPanelLabels
	onRetry?: () => void
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	return (
		<div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
			<AlertTriangle size={24} strokeWidth={1.7} className={styles.faint} />
			<p className={`text-[13px] ${styles.muted}`}>{labels.error}</p>
			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className={`h-9 rounded-xl border ${styles.border} px-3 text-[12px] font-semibold ${styles.text} transition-colors ${styles.hover}`}
				>
					{labels.retry}
				</button>
			)}
		</div>
	)
}

function SavedDraftsEmptyState({
	labels,
	styles,
}: {
	labels: SavedDraftsPanelLabels
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	return (
		<div className="flex min-h-48 flex-col items-center justify-center text-center">
			<FilePenLine
				size={28}
				strokeWidth={1.5}
				className={`mb-3 ${styles.faint}`}
			/>
			<p className={`text-[14px] font-semibold ${styles.text}`}>
				{labels.emptyTitle}
			</p>
			<p className={`mt-1 text-[12px] ${styles.muted}`}>{labels.emptyBody}</p>
		</div>
	)
}

function DraftNotes({
	className = '',
	copyLabel,
	label,
	notes,
	onNotesCopied,
	styles,
}: {
	className?: string
	copyLabel: string
	label: string
	notes: string
	onNotesCopied?: () => void
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	async function copyNotes() {
		await navigator.clipboard.writeText(notes)
		onNotesCopied?.()
	}

	return (
		<div
			className={`rounded-xl border ${styles.border} ${styles.card} p-2.5 ${className}`}
		>
			<div className="mb-1.5 flex items-center justify-between gap-2">
				<p className={`text-[11px] font-semibold ${styles.muted}`}>{label}</p>
				<button
					type="button"
					onClick={copyNotes}
					className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.muted} transition-colors ${styles.hover} ${styles.hoverText}`}
					aria-label={copyLabel}
				>
					<Copy size={13} strokeWidth={1.7} />
				</button>
			</div>
			<p className={`whitespace-pre-wrap text-[12px] leading-5 ${styles.text}`}>
				{notes}
			</p>
		</div>
	)
}

function OrderItemImage({
	imageUrl,
	styles,
}: {
	imageUrl?: string | null
	styles: (typeof THEME)[SavedDraftsPanelTheme]
}) {
	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt=""
				loading="lazy"
				decoding="async"
				className={`h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-inset ${styles.surface} ${styles.border}`}
			/>
		)
	}

	return (
		<span
			className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${styles.surface} ${styles.faint} ${styles.border}`}
		>
			<Package size={14} strokeWidth={1.7} />
		</span>
	)
}
