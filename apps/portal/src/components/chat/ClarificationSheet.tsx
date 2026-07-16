import {
	ArrowRight,
	Check,
	CircleMinus,
	CirclePlus,
	ListChecks,
	SlidersHorizontal,
	Store,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	type ClarificationSheetData,
	PORTAL_CHAT_RUN_COMMAND_EVENT,
	type PortalConfirmedActionPayload,
	type PortalDraftItemAction,
} from '../../lib/chat-types'

interface ClarificationSheetProps {
	data: ClarificationSheetData
}

export function ClarificationSheet({ data }: ClarificationSheetProps) {
	const isArabic = data.locale === 'ar'
	const shouldReduceMotion = useReducedMotion()
	const [answers, setAnswers] = useState<Record<string, string>>({})
	const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
	const [isLeaving, setIsLeaving] = useState(false)
	const firstNumberInputRef = useRef<HTMLInputElement | null>(null)
	const draftItemAction = selectedDraftItemAction(data, answers)
	const applicableQuestions = useMemo(
		() =>
			data.questions.filter(
				(question) =>
					!question.visibleForDraftItemActions ||
					(draftItemAction !== undefined &&
						question.visibleForDraftItemActions.includes(draftItemAction)),
			),
		[data.questions, draftItemAction],
	)
	const currentQuestion = applicableQuestions.find(
		(question) => !questionHasAnswer(question, answers, customAnswers),
	)
	const completedQuestions = applicableQuestions.filter(
		(question) =>
			question.id !== currentQuestion?.id &&
			questionHasAnswer(question, answers, customAnswers),
	)
	const canContinue = useMemo(
		() =>
			applicableQuestions.every((question) => {
				if (!question.required) return true
				const answer = answers[question.id]?.trim() ?? ''
				if (question.kind === 'number') {
					const quantity = Number.parseFloat(answer)
					return Number.isFinite(quantity) && quantity > 0
				}
				if (answer === 'custom') {
					return Boolean(customAnswers[question.id]?.trim())
				}
				return Boolean(answer)
			}),
		[answers, applicableQuestions, customAnswers],
	)
	useEffect(() => {
		if (currentQuestion?.kind !== 'number') return
		const handle = window.requestAnimationFrame(() =>
			firstNumberInputRef.current?.focus(),
		)
		return () => window.cancelAnimationFrame(handle)
	}, [currentQuestion])
	const revisitQuestion = (questionId: string) => {
		const questionIndex = applicableQuestions.findIndex(
			(question) => question.id === questionId,
		)
		if (questionIndex < 0) return
		const removedIds = new Set(
			applicableQuestions.slice(questionIndex).map((question) => question.id),
		)
		setAnswers((current) =>
			Object.fromEntries(
				Object.entries(current).filter(([id]) => !removedIds.has(id)),
			),
		)
		setCustomAnswers((current) =>
			Object.fromEntries(
				Object.entries(current).filter(([id]) => !removedIds.has(id)),
			),
		)
	}

	const submit = () => {
		if (!canContinue) return
		const action = clarificationAction(data, answers, customAnswers)
		const summary = applicableQuestions
			.map((question) => {
				const answer = answers[question.id] ?? ''
				if (question.kind === 'number') return answer
				if (answer === 'custom') return customAnswers[question.id]?.trim() ?? ''
				const option = question.options?.find(
					(candidate) => candidate.id === answer,
				)
				return isArabic ? (option?.labelAr ?? option?.label) : option?.label
			})
			.filter(Boolean)
			.join(' · ')
		setIsLeaving(true)
		window.setTimeout(
			() => {
				window.dispatchEvent(
					new CustomEvent(PORTAL_CHAT_RUN_COMMAND_EVENT, {
						detail: {
							action,
							message: isArabic
								? `التفاصيل: ${summary}`
								: `Details: ${summary}`,
							run: true,
						},
					}),
				)
			},
			shouldReduceMotion ? 0 : 140,
		)
	}

	return (
		<AnimatePresence>
			{isLeaving ? null : (
				<motion.div
					data-clarification-overlay
					className="fixed inset-0 z-[142] flex items-center justify-center bg-[var(--p-bg)]/45 p-3 backdrop-blur-[3px] sm:p-5"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
				>
					<motion.section
						data-clarification-sheet
						role="dialog"
						aria-modal="true"
						aria-labelledby="clarification-title"
						dir={isArabic ? 'rtl' : 'ltr'}
						className="flex max-h-[min(88svh,780px)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] shadow-[0_30px_100px_rgba(15,23,42,0.24)] max-sm:h-[calc(100svh-24px)]"
						initial={
							shouldReduceMotion
								? { opacity: 1 }
								: { opacity: 0, scale: 0.97, y: 16 }
						}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.98, y: 8 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { damping: 25, stiffness: 270, type: 'spring' }
						}
					>
						<header className="border-b border-[var(--p-rule)] px-4 py-4 sm:px-6 sm:py-5">
							<div className="flex items-start gap-3">
								<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--p-brand-blue)] text-[var(--p-brand-blue-contrast)] shadow-[0_10px_28px_var(--p-brand-blue-shadow)]">
									<ListChecks size={17} strokeWidth={1.8} />
								</span>
								<div className="min-w-0">
									<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--p-text-muted)]">
										{isArabic ? 'معلومات ناقصة' : 'Missing details'}
									</p>
									<h2
										id="clarification-title"
										className="mt-1 text-[17px] font-semibold text-[var(--p-text)] sm:text-[19px]"
									>
										{data.title}
									</h2>
									<p className="mt-1 max-w-[560px] text-[12px] leading-5 text-[var(--p-text-muted)]">
										{data.description}
									</p>
								</div>
							</div>
						</header>

						<form
							className="flex min-h-0 flex-1 flex-col"
							onSubmit={(event) => {
								event.preventDefault()
								submit()
							}}
						>
							<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
								<KnownFacts data={data} isArabic={isArabic} />
								<ProgressiveQuestions
									answers={answers}
									completedQuestions={completedQuestions}
									currentQuestion={currentQuestion}
									customAnswers={customAnswers}
									firstNumberInputRef={firstNumberInputRef}
									isArabic={isArabic}
									onRevisit={revisitQuestion}
									setAnswers={setAnswers}
									setCustomAnswers={setCustomAnswers}
								/>
							</div>

							<footer className="flex items-center justify-between gap-3 border-t border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-4 py-3 sm:px-6">
								<p className="hidden text-[11px] text-[var(--p-text-faint)] sm:block">
									{isArabic
										? `${applicableQuestions.length} أسئلة فقط`
										: `${applicableQuestions.length} quick question${applicableQuestions.length === 1 ? '' : 's'}`}
								</p>
								<button
									type="submit"
									disabled={!canContinue}
									className="ms-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--p-brand-blue)] px-4 text-[12px] font-semibold text-[var(--p-brand-blue-contrast)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-brand-blue)]/35 disabled:cursor-not-allowed disabled:opacity-40"
								>
									{isArabic ? data.submitLabelAr : data.submitLabel}
									<ArrowRight
										size={14}
										className={isArabic ? 'rotate-180' : undefined}
									/>
								</button>
							</footer>
						</form>
					</motion.section>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

type ClarificationQuestion = ClarificationSheetData['questions'][number]
type ClarificationOption = NonNullable<ClarificationQuestion['options']>[number]

function ProgressiveQuestions({
	answers,
	completedQuestions,
	currentQuestion,
	customAnswers,
	firstNumberInputRef,
	isArabic,
	onRevisit,
	setAnswers,
	setCustomAnswers,
}: {
	answers: Record<string, string>
	completedQuestions: ClarificationQuestion[]
	currentQuestion: ClarificationQuestion | undefined
	customAnswers: Record<string, string>
	firstNumberInputRef: { current: HTMLInputElement | null }
	isArabic: boolean
	onRevisit: (questionId: string) => void
	setAnswers: Dispatch<SetStateAction<Record<string, string>>>
	setCustomAnswers: Dispatch<SetStateAction<Record<string, string>>>
}) {
	const transformedQuestion =
		currentQuestion?.kind === 'number'
			? [...completedQuestions]
					.reverse()
					.find((question) => question.kind === 'choice')
			: undefined
	const rawTransformedOption = transformedQuestion
		? selectedQuestionOption(transformedQuestion, answers)
		: undefined
	const selectedOperationOption = completedQuestions
		.map((question) => selectedQuestionOption(question, answers))
		.find((option) => option?.draftItemAction)
	const transformedOption = rawTransformedOption
		? {
				...rawTransformedOption,
				effect:
					rawTransformedOption.effect === 'neutral'
						? selectedOperationOption?.effect
						: rawTransformedOption.effect,
			}
		: undefined
	const trailQuestions = completedQuestions.filter(
		(question) => question.id !== transformedQuestion?.id,
	)

	return (
		<div className="mt-5 grid gap-4">
			{trailQuestions.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{trailQuestions.map((question) => (
						<button
							key={question.id}
							type="button"
							onClick={() => onRevisit(question.id)}
							className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-2.5 text-[11px] text-[var(--p-text-muted)] transition hover:border-[var(--p-border-strong)] hover:text-[var(--p-text)]"
						>
							<Check size={12} />
							<span>
								{questionAnswerLabel(
									question,
									answers,
									customAnswers,
									isArabic,
								)}
							</span>
						</button>
					))}
				</div>
			) : null}

			<AnimatePresence mode="wait" initial={false}>
				{currentQuestion ? (
					<motion.fieldset
						key={currentQuestion.id}
						className="min-w-0"
						initial={{ opacity: 0, x: isArabic ? -12 : 12 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: isArabic ? 8 : -8 }}
						transition={{ duration: 0.16 }}
					>
						<legend className="flex items-center gap-2 text-[13px] font-semibold text-[var(--p-text)]">
							<span className="font-mono text-[10px] text-[var(--p-text-faint)]">
								{String(completedQuestions.length + 1).padStart(2, '0')}
							</span>
							{quantityQuestionLabel(
								currentQuestion,
								selectedOperationOption?.draftItemAction,
								isArabic,
							)}
						</legend>
						{currentQuestion.kind === 'number' ? (
							<QuantityStep
								answers={answers}
								draftItemAction={selectedOperationOption?.draftItemAction}
								inputRef={firstNumberInputRef}
								isArabic={isArabic}
								lastOption={transformedOption}
								onRevisitLast={() =>
									transformedQuestion
										? onRevisit(transformedQuestion.id)
										: undefined
								}
								question={currentQuestion}
								setAnswers={setAnswers}
							/>
						) : (
							<ChoiceStep
								answers={answers}
								customAnswers={customAnswers}
								fallbackEffect={selectedOperationOption?.effect}
								isArabic={isArabic}
								question={currentQuestion}
								setAnswers={setAnswers}
								setCustomAnswers={setCustomAnswers}
							/>
						)}
					</motion.fieldset>
				) : (
					<motion.div
						key="ready"
						className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 text-[12px] text-[var(--p-text)]"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<Check size={15} className="text-[var(--color-success)]" />
						{isArabic
							? 'التفاصيل واضحة وجاهزة.'
							: 'The change is clear and ready.'}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

function ChoiceStep({
	answers,
	customAnswers,
	fallbackEffect,
	isArabic,
	question,
	setAnswers,
	setCustomAnswers,
}: {
	answers: Record<string, string>
	customAnswers: Record<string, string>
	fallbackEffect: ClarificationOption['effect']
	isArabic: boolean
	question: ClarificationQuestion
	setAnswers: Dispatch<SetStateAction<Record<string, string>>>
	setCustomAnswers: Dispatch<SetStateAction<Record<string, string>>>
}) {
	return (
		<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
			{question.options?.map((option) => {
				const selected = answers[question.id] === option.id
				const effect =
					option.effect === 'neutral' ? fallbackEffect : option.effect
				return (
					<button
						key={option.id}
						type="button"
						aria-pressed={selected}
						onClick={() =>
							setAnswers((current) => ({
								...current,
								[question.id]: option.id,
							}))
						}
						className={optionToneClasses(effect, selected)}
					>
						<span className="flex min-w-0 items-center gap-2">
							<OptionIcon effect={effect} />
							<span className="truncate">
								{isArabic ? option.labelAr : option.label}
							</span>
						</span>
						{selected ? <Check size={14} /> : null}
					</button>
				)
			})}
			{question.allowCustom ? (
				<input
					type="text"
					aria-label={isArabic ? 'إجابة أخرى' : 'Another answer'}
					value={customAnswers[question.id] ?? ''}
					onFocus={() =>
						setAnswers((current) => ({
							...current,
							[question.id]: 'custom',
						}))
					}
					onChange={(event) => {
						const value = event.currentTarget.value
						setAnswers((current) => ({
							...current,
							[question.id]: 'custom',
						}))
						setCustomAnswers((current) => ({
							...current,
							[question.id]: value,
						}))
					}}
					placeholder={isArabic ? 'إجابة أخرى' : 'Another answer'}
					className="min-h-11 rounded-xl border border-dashed border-[var(--p-border)] bg-[var(--p-bg)] px-3 text-[12px] text-[var(--p-text)] outline-none transition focus:border-[var(--p-brand-blue)] focus:ring-2 focus:ring-[var(--p-brand-blue)]/15"
				/>
			) : null}
		</div>
	)
}

function QuantityStep({
	answers,
	draftItemAction,
	inputRef,
	isArabic,
	lastOption,
	onRevisitLast,
	question,
	setAnswers,
}: {
	answers: Record<string, string>
	draftItemAction: PortalDraftItemAction | undefined
	inputRef: { current: HTMLInputElement | null }
	isArabic: boolean
	lastOption: ClarificationOption | undefined
	onRevisitLast: () => void
	question: ClarificationQuestion
	setAnswers: Dispatch<SetStateAction<Record<string, string>>>
}) {
	useEffect(() => {
		const focus = () => {
			inputRef.current?.focus()
			inputRef.current?.select()
		}
		const frame = window.requestAnimationFrame(focus)
		const timeout = window.setTimeout(focus, 120)
		return () => {
			window.cancelAnimationFrame(frame)
			window.clearTimeout(timeout)
		}
	}, [inputRef])
	return (
		<motion.div
			layout
			className={`mt-2 overflow-hidden rounded-xl border ${quantityToneClasses(lastOption?.effect)}`}
		>
			{lastOption ? (
				<button
					type="button"
					onClick={onRevisitLast}
					className="flex min-h-10 w-full items-center gap-2 border-b border-current/15 px-3 text-start text-[11px] font-semibold"
				>
					<OptionIcon effect={lastOption.effect} />
					<span className="min-w-0 flex-1 truncate">
						{isArabic ? lastOption.labelAr : lastOption.label}
					</span>
					<span className="font-normal opacity-65">
						{isArabic ? 'غيّر' : 'Change'}
					</span>
				</button>
			) : null}
			<input
				ref={inputRef}
				type="number"
				min="0.01"
				step="any"
				inputMode="decimal"
				aria-label={quantityQuestionLabel(question, draftItemAction, isArabic)}
				value={answers[question.id] ?? ''}
				onChange={(event) => {
					const value = event.currentTarget.value
					setAnswers((current) => ({
						...current,
						[question.id]: value,
					}))
				}}
				placeholder={isArabic ? question.placeholderAr : question.placeholder}
				className="h-14 w-full bg-transparent px-3 font-mono text-[18px] font-semibold text-current outline-none placeholder:font-sans placeholder:text-[12px] placeholder:font-normal placeholder:opacity-50"
			/>
		</motion.div>
	)
}

function OptionIcon({ effect }: { effect: ClarificationOption['effect'] }) {
	if (effect === 'new_line') return <Store size={14} />
	if (effect === 'increase') return <CirclePlus size={14} />
	if (effect === 'decrease') return <CircleMinus size={14} />
	return <SlidersHorizontal size={14} />
}

function optionToneClasses(
	effect: ClarificationOption['effect'],
	selected: boolean,
): string {
	const base =
		'flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-start text-[12px] transition focus-visible:outline-none focus-visible:ring-2'
	if (effect === 'increase') {
		return `${base} border-emerald-500/35 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200 ${selected ? 'ring-2 ring-emerald-500/25' : ''}`
	}
	if (effect === 'decrease') {
		return `${base} border-red-500/35 bg-red-500/10 text-red-800 hover:bg-red-500/15 dark:text-red-200 ${selected ? 'ring-2 ring-red-500/25' : ''}`
	}
	if (effect === 'new_line') {
		return `${base} border-blue-500/35 bg-blue-500/10 text-blue-800 hover:bg-blue-500/15 dark:text-blue-200 ${selected ? 'ring-2 ring-blue-500/25' : ''}`
	}
	return `${base} border-[var(--p-rule)] bg-[var(--p-surface-subtle)] text-[var(--p-text-muted)] hover:border-[var(--p-border-strong)] hover:text-[var(--p-text)] ${selected ? 'ring-2 ring-[var(--p-brand-blue)]/25' : ''}`
}

function quantityToneClasses(effect: ClarificationOption['effect']): string {
	if (effect === 'increase') {
		return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
	}
	if (effect === 'decrease') {
		return 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200'
	}
	if (effect === 'new_line') {
		return 'border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200'
	}
	return 'border-[var(--p-brand-blue)] bg-[var(--p-brand-blue)]/8 text-[var(--p-text)]'
}

function KnownFacts({
	data,
	isArabic,
}: {
	data: ClarificationSheetData
	isArabic: boolean
}) {
	return (
		<section aria-label={isArabic ? 'المعلومات المعروفة' : 'Known facts'}>
			<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
				{isArabic ? 'فهمت بالفعل' : 'Already understood'}
			</p>
			<div className="mt-2 grid gap-px overflow-hidden rounded-xl border border-[var(--p-rule)] bg-[var(--p-rule)] sm:grid-cols-3">
				{data.knownFacts.map((fact) => (
					<div
						key={`${fact.label}:${fact.value}`}
						className="min-w-0 bg-[var(--p-surface-subtle)] px-3 py-2.5"
					>
						<p className="text-[10px] text-[var(--p-text-faint)]">
							{isArabic ? fact.labelAr : fact.label}
						</p>
						<p className="mt-0.5 break-words text-[12px] font-semibold text-[var(--p-text)]">
							{isArabic ? (fact.valueAr ?? fact.value) : fact.value}
						</p>
					</div>
				))}
			</div>
		</section>
	)
}

function questionHasAnswer(
	question: ClarificationQuestion,
	answers: Record<string, string>,
	customAnswers: Record<string, string>,
): boolean {
	if (!question.required) return true
	const answer = answers[question.id]?.trim() ?? ''
	if (question.kind === 'number') {
		const quantity = Number.parseFloat(answer)
		return Number.isFinite(quantity) && quantity > 0
	}
	if (answer === 'custom') return Boolean(customAnswers[question.id]?.trim())
	return Boolean(answer)
}

function selectedQuestionOption(
	question: ClarificationQuestion,
	answers: Record<string, string>,
): ClarificationOption | undefined {
	return question.options?.find((option) => option.id === answers[question.id])
}

function selectedDraftItemAction(
	data: ClarificationSheetData,
	answers: Record<string, string>,
): PortalDraftItemAction | undefined {
	if (data.action.draftItemAction) return data.action.draftItemAction
	for (const question of data.questions) {
		const action = selectedQuestionOption(question, answers)?.draftItemAction
		if (action) return action
	}
	return undefined
}

function questionAnswerLabel(
	question: ClarificationQuestion,
	answers: Record<string, string>,
	customAnswers: Record<string, string>,
	isArabic: boolean,
): string {
	const answer = answers[question.id]
	if (answer === 'custom') return customAnswers[question.id] ?? ''
	if (question.kind === 'number') return answer ?? ''
	const option = selectedQuestionOption(question, answers)
	return isArabic
		? (option?.labelAr ?? option?.label ?? '')
		: (option?.label ?? '')
}

function quantityQuestionLabel(
	question: ClarificationQuestion,
	action: PortalDraftItemAction | undefined,
	isArabic: boolean,
): string {
	if (question.kind !== 'number' || !action) {
		return isArabic ? question.labelAr : question.label
	}
	if (action === 'increase_quantity') {
		return isArabic ? 'تضيف كمية قد إيه؟' : 'How much should I add?'
	}
	if (action === 'decrease_quantity') {
		return isArabic ? 'تخصم كمية قد إيه؟' : 'How much should I deduct?'
	}
	return isArabic
		? 'الكمية النهائية كام؟'
		: 'What should the final quantity be?'
}

function clarificationAction(
	data: ClarificationSheetData,
	answers: Record<string, string>,
	customAnswers: Record<string, string>,
): PortalConfirmedActionPayload {
	const quantityAnswer = Number.parseFloat(answers.quantity ?? '')
	let action: PortalConfirmedActionPayload = { ...data.action }
	const queryValues = new Map<string, string>()
	for (const question of data.questions) {
		if (question.kind !== 'choice') continue
		const answer = answers[question.id]
		if (answer === 'custom') {
			const custom = customAnswers[question.id]?.trim()
			if (custom) queryValues.set(question.id, custom)
			continue
		}
		const queryValue = question.options?.find(
			(option) => option.id === answer,
		)?.queryValue
		if (queryValue) queryValues.set(question.id, queryValue)
		const option = question.options?.find(
			(candidate) => candidate.id === answer,
		)
		if (option?.draftItemAction) {
			action = { ...action, draftItemAction: option.draftItemAction }
		}
		if (option?.itemQuery) {
			action = {
				...action,
				itemQuery: option.itemQuery,
				previousQuantity: option.previousQuantity,
			}
		}
	}
	if (Number.isFinite(quantityAnswer) && quantityAnswer > 0) {
		action = { ...action, quantity: quantityAnswer }
	}
	if (data.mode === 'draft_edit') return action

	const draftLines = action.draftLines?.map((line) => {
		if (
			!data.pendingChoiceId ||
			line.pendingChoiceId !== data.pendingChoiceId
		) {
			return line
		}
		const quantity =
			Number.isFinite(quantityAnswer) && quantityAnswer > 0
				? quantityAnswer
				: line.quantity
		const refinements = [...queryValues.values()]
		const query = [
			...(queryValues.has('family') ? [] : [line.query]),
			...refinements,
		]
			.filter(Boolean)
			.join(' ')
			.trim()
		return {
			...line,
			query,
			quantity,
			rawText: `${quantity} ${query}`.trim(),
		}
	})
	return {
		...action,
		draftLines,
		searchQuery:
			draftLines?.find((line) => line.pendingChoiceId === data.pendingChoiceId)
				?.query ?? data.action.searchQuery,
	}
}
