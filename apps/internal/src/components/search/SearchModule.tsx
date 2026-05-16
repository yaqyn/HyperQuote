import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Database, Table2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import type { JsonValue } from '../../lib/db/db'
import type {
	SearchExecutiveBrief,
	SearchModuleSummary,
	SearchPreviewField,
	SearchResponse,
	SearchRow,
	SearchSummaryModuleId,
	SearchTableSummary,
	SearchTableView,
} from '../../lib/search-registry'
import {
	getSearchExecutiveBrief,
	getSearchModuleSummary,
	listSearchTable,
	searchInternalDb,
} from '../../lib/server/search'
import { useAIChatStore } from '../../stores/ai-chat'
import { SlidePanel } from '../shared/SlidePanel'

const searchFrameFadeSeconds = 0.12
const unlockIntroHoldMs = 1080
const unlockRevealMs = 140
const unlockSlotIds = [
	'unlock-slot-1',
	'unlock-slot-2',
	'unlock-slot-3',
	'unlock-slot-4',
	'unlock-slot-5',
	'unlock-slot-6',
] as const
let hasUnlockedSearch = false

function normalizeUnlockValue(value: string) {
	return value.replace(/[^a-z]/gi, '').slice(0, 6)
}

function isEditableEventTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false
	if (target.isContentEditable) return true
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	)
}

type DetailPanelStyle = CSSProperties & {
	'--detail-accent': string
}

export function SearchModule() {
	const inputRef = useRef<HTMLInputElement | null>(null)
	const unlockValueRef = useRef('')
	const reduceMotion = useReducedMotion()
	const [query, setQuery] = useState('')
	const [unlockValue, setUnlockValue] = useState('')
	const [isUnlocked, setIsUnlocked] = useState(() => hasUnlockedSearch)
	const [unlockStage, setUnlockStage] = useState<
		'title' | 'input' | 'unlocking'
	>('title')
	const debouncedQuery = useDebouncedValue(query, 120)
	const [activeTableId, setActiveTableId] = useState<string | null>(null)
	const [activeSummaryId, setActiveSummaryId] =
		useState<SearchSummaryModuleId | null>(null)
	const [selectedRow, setSelectedRow] = useState<SearchRow | null>(null)
	const [isFrameExpanded, setIsFrameExpanded] = useState(false)
	const [isSearchFrameVisible, setIsSearchFrameVisible] = useState(true)
	const [pendingFrameExpanded, setPendingFrameExpanded] = useState<
		boolean | null
	>(null)
	const searchQuery = useQuery({
		queryKey: ['internal-search', debouncedQuery],
		queryFn: () => searchInternalDb({ data: { query: debouncedQuery } }),
		enabled: isUnlocked,
		placeholderData: keepPreviousData,
		staleTime: 5_000,
	})

	const executiveBriefQuery = useQuery({
		queryKey: ['internal-search-executive-brief'],
		queryFn: () => getSearchExecutiveBrief(),
		enabled: isUnlocked,
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	})

	const tableQuery = useQuery({
		queryKey: ['internal-search-table', activeTableId],
		queryFn: () => listSearchTable({ data: { tableId: activeTableId ?? '' } }),
		enabled: isUnlocked && activeTableId !== null,
		placeholderData: keepPreviousData,
		staleTime: 5_000,
	})

	const moduleSummaryQuery = useQuery({
		queryKey: ['internal-search-module-summary', activeSummaryId],
		queryFn: () =>
			getSearchModuleSummary({ data: { moduleId: activeSummaryId ?? '' } }),
		enabled: isUnlocked && activeSummaryId !== null,
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	})

	useEffect(() => {
		const id = window.setTimeout(() => {
			if (isUnlocked) {
				inputRef.current?.focus()
			}
		}, 80)
		return () => window.clearTimeout(id)
	}, [isUnlocked])

	const trimmedQuery = query.trim()
	const hasContent =
		trimmedQuery.length > 0 ||
		activeTableId !== null ||
		activeSummaryId !== null
	const searchData = searchQuery.data

	const handleQueryChange = useCallback(
		(value: string) => {
			setQuery(value)
			if (activeTableId) setActiveTableId(null)
			if (activeSummaryId) setActiveSummaryId(null)
		},
		[activeSummaryId, activeTableId],
	)

	const setSearchInputRef = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node
			if (!node || !isUnlocked) return
			window.requestAnimationFrame(() => node.focus())
		},
		[isUnlocked],
	)

	const switchSearchFrame = useCallback(
		(expanded: boolean) => {
			if (reduceMotion) {
				setIsFrameExpanded(expanded)
				setIsSearchFrameVisible(true)
				setPendingFrameExpanded(null)
				return
			}

			if (isFrameExpanded === expanded) {
				setIsSearchFrameVisible(true)
				setPendingFrameExpanded(null)
				return
			}

			setPendingFrameExpanded(expanded)
			setIsSearchFrameVisible(false)
		},
		[isFrameExpanded, reduceMotion],
	)

	const handleUnlockValueChange = useCallback(
		(value: string) => {
			if (unlockStage === 'unlocking') return
			const nextValue = normalizeUnlockValue(value)
			unlockValueRef.current = nextValue
			setUnlockValue(nextValue)
			if (nextValue.length === 6) {
				setUnlockStage('unlocking')
			}
		},
		[unlockStage],
	)

	useEffect(() => {
		if (hasContent) {
			switchSearchFrame(true)
			return
		}

		if (!isFrameExpanded) {
			setPendingFrameExpanded(null)
			setIsSearchFrameVisible(true)
			return
		}

		if (reduceMotion) {
			switchSearchFrame(false)
		}
	}, [hasContent, isFrameExpanded, reduceMotion, switchSearchFrame])

	useEffect(() => {
		if (isUnlocked) return
		if (reduceMotion) {
			setUnlockStage('input')
			return
		}
		const id = window.setTimeout(() => {
			setUnlockStage('input')
		}, unlockIntroHoldMs)
		return () => window.clearTimeout(id)
	}, [isUnlocked, reduceMotion])

	useEffect(() => {
		if (isUnlocked || unlockStage === 'unlocking') return

		function handleWindowKeyDown(event: KeyboardEvent) {
			if (
				event.defaultPrevented ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey
			)
				return

			if (event.key === 'Backspace') {
				if (unlockStage === 'title' && unlockValueRef.current.length === 0)
					return
				event.preventDefault()
				if (unlockStage === 'title') setUnlockStage('input')
				handleUnlockValueChange(unlockValueRef.current.slice(0, -1))
				return
			}

			if (event.key.length !== 1 || !/^[a-z]$/i.test(event.key)) return
			event.preventDefault()
			if (unlockStage === 'title') setUnlockStage('input')
			handleUnlockValueChange(`${unlockValueRef.current}${event.key}`)
		}

		function handleWindowPaste(event: ClipboardEvent) {
			const pastedText = event.clipboardData?.getData('text') ?? ''
			if (!/[a-z]/i.test(pastedText)) return
			event.preventDefault()
			if (unlockStage === 'title') setUnlockStage('input')
			handleUnlockValueChange(`${unlockValueRef.current}${pastedText}`)
		}

		window.addEventListener('keydown', handleWindowKeyDown, true)
		window.addEventListener('paste', handleWindowPaste, true)
		return () => {
			window.removeEventListener('keydown', handleWindowKeyDown, true)
			window.removeEventListener('paste', handleWindowPaste, true)
		}
	}, [handleUnlockValueChange, isUnlocked, unlockStage])

	useEffect(() => {
		if (unlockStage !== 'unlocking') return
		const id = window.setTimeout(
			() => {
				hasUnlockedSearch = true
				setIsUnlocked(true)
			},
			reduceMotion ? 0 : unlockRevealMs,
		)
		return () => window.clearTimeout(id)
	}, [reduceMotion, unlockStage])

	useEffect(() => {
		if (!isUnlocked || selectedRow) return

		function handleWindowKeyDown(event: KeyboardEvent) {
			if (
				event.defaultPrevented ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey ||
				isEditableEventTarget(event.target)
			) {
				return
			}

			if (event.key === 'Backspace') {
				event.preventDefault()
				handleQueryChange(query.slice(0, -1))
				return
			}

			if (event.key.length !== 1) return
			event.preventDefault()
			handleQueryChange(`${query}${event.key}`)
		}

		function handleWindowPaste(event: ClipboardEvent) {
			if (isEditableEventTarget(event.target)) return
			const pastedText = event.clipboardData?.getData('text') ?? ''
			if (!pastedText) return
			event.preventDefault()
			handleQueryChange(`${query}${pastedText}`)
		}

		window.addEventListener('keydown', handleWindowKeyDown, true)
		window.addEventListener('paste', handleWindowPaste, true)
		return () => {
			window.removeEventListener('keydown', handleWindowKeyDown, true)
			window.removeEventListener('paste', handleWindowPaste, true)
		}
	}, [handleQueryChange, isUnlocked, query, selectedRow])

	function openTable(table: SearchTableSummary) {
		setActiveTableId(table.tableId)
		setActiveSummaryId(null)
		setSelectedRow(null)
	}

	function openSummary(moduleId: SearchSummaryModuleId) {
		setActiveSummaryId(moduleId)
		setActiveTableId(null)
		setQuery('')
		setSelectedRow(null)
	}

	function openRow(row: SearchRow) {
		setSelectedRow(row)
	}

	function askLyon() {
		const prompt = trimmedQuery
		if (!prompt) return
		const ai = useAIChatStore.getState()
		ai.open()
		ai.setDraft(`Search internal database for: ${prompt}`)
		ai.send()
	}

	return (
		<div className="relative h-full min-h-0 overflow-hidden bg-[#010101] text-white">
			<AnimatePresence initial={false} mode="wait">
				{isUnlocked ? (
					<motion.div
						key="search-console"
						className={`relative z-10 flex h-full min-h-0 flex-col ${
							isFrameExpanded ? '' : 'items-center justify-center'
						}`}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{
							duration: reduceMotion ? 0 : 0.2,
							ease: 'easeOut',
						}}
					>
						<motion.div
							className={
								isFrameExpanded
									? 'mx-auto w-full max-w-3xl px-4 pt-[min(7vh,56px)] sm:px-6 lg:px-8'
									: 'w-[min(480px,calc(100%-40px))] px-0'
							}
							initial={false}
							animate={{ opacity: isSearchFrameVisible ? 1 : 0 }}
							transition={{
								duration: reduceMotion ? 0 : searchFrameFadeSeconds,
								ease: 'easeOut',
							}}
							onAnimationComplete={() => {
								if (isSearchFrameVisible || pendingFrameExpanded === null)
									return
								setIsFrameExpanded(pendingFrameExpanded)
								setPendingFrameExpanded(null)
								setIsSearchFrameVisible(true)
							}}
						>
							<SearchBox
								inputRef={setSearchInputRef}
								query={query}
								onQueryChange={handleQueryChange}
								onSubmit={askLyon}
							/>
						</motion.div>

						{!isFrameExpanded && (
							<SearchExecutiveBriefPanel
								brief={executiveBriefQuery.data}
								isLoading={executiveBriefQuery.isLoading}
								reduceMotion={!!reduceMotion}
								onOpenSummary={openSummary}
							/>
						)}

						<AnimatePresence
							initial={false}
							mode="wait"
							onExitComplete={() => {
								if (!hasContent && !reduceMotion) switchSearchFrame(false)
							}}
						>
							{isFrameExpanded && hasContent && (
								<motion.div
									key={
										activeTableId
											? `table-${activeTableId}`
											: activeSummaryId
												? `summary-${activeSummaryId}`
												: 'search-results'
									}
									className="mx-auto mt-5 min-h-0 w-full max-w-3xl flex-1 px-4 pb-6 sm:px-6 lg:px-8"
									initial={reduceMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{
										duration: reduceMotion ? 0 : 0.16,
										ease: 'easeOut',
									}}
								>
									{activeTableId ? (
										<TableView
											table={tableQuery.data}
											isLoading={tableQuery.isLoading}
											isError={tableQuery.isError}
											onBack={() => {
												setActiveTableId(null)
											}}
											onOpenRow={openRow}
										/>
									) : activeSummaryId ? (
										<ModuleSummaryView
											summary={moduleSummaryQuery.data}
											isLoading={moduleSummaryQuery.isLoading}
											isError={moduleSummaryQuery.isError}
											onBack={() => setActiveSummaryId(null)}
											onOpenRow={openRow}
										/>
									) : (
										<SearchResults
											query={trimmedQuery}
											data={searchData}
											isLoading={searchQuery.isLoading}
											isPlaceholderData={searchQuery.isPlaceholderData}
											isError={searchQuery.isError}
											onOpenTable={openTable}
											onOpenRow={openRow}
										/>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				) : (
					<ExecutiveUnlockIntro
						key="executive-unlock"
						value={unlockValue}
						stage={unlockStage}
						reduceMotion={!!reduceMotion}
					/>
				)}
			</AnimatePresence>

			<RowDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
		</div>
	)
}

function ExecutiveUnlockIntro({
	value,
	stage,
	reduceMotion,
}: {
	value: string
	stage: 'title' | 'input' | 'unlocking'
	reduceMotion: boolean
}) {
	return (
		<motion.div
			className="relative z-10 flex h-full min-h-0 items-center justify-center px-6 text-white"
			initial={reduceMotion ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
			transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
		>
			<AnimatePresence mode="wait">
				{stage === 'title' ? (
					<motion.h1
						key="executive-title"
						className="text-center font-[family-name:var(--font-bricolage)] text-[clamp(32px,5vw,64px)] font-semibold leading-none text-white/94 [text-shadow:0_0_24px_rgba(255,255,255,0.16)]"
						initial={reduceMotion ? false : { opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
						transition={{ duration: reduceMotion ? 0 : 0.32, ease: 'easeOut' }}
					>
						Welcome back, executive.
					</motion.h1>
				) : (
					<motion.form
						key="executive-password"
						onSubmit={(event) => {
							event.preventDefault()
						}}
						className="flex items-center justify-center"
						initial={reduceMotion ? false : { opacity: 0, y: 5 }}
						animate={{
							opacity: stage === 'unlocking' ? 0 : 1,
							y: stage === 'unlocking' ? -3 : 0,
							filter: stage === 'unlocking' ? 'blur(4px)' : 'blur(0px)',
						}}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
						transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
					>
						<div
							aria-hidden="true"
							className="flex min-w-[9ch] items-center justify-center gap-[0.34em] font-[family-name:var(--font-plex-mono)] text-[18px] font-medium sm:text-[20px]"
						>
							{unlockSlotIds.map((slotId, index) => (
								<span
									key={slotId}
									className={`inline-block w-[1ch] text-center transition-[color,text-shadow] duration-150 ${
										index < value.length
											? 'text-white/82 [text-shadow:0_0_14px_rgba(255,255,255,0.18)]'
											: 'text-white/14'
									}`}
								>
									•
								</span>
							))}
						</div>
						<span className="sr-only">
							Executive access key, {value.length} of 6 letters entered.
						</span>
					</motion.form>
				)}
			</AnimatePresence>
		</motion.div>
	)
}

function SearchBox({
	inputRef,
	query,
	onQueryChange,
	onSubmit,
}: {
	inputRef: (node: HTMLInputElement | null) => void
	query: string
	onQueryChange: (value: string) => void
	onSubmit: () => void
}) {
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault()
				onSubmit()
			}}
			className="relative"
		>
			<div className="flex h-11 items-center justify-center border-b border-white/[0.16] bg-transparent px-0 transition-colors duration-200 focus-within:border-white/45 sm:h-12">
				<input
					ref={inputRef}
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="َQuery"
					dir="ltr"
					className={`min-w-0 bg-transparent text-center font-[family-name:var(--font-archivo)] text-[14px] font-medium text-white/90 outline-none transition-[width] duration-200 placeholder:font-normal placeholder:italic placeholder:text-white/24 focus:w-[24ch] sm:text-[15px] sm:focus:w-[30ch] ${
						query ? 'w-[24ch] sm:w-[30ch]' : 'w-[8ch]'
					}`}
					style={{
						caretColor: 'transparent',
						letterSpacing: '0',
						lineHeight: 1,
					}}
					aria-label="Search internal database"
				/>
			</div>
		</form>
	)
}

function SearchExecutiveBriefPanel({
	brief,
	isLoading,
	reduceMotion,
	onOpenSummary,
}: {
	brief: SearchExecutiveBrief | undefined
	isLoading: boolean
	reduceMotion: boolean
	onOpenSummary: (moduleId: SearchSummaryModuleId) => void
}) {
	if (!brief && !isLoading) return null

	return (
		<motion.div
			className="mt-8 w-[min(760px,calc(100%-40px))]"
			initial={reduceMotion ? false : { opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
		>
			{brief ? (
				<div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
					{brief.modules.map((summary, index) => (
						<SearchExecutiveModuleCard
							key={summary.moduleId}
							summary={summary}
							index={index}
							onOpenSummary={onOpenSummary}
						/>
					))}
				</div>
			) : (
				<div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
					{unlockSlotIds.map((slotId) => (
						<div
							key={slotId}
							className="h-[104px] border border-white/[0.05] bg-white/[0.012] p-3"
						>
							<div className="h-2 w-16 bg-white/[0.08]" />
							<div className="mt-3 h-3 w-36 bg-white/[0.06]" />
							<div className="mt-2 h-2 w-48 bg-white/[0.04]" />
						</div>
					))}
				</div>
			)}
		</motion.div>
	)
}

function SearchExecutiveModuleCard({
	summary,
	index,
	onOpenSummary,
}: {
	summary: SearchModuleSummary
	index: number
	onOpenSummary: (moduleId: SearchSummaryModuleId) => void
}) {
	return (
		<button
			type="button"
			onClick={() => onOpenSummary(summary.moduleId)}
			className="group min-h-[104px] w-full border border-white/[0.05] bg-white/[0.012] p-3 text-start outline-none transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-white/[0.12] hover:bg-white/[0.024] focus-visible:border-white/[0.2] focus-visible:bg-white/[0.03]"
		>
			<span className="flex items-center justify-between gap-3">
				<span className="truncate font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-white/31">
					{summary.moduleLabel}
				</span>
				<span className="font-[family-name:var(--font-plex-mono)] text-[9px] tabular-nums text-white/16">
					{String(index + 1).padStart(2, '0')}
				</span>
			</span>
			<span className="mt-4 grid grid-cols-3 gap-2">
				{summary.points.map((point) => (
					<span key={point.id} className="min-w-0">
						<span className="block font-[family-name:var(--font-plex-mono)] text-[18px] font-semibold leading-none tabular-nums text-white/82">
							{point.count.toLocaleString('en-EG')}
						</span>
						<span className="mt-1.5 block truncate font-[family-name:var(--font-archivo)] text-[10px] leading-[12px] text-white/33">
							{point.label}
						</span>
					</span>
				))}
			</span>
		</button>
	)
}

function ModuleSummaryView({
	summary,
	isLoading,
	isError,
	onBack,
	onOpenRow,
}: {
	summary: SearchModuleSummary | undefined
	isLoading: boolean
	isError: boolean
	onBack: () => void
	onOpenRow: (row: SearchRow) => void
}) {
	if (isLoading && !summary) return <StatusLine>Loading summary</StatusLine>
	if (isError || !summary)
		return <StatusLine tone="danger">Summary did not load</StatusLine>

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex h-9 items-center gap-2 px-1 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-white/48 outline-none transition-colors hover:text-white/82 focus-visible:text-white"
				>
					<ArrowLeft size={15} strokeWidth={1.8} />
					Back
				</button>
				<div className="min-w-0 text-end">
					<p className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-white">
						{summary.moduleLabel}
					</p>
					<p className="mt-0.5 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/32">
						summary
					</p>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto py-4">
				<div className="grid gap-2 sm:grid-cols-3">
					{summary.points.map((point) => (
						<div
							key={point.id}
							className="border border-white/[0.055] bg-white/[0.016] px-3 py-3"
						>
							<p className="font-[family-name:var(--font-plex-mono)] text-[22px] font-semibold leading-none tabular-nums text-white/86">
								{point.count.toLocaleString('en-EG')}
							</p>
							<p className="mt-2 truncate font-[family-name:var(--font-archivo)] text-[11px] font-semibold text-white/42">
								{point.label}
							</p>
						</div>
					))}
				</div>

				<div className="mt-6 flex flex-col gap-7">
					{summary.sections.map((section) => (
						<section key={section.id}>
							<GroupLabel>
								{section.label}{' '}
								<span className="text-white/25">{section.count}</span>
							</GroupLabel>
							{section.rows.length > 0 ? (
								<div className="mt-3 flex flex-col gap-1.5">
									{section.rows.map((entry) => (
										<SummaryRowButton
											key={entry.id}
											entry={entry}
											onOpen={() => onOpenRow(entry.row)}
										/>
									))}
								</div>
							) : (
								<p className="mt-3 border border-white/[0.045] bg-white/[0.012] px-3 py-3 font-[family-name:var(--font-archivo)] text-[12px] text-white/34">
									No records in this bucket.
								</p>
							)}
						</section>
					))}
				</div>
			</div>
		</div>
	)
}

function SummaryRowButton({
	entry,
	onOpen,
}: {
	entry: SearchModuleSummary['sections'][number]['rows'][number]
	onOpen: () => void
}) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group grid min-h-[58px] grid-cols-[minmax(0,1fr)] gap-3 border border-white/[0.055] bg-black/[0.16] px-3.5 py-3 text-start outline-none transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-white/[0.16] hover:bg-white/[0.045] focus-visible:border-white/[0.24] focus-visible:bg-white/[0.055] sm:grid-cols-[minmax(0,1fr)_auto]"
		>
			<span className="min-w-0">
				<span className="block truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-white">
					{entry.title}
				</span>
				<PreviewFields fields={entry.preview} />
			</span>
			<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/30 sm:self-end sm:text-end">
				{entry.tableLabel}
			</span>
		</button>
	)
}

function SearchResults({
	query,
	data,
	isLoading,
	isPlaceholderData,
	isError,
	onOpenTable,
	onOpenRow,
}: {
	query: string
	data: SearchResponse | undefined
	isLoading: boolean
	isPlaceholderData: boolean
	isError: boolean
	onOpenTable: (table: SearchTableSummary) => void
	onOpenRow: (row: SearchRow) => void
}) {
	if (isLoading && !data) return <StatusLine>Searching records</StatusLine>
	if (isError) return <StatusLine tone="danger">Search did not load</StatusLine>

	const tableMatches = data?.tableMatches ?? []
	const groups = data?.results ?? []
	const hasMatches = tableMatches.length > 0 || groups.length > 0

	if (!hasMatches && query) {
		if (isPlaceholderData) return null
		return <StatusLine>No records found</StatusLine>
	}

	return (
		<div className="h-full min-h-0 overflow-y-auto pb-10">
			{tableMatches.length > 0 && (
				<section className="mb-8">
					<GroupLabel>Tables</GroupLabel>
					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						{tableMatches.map((table) => (
							<TableMatchButton
								key={table.tableId}
								table={table}
								onOpen={() => onOpenTable(table)}
							/>
						))}
					</div>
				</section>
			)}

			<div className="flex flex-col gap-8">
				{groups.map((group) => (
					<section key={group.tableId}>
						<GroupLabel>
							{group.label}{' '}
							<span className="text-white/25">{group.rows.length}</span>
						</GroupLabel>
						<div className="mt-3 flex flex-col gap-1.5">
							{group.rows.map((row) => (
								<ResultButton
									key={`${row.tableId}-${row.rowId}`}
									row={row}
									trailing={
										row.matchedFields.length > 0
											? row.matchedFields.slice(0, 3).join(', ')
											: undefined
									}
									onOpen={() => onOpenRow(row)}
								/>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	)
}

function TableView({
	table,
	isLoading,
	isError,
	onBack,
	onOpenRow,
}: {
	table: SearchTableView | undefined
	isLoading: boolean
	isError: boolean
	onBack: () => void
	onOpenRow: (row: SearchRow) => void
}) {
	if (isLoading) return <StatusLine>Loading table</StatusLine>
	if (isError || !table)
		return <StatusLine tone="danger">Table did not load</StatusLine>

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex h-9 items-center gap-2 px-1 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-white/48 outline-none transition-colors hover:text-white/82 focus-visible:text-white"
				>
					<ArrowLeft size={15} strokeWidth={1.8} />
					Back
				</button>
				<div className="min-w-0 text-end">
					<p className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-white">
						{table.label}
					</p>
					<p className="mt-0.5 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/32">
						{table.rowCount} rows
					</p>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto py-4">
				<div className="flex flex-col gap-1.5">
					{table.rows.map((row) => (
						<ResultButton
							key={`${row.tableId}-${row.rowId}`}
							row={row}
							onOpen={() => onOpenRow(row)}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

function TableMatchButton({
	table,
	onOpen,
}: {
	table: SearchTableSummary
	onOpen: () => void
}) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group flex min-h-14 items-center gap-3 border border-white/[0.06] bg-black/[0.14] px-3 text-start outline-none transition-[border-color,background-color] hover:border-white/[0.15] hover:bg-white/[0.045] focus-visible:border-white/[0.22] focus-visible:bg-white/[0.055]"
		>
			<span
				className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/[0.09] text-white/62"
				style={{ color: table.accent }}
			>
				<Table2 aria-hidden="true" size={17} strokeWidth={1.8} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-white">
					{table.label}
				</span>
				<span className="mt-1 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/32">
					{table.rowCount} rows
				</span>
			</span>
		</button>
	)
}

function ResultButton({
	row,
	trailing,
	onOpen,
}: {
	row: SearchRow
	trailing?: string
	onOpen: () => void
}) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group grid min-h-[64px] grid-cols-[minmax(0,1fr)] gap-3 border border-white/[0.055] bg-black/[0.16] px-3.5 py-3 text-start outline-none transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-white/[0.16] hover:bg-white/[0.045] focus-visible:border-white/[0.24] focus-visible:bg-white/[0.055] sm:grid-cols-[minmax(0,1fr)_auto]"
		>
			<span className="min-w-0">
				<span className="flex min-w-0 items-center gap-2">
					<span
						aria-hidden="true"
						className="h-2 w-2 shrink-0 rounded-full"
						style={{ backgroundColor: row.accent }}
					/>
					<span className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-white">
						{row.title}
					</span>
				</span>
				<PreviewFields fields={row.preview} />
			</span>
			<span className="flex items-end justify-between gap-3 sm:block sm:text-end">
				<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/30">
					{row.tableLabel}
				</span>
				{trailing && (
					<span className="mt-2 block max-w-[220px] truncate font-[family-name:var(--font-archivo)] text-[11px] italic text-white/36">
						{trailing}
					</span>
				)}
			</span>
		</button>
	)
}

function PreviewFields({ fields }: { fields: SearchPreviewField[] }) {
	const visible = fields.filter((field) => field.value !== null).slice(0, 4)
	if (visible.length === 0) return null
	return (
		<span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
			{visible.map((field) => (
				<span
					key={`${field.label}-${String(field.value)}`}
					className="min-w-0 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/34"
				>
					<span className="text-white/22">{field.label}</span>{' '}
					<span className="text-white/52">{String(field.value)}</span>
				</span>
			))}
		</span>
	)
}

function RowDetailPanel({
	row,
	onClose,
}: {
	row: SearchRow | null
	onClose: () => void
}) {
	const detailStyle: DetailPanelStyle | undefined = row
		? {
				'--detail-accent': row.accent,
			}
		: undefined

	return (
		<SlidePanel
			isOpen={row !== null}
			onClose={onClose}
			maxWidth={560}
			ariaLabel={row ? `${row.title} details` : 'Search result details'}
			panelKey="search-result-detail"
			scope="search"
			mobileTitle={row?.title}
			mobileSubtitle={row?.tableLabel}
			tone="dark"
		>
			{row && (
				<div
					className="flex h-full min-h-0 flex-col text-white"
					style={detailStyle}
				>
					<header className="hidden shrink-0 border-b border-white/[0.075] px-7 py-6 lg:block">
						<div className="flex items-start gap-4">
							<span className="mt-1 h-16 w-px shrink-0 bg-[var(--detail-accent)]" />
							<div className="min-w-0 flex-1">
								<div className="flex min-w-0 items-center gap-2">
									<Database
										aria-hidden="true"
										size={15}
										strokeWidth={1.8}
										className="shrink-0 text-white/34"
									/>
									<p className="truncate font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/36">
										{row.tableLabel}
									</p>
								</div>
								<h2 className="mt-2 font-[family-name:var(--font-bricolage)] text-[22px] font-semibold leading-tight text-white/92">
									{row.title}
								</h2>
								<p className="mt-2 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/28">
									record {row.rowId}
								</p>
							</div>
						</div>
					</header>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-7 lg:py-6">
						<PreviewStrip row={row} />
						<div className="mt-5 divide-y divide-white/[0.055] border-y border-white/[0.075]">
							{row.details.map((field) => (
								<DetailField
									key={`${row.tableId}-${row.rowId}-${field.label}`}
									field={field}
								/>
							))}
						</div>
					</div>
				</div>
			)}
		</SlidePanel>
	)
}

function PreviewStrip({ row }: { row: SearchRow }) {
	const fields = row.preview.filter((field) => field.value !== null).slice(0, 4)
	if (fields.length === 0) return null

	return (
		<div className="grid grid-cols-2 gap-2">
			{fields.map((field) => (
				<div
					key={`${field.label}-${String(field.value)}`}
					className="min-w-0 border border-white/[0.065] bg-white/[0.025] px-3 py-2"
				>
					<p className="truncate font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-white/28">
						{field.label}
					</p>
					<p className="mt-1 truncate font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-white/76">
						{String(field.value)}
					</p>
				</div>
			))}
		</div>
	)
}

function DetailField({
	field,
}: {
	field: { label: string; value: JsonValue }
}) {
	return (
		<div className="grid gap-2 py-3 sm:grid-cols-[142px_minmax(0,1fr)] sm:gap-4">
			<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/31">
				{field.label}
			</p>
			<div className="min-w-0">{renderJsonValue(field.value)}</div>
		</div>
	)
}

function renderJsonValue(value: JsonValue): ReactNode {
	if (value === null) {
		return <span className="text-[13px] text-white/28">null</span>
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return (
			<span className="break-words font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-white/78">
				{String(value)}
			</span>
		)
	}
	if (typeof value === 'boolean') {
		return (
			<span className="font-[family-name:var(--font-plex-mono)] text-[12px] uppercase text-white/72">
				{value ? 'true' : 'false'}
			</span>
		)
	}
	return (
		<pre className="max-h-72 overflow-auto border border-white/[0.07] bg-white/[0.035] p-3 font-[family-name:var(--font-plex-mono)] text-[11px] leading-relaxed text-white/54">
			{JSON.stringify(value, null, 2)}
		</pre>
	)
}

function GroupLabel({ children }: { children: ReactNode }) {
	return (
		<h2 className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-white/38">
			{children}
		</h2>
	)
}

function StatusLine({
	children,
	tone = 'muted',
}: {
	children: ReactNode
	tone?: 'muted' | 'danger'
}) {
	return (
		<div className="flex h-full min-h-[180px] items-center justify-center text-center">
			<p
				className={`font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase ${
					tone === 'danger' ? 'text-red-300/80' : 'text-white/34'
				}`}
			>
				{children}
			</p>
		</div>
	)
}

function useDebouncedValue(value: string, delayMs: number): string {
	const [debounced, setDebounced] = useState(value)
	useEffect(() => {
		const id = window.setTimeout(() => setDebounced(value), delayMs)
		return () => window.clearTimeout(id)
	}, [value, delayMs])
	return debounced
}
