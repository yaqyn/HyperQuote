/**
 * Resizable split pane with pure CSS resize handle.
 * Left panel: 300-600px resizable. Right panel: flex-1.
 * Mouse drag on handle to resize.
 */
import { useState, useCallback, useRef, type ReactNode } from 'react'

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 400,
  minLeftWidth = 300,
  maxLeftWidth = 600,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true

      const startX = e.clientX
      const startWidth = leftWidth

      function onMouseMove(ev: MouseEvent) {
        if (!dragging.current) return
        const isRTL =
          containerRef.current &&
          getComputedStyle(containerRef.current).direction === 'rtl'
        const delta = isRTL
          ? startX - ev.clientX
          : ev.clientX - startX
        const next = Math.min(maxLeftWidth, Math.max(minLeftWidth, startWidth + delta))
        setLeftWidth(next)
      }

      function onMouseUp() {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [leftWidth, minLeftWidth, maxLeftWidth],
  )

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-1">
      {/* Left panel */}
      <div className="flex-shrink-0 overflow-y-auto" style={{ width: leftWidth }}>
        {left}
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        className="w-1 cursor-col-resize bg-black/10 hover:bg-[#2563EB]/40 transition-colors dark:bg-white/10 dark:hover:bg-[#2563EB]/40 flex-shrink-0"
        onMouseDown={onMouseDown}
      />

      {/* Right panel */}
      <div className="flex-1 min-w-0 overflow-hidden">{right}</div>
    </div>
  )
}
