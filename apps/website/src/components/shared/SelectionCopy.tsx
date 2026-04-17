import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatWidget } from '../../hooks/useChatWidget'

/**
 * Floating toolbar that appears when text is selected anywhere in the app.
 * Copy + Ask Lyon — minimal pill near the selection with smooth animations.
 */
export function SelectionCopy() {
	const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
	const [copied, setCopied] = useState(false)
	const [visible, setVisible] = useState(false)
	const textRef = useRef('')
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const openWithMessage = useChatWidget((s) => s.openWithMessage)

	const handleSelection = useCallback(() => {
		const sel = document.getSelection()
		const text = sel?.toString().trim() ?? ''

		if (text.length < 2) {
			setVisible(false)
			return
		}

		textRef.current = text
		setCopied(false)

		const range = sel?.getRangeAt(0)
		if (!range) return

		const rect = range.getBoundingClientRect()
		setPos({
			x: rect.left + rect.width / 2,
			y: rect.top - 8,
		})
		setVisible(true)
	}, [])

	useEffect(() => {
		document.addEventListener('selectionchange', handleSelection)
		return () =>
			document.removeEventListener('selectionchange', handleSelection)
	}, [handleSelection])

	useEffect(() => {
		if (!visible) return
		const hide = () => setVisible(false)
		window.addEventListener('scroll', hide, { capture: true, passive: true })
		return () => window.removeEventListener('scroll', hide, { capture: true })
	}, [visible])

	async function handleCopy() {
		if (!textRef.current) return
		await navigator.clipboard.writeText(textRef.current)
		setCopied(true)
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(() => {
			setCopied(false)
			setVisible(false)
		}, 500)
	}

	function handleAskLyon() {
		if (!textRef.current) return
		openWithMessage(textRef.current)
		setVisible(false)
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
					className="fixed z-[9999] flex items-center rounded-lg bg-black shadow-lg -translate-x-1/2 -translate-y-full overflow-hidden"
					style={{ left: pos.x, top: pos.y }}
				>
					<button
						type="button"
						onClick={handleCopy}
						className="px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-white/[0.1] transition-colors"
					>
						{copied ? 'Copied' : 'Copy'}
					</button>
					<div className="w-px h-3 bg-white/[0.12]" />
					<button
						type="button"
						onClick={handleAskLyon}
						className="px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-white/[0.1] transition-colors"
					>
						Ask Lyon
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
