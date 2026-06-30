import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SelectionCopyToolbarProps {
	isDisabled?: boolean
	copyLabel?: string
	copiedLabel?: string
	askLabel?: string
	onAsk?: (text: string) => void
	toolbarClassName?: string
	buttonClassName?: string
	dividerClassName?: string
	minSelectionLength?: number
}

export function SelectionCopyToolbar({
	isDisabled = false,
	copyLabel = 'Copy',
	copiedLabel = 'Copied',
	askLabel = 'Ask Lyon',
	onAsk,
	toolbarClassName = 'border border-black/10 bg-white text-black shadow-[0_14px_40px_rgba(0,0,0,0.18)] dark:border-white/15 dark:bg-neutral-950 dark:text-white',
	buttonClassName = 'hover:bg-black/[0.06] dark:hover:bg-white/[0.1]',
	dividerClassName = 'bg-black/[0.12] dark:bg-white/[0.14]',
	minSelectionLength = 2,
}: SelectionCopyToolbarProps) {
	const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
	const [copied, setCopied] = useState(false)
	const [visible, setVisible] = useState(false)
	const textRef = useRef('')
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const hide = useCallback(() => {
		setVisible(false)
		setCopied(false)
	}, [])

	const handleSelection = useCallback(() => {
		if (isDisabled) {
			hide()
			textRef.current = ''
			return
		}

		const selection = document.getSelection()
		const text = selection?.toString().trim() ?? ''

		if (
			!selection ||
			selection.rangeCount === 0 ||
			text.length < minSelectionLength
		) {
			hide()
			return
		}

		const range = selection.getRangeAt(0)
		if (range.collapsed) {
			hide()
			return
		}

		const rects = Array.from(range.getClientRects()).filter(
			(rect) => rect.width > 0 && rect.height > 0,
		)
		const fallbackRect = range.getBoundingClientRect()
		const top = rects.length
			? Math.min(...rects.map((rect) => rect.top))
			: fallbackRect.top
		const bottom = rects.length
			? Math.max(...rects.map((rect) => rect.bottom))
			: fallbackRect.bottom
		const left = rects.length
			? Math.min(...rects.map((rect) => rect.left))
			: fallbackRect.left
		const right = rects.length
			? Math.max(...rects.map((rect) => rect.right))
			: fallbackRect.right
		const toolbarGap = 14
		const edgeGap = 16
		const toolbarHeight = 56
		const toolbarWidth = onAsk ? 152 : 84
		const hasRoomAbove = top >= toolbarHeight + toolbarGap + edgeGap
		const hasRoomBelow =
			window.innerHeight - bottom >= toolbarHeight + toolbarGap + edgeGap
		const useBelow = !hasRoomAbove && hasRoomBelow
		const centeredX = left + (right - left) / 2 - toolbarWidth / 2
		textRef.current = text
		setCopied(false)
		setPos({
			x: Math.min(
				Math.max(centeredX, edgeGap),
				window.innerWidth - toolbarWidth - edgeGap,
			),
			y: useBelow
				? Math.min(
						bottom + toolbarGap,
						window.innerHeight - toolbarHeight - edgeGap,
					)
				: Math.max(top - toolbarGap - toolbarHeight, edgeGap),
		})
		setVisible(true)
	}, [hide, isDisabled, minSelectionLength, onAsk])

	useEffect(() => {
		if (isDisabled) {
			hide()
			textRef.current = ''
			return
		}

		document.addEventListener('selectionchange', handleSelection)
		return () =>
			document.removeEventListener('selectionchange', handleSelection)
	}, [handleSelection, hide, isDisabled])

	useEffect(() => {
		if (!visible) return
		window.addEventListener('scroll', hide, { capture: true, passive: true })
		return () => window.removeEventListener('scroll', hide, { capture: true })
	}, [hide, visible])

	useEffect(
		() => () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		},
		[],
	)

	async function handleCopy() {
		if (!textRef.current) return
		await navigator.clipboard.writeText(textRef.current)
		setCopied(true)
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(hide, 500)
	}

	function handleAsk() {
		if (!textRef.current || !onAsk) return
		onAsk(textRef.current)
		hide()
		document.getSelection()?.removeAllRanges()
	}

	return (
		<AnimatePresence>
			{visible && pos && (
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 4 }}
					transition={{ duration: 0.15, ease: 'easeOut' }}
					className={`fixed z-[9999] flex items-center overflow-hidden rounded-xl backdrop-blur-xl ${toolbarClassName}`}
					style={{ left: pos.x, top: pos.y }}
				>
					<button
						type="button"
						onClick={handleCopy}
						className={`px-3 py-2 text-[12px] font-semibold transition-colors ${buttonClassName}`}
					>
						{copied ? copiedLabel : copyLabel}
					</button>
					{onAsk && (
						<>
							<div className={`w-px h-3 ${dividerClassName}`} />
							<button
								type="button"
								onClick={handleAsk}
								className={`px-3 py-2 text-[12px] font-semibold transition-colors ${buttonClassName}`}
							>
								{askLabel}
							</button>
						</>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	)
}
