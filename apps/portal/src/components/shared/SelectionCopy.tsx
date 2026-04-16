import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/**
 * Floating "Copy" pill that appears when text is selected.
 * Minimal — no icons, smooth fade in/out.
 */
export function SelectionCopy() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)
  const textRef = useRef('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

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
    return () => document.removeEventListener('selectionchange', handleSelection)
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
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setCopied(false)
      setVisible(false)
    }, 500)
  }

  return (
    <AnimatePresence>
      {visible && pos && (
        <motion.button
          type="button"
          onClick={handleCopy}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-[9999] rounded-md bg-white text-black px-2.5 py-1.5 text-[10px] font-medium shadow-lg -translate-x-1/2 -translate-y-full"
          style={{ left: pos.x, top: pos.y }}
        >
          {copied ? 'Copied' : 'Copy'}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
