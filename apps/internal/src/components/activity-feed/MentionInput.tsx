import { useCallback, useEffect, useRef, useState } from 'react'
import { searchMentionTargets } from '../../lib/server/activity-feed'
import { keyboardScopeStore } from '../../stores/keyboard-scope'
import { Button } from '../ui/Button'
import type { MentionTarget } from './types'

interface MentionInputProps {
	onSubmit: (body: string, isInternal: boolean) => void
	isSubmitting?: boolean
}

export function MentionInput({
	onSubmit,
	isSubmitting = false,
}: MentionInputProps) {
	const [body, setBody] = useState('')
	const [isInternal, setIsInternal] = useState(true)
	const [mentionQuery, setMentionQuery] = useState<string | null>(null)
	const [mentionResults, setMentionResults] = useState<MentionTarget[]>([])
	const [mentionIndex, setMentionIndex] = useState(0)
	const [showMention, setShowMention] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const mentionStartRef = useRef<number>(-1)

	// Debounced mention search
	useEffect(() => {
		if (mentionQuery === null || mentionQuery.length < 1) {
			setShowMention(false)
			setMentionResults([])
			return
		}

		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(async () => {
			const results = await searchMentionTargets({
				data: { query: mentionQuery },
			})
			setMentionResults(results)
			setMentionIndex(0)
			setShowMention(results.length > 0)
		}, 200)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [mentionQuery])

	const handleInput = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const value = e.target.value
			setBody(value)

			const cursorPos = e.target.selectionStart ?? value.length
			// Check if we're in an @mention context
			const textBeforeCursor = value.slice(0, cursorPos)
			const atIndex = textBeforeCursor.lastIndexOf('@')

			if (atIndex >= 0) {
				const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' '
				// @ must be at start or after whitespace
				if (atIndex === 0 || /\s/.test(charBefore)) {
					const query = textBeforeCursor.slice(atIndex + 1)
					// No space in query means we're still typing the mention
					if (!query.includes(' ')) {
						mentionStartRef.current = atIndex
						setMentionQuery(query)
						return
					}
				}
			}

			setMentionQuery(null)
			setShowMention(false)
		},
		[],
	)

	const insertMention = useCallback(
		(target: MentionTarget) => {
			const start = mentionStartRef.current
			if (start < 0) return

			const before = body.slice(0, start)
			const after = body.slice(
				textareaRef.current?.selectionStart ?? body.length,
			)
			const mention = `@[${target.name}](${target.id}) `
			const newBody = before + mention + after

			setBody(newBody)
			setShowMention(false)
			setMentionQuery(null)
			mentionStartRef.current = -1

			// Restore focus to textarea
			requestAnimationFrame(() => {
				const ta = textareaRef.current
				if (ta) {
					ta.focus()
					const pos = before.length + mention.length
					ta.setSelectionRange(pos, pos)
				}
			})
		},
		[body],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Mention popover navigation
			if (showMention && mentionResults.length > 0) {
				if (e.key === 'ArrowDown') {
					e.preventDefault()
					setMentionIndex((i) => (i + 1) % mentionResults.length)
					return
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault()
					setMentionIndex(
						(i) => (i - 1 + mentionResults.length) % mentionResults.length,
					)
					return
				}
				if (e.key === 'Enter' || e.key === 'Tab') {
					e.preventDefault()
					insertMention(mentionResults[mentionIndex])
					return
				}
				if (e.key === 'Escape') {
					e.preventDefault()
					setShowMention(false)
					setMentionQuery(null)
					return
				}
			}

			// Ctrl+Enter to submit
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				e.preventDefault()
				if (body.trim()) {
					onSubmit(body.trim(), isInternal)
					setBody('')
				}
			}
		},
		[
			showMention,
			mentionResults,
			mentionIndex,
			insertMention,
			body,
			isInternal,
			onSubmit,
		],
	)

	const handleSubmit = useCallback(() => {
		if (body.trim()) {
			onSubmit(body.trim(), isInternal)
			setBody('')
		}
	}, [body, isInternal, onSubmit])

	const handleFocus = useCallback(() => {
		keyboardScopeStore.send({ type: 'focusInput' })
	}, [])

	const handleBlur = useCallback(() => {
		// Delay to allow mention click
		setTimeout(() => {
			if (!showMention) {
				keyboardScopeStore.send({ type: 'blurInput' })
			}
		}, 150)
	}, [showMention])

	return (
		<div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
			{/* Internal / External toggle */}
			<div className="flex gap-1">
				<button
					type="button"
					className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
						isInternal
							? 'bg-[var(--color-primary)] text-white'
							: 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
					}`}
					onClick={() => setIsInternal(true)}
				>
					Internal
				</button>
				<button
					type="button"
					className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
						!isInternal
							? 'bg-[var(--color-border)] text-[var(--color-text)]'
							: 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
					}`}
					onClick={() => setIsInternal(false)}
				>
					External
				</button>
			</div>

			{/* Textarea with mention popover */}
			<div className="relative">
				<textarea
					ref={textareaRef}
					value={body}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					onBlur={handleBlur}
					placeholder="Write a comment... Use @ to mention"
					rows={2}
					className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
				/>

				{/* Mention autocomplete popover */}
				{showMention && mentionResults.length > 0 && (
					<div className="absolute bottom-full mb-1 start-0 z-50 w-64 rounded-lg border border-[var(--color-border)] bg-white/90 shadow-md dark:bg-black/90">
						{mentionResults.map((target, i) => (
							<button
								key={target.id}
								type="button"
								className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors ${
									i === mentionIndex
										? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
										: 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'
								}`}
								onMouseDown={(e) => {
									e.preventDefault() // prevent blur
									insertMention(target)
								}}
							>
								<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold">
									{target.name.charAt(0)}
								</div>
								<div className="flex flex-col">
									<span className="font-medium">{target.name}</span>
									<span className="text-xs text-[var(--color-text-muted)]">
										{target.role}
									</span>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Submit button */}
			<div className="flex justify-end">
				<Button
					variant="primary"
					isDisabled={!body.trim() || isSubmitting}
					onPress={handleSubmit}
				>
					{isSubmitting ? 'Posting...' : 'Post'}
				</Button>
			</div>
		</div>
	)
}
