import { useEffect } from 'react'

/**
 * Snaps text selection to word boundaries outside of text inputs.
 * Selecting a single letter automatically expands to the full word.
 */
export function useWordSelection() {
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>

    function handleSelectionChange() {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        const sel = document.getSelection()
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return

        const node = sel.anchorNode
        if (!node?.parentElement) return

        // Skip text inputs — they need character-level precision
        const isInput = node.parentElement.closest('input, textarea, [contenteditable]')
        if (isInput) return

        sel.modify('extend', 'backward', 'word')
        sel.modify('extend', 'forward', 'word')
      }, 80)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      clearTimeout(debounce)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])
}
