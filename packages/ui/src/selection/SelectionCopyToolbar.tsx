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
	toolbarClassName = 'bg-black',
	buttonClassName = 'text-white hover:bg-white/[0.1]',
	dividerClassName = 'bg-white/[0.12]',
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

		const rect = range.getBoundingClientRect()
		textRef.current = text
		setCopied(false)
		setPos({
			x: rect.left + rect.width / 2,
			y: rect.top - 8,
		})
		setVisible(true)
	}, [hide, isDisabled, minSelectionLength])

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
					className={`fixed z-[9999] flex items-center rounded-lg shadow-lg -translate-x-1/2 -translate-y-full overflow-hidden ${toolbarClassName}`}
					style={{ left: pos.x, top: pos.y }}
				>
					<button
						type="button"
						onClick={handleCopy}
						className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${buttonClassName}`}
					>
						{copied ? copiedLabel : copyLabel}
					</button>
					{onAsk && (
						<>
							<div className={`w-px h-3 ${dividerClassName}`} />
							<button
								type="button"
								onClick={handleAsk}
								className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${buttonClassName}`}
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
