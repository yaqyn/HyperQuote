import {
	Check,
	FileText,
	LoaderCircle,
	Save,
	Send,
	StickyNote,
	Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import {
	type QuoteRequestFlowSource,
	useQuoteRequestFlow,
} from '../../hooks/useQuoteRequestFlow'
import { useWebsiteQuoteDraftSave } from '../../hooks/useWebsiteQuoteDraftSave'

interface QuoteListActionsProps {
	blocked?: boolean
	onOpenNotes?: () => void
	onOpenSavedDrafts?: () => void
	source: QuoteRequestFlowSource
}

export function QuoteListActions({
	blocked = false,
	onOpenNotes,
	onOpenSavedDrafts,
	source,
}: QuoteListActionsProps) {
	const { t } = useTranslation('website')
	const items = useQuoteCart((state) => state.items)
	const clear = useQuoteCart((state) => state.clear)
	const openFlow = useQuoteRequestFlow((state) => state.open)
	const clearSavedDraft = useQuoteRequestFlow((state) => state.clearSavedDraft)
	const { isSaved, isSaving, save } = useWebsiteQuoteDraftSave()
	const [clearArmed, setClearArmed] = useState(false)
	const [feedback, setFeedback] = useState<string | null>(null)
	const cartEmpty = items.length === 0
	const requestEmpty = !items.some((item) => item.quantity > 0)
	const actionBlocked = blocked || requestEmpty

	useEffect(() => {
		if (!clearArmed) return
		const timer = window.setTimeout(() => setClearArmed(false), 3000)
		return () => window.clearTimeout(timer)
	}, [clearArmed])

	useEffect(() => {
		if (!feedback) return
		const timer = window.setTimeout(() => setFeedback(null), 4000)
		return () => window.clearTimeout(timer)
	}, [feedback])

	async function handleSave() {
		if (actionBlocked || isSaving) return
		setFeedback(null)
		const result = await save()
		if (result.status === 'auth_required') {
			openFlow('save', source)
			return
		}
		if (result.status === 'saved') {
			setFeedback(`${t('cart.draftSaved')} · ${result.reference}`)
			return
		}
		if (result.status === 'error') setFeedback(result.message)
	}

	function handleClear() {
		if (cartEmpty) return
		if (!clearArmed) {
			setClearArmed(true)
			setFeedback(t('cart.clearConfirm'))
			return
		}
		clear()
		clearSavedDraft()
		setClearArmed(false)
		setFeedback(null)
	}

	return (
		<div className="relative">
			{feedback && (
				<p
					role="status"
					className="absolute inset-x-0 bottom-full mb-2 truncate text-end text-[10px] font-medium text-[var(--color-text-muted)]"
				>
					{feedback}
				</p>
			)}
			<div className="flex items-center justify-end gap-1.5">
				{onOpenSavedDrafts && (
					<QuoteIconButton
						label={t('cart.viewSavedOrders')}
						onClick={onOpenSavedDrafts}
					>
						<FileText size={15} strokeWidth={1.8} />
					</QuoteIconButton>
				)}
				{onOpenNotes && (
					<QuoteIconButton label={t('cart.addNote')} onClick={onOpenNotes}>
						<StickyNote size={15} strokeWidth={1.8} />
					</QuoteIconButton>
				)}
				<QuoteIconButton
					disabled={actionBlocked || isSaving || isSaved}
					label={isSaved ? t('cart.saved') : t('cart.saveDraft')}
					onClick={handleSave}
					tone={isSaved ? 'success' : 'neutral'}
				>
					{isSaving ? (
						<LoaderCircle size={15} className="animate-spin" />
					) : isSaved ? (
						<Check size={15} strokeWidth={2} />
					) : (
						<Save size={15} strokeWidth={1.8} />
					)}
				</QuoteIconButton>
				<QuoteIconButton
					disabled={cartEmpty}
					label={clearArmed ? t('cart.clearConfirm') : t('cart.clearCart')}
					onClick={handleClear}
					tone={clearArmed ? 'danger' : 'neutral'}
				>
					{clearArmed ? (
						<Check size={15} strokeWidth={2} />
					) : (
						<Trash2 size={15} strokeWidth={1.8} />
					)}
				</QuoteIconButton>
				<button
					type="button"
					disabled={actionBlocked}
					onClick={() => openFlow('submit', source)}
					className="group inline-flex h-9 min-w-[112px] items-stretch overflow-hidden rounded-[9px] border border-[#1d4ed8] bg-[#2563eb] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_22px_-14px_rgba(37,99,235,0.8)] outline-none transition-colors hover:border-[#1e40af] hover:bg-[#1d4ed8] focus-visible:ring-3 focus-visible:ring-[#2563eb]/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 sm:min-w-[126px]"
				>
					<span className="flex min-w-0 flex-1 items-center justify-center truncate px-2.5 text-[11px] font-semibold sm:px-3 sm:text-[12px]">
						{t('cart.submit')}
					</span>
					<span className="flex w-8 shrink-0 items-center justify-center border-s border-white/20 transition-colors group-hover:bg-white/[0.06] sm:w-9">
						<Send size={14} strokeWidth={1.8} aria-hidden="true" />
					</span>
				</button>
			</div>
		</div>
	)
}

function QuoteIconButton({
	children,
	disabled = false,
	label,
	onClick,
	tone = 'neutral',
}: {
	children: React.ReactNode
	disabled?: boolean
	label: string
	onClick: () => void
	tone?: 'danger' | 'neutral' | 'success'
}) {
	const toneClass =
		tone === 'danger'
			? 'border-[#B3261E]/30 bg-[#B3261E]/8 text-[#B3261E] dark:text-[#ff766d]'
			: tone === 'success'
				? 'border-emerald-600/25 bg-emerald-600/8 text-emerald-700 dark:text-emerald-400'
				: 'border-[var(--site-rule)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/25 hover:bg-[var(--site-blue-wash)] hover:text-[var(--color-text)]'

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			aria-label={label}
			title={label}
			className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border bg-transparent outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35 ${toneClass}`}
		>
			{children}
		</button>
	)
}
