/**
 * Draggable divider between list and map.
 * Left panel: 300-600px resizable. Right panel: flex-1.
 * RTL-aware drag.
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
  defaultLeftWidth = 380,
  minLeftWidth = 280,
  maxLeftWidth = 560,
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
        const delta = isRTL ? startX - ev.clientX : ev.clientX - startX
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
    <div ref={containerRef} className="flex min-h-0 flex-1">
      {/* Left */}
      <div className="shrink-0 overflow-y-auto" style={{ width: leftWidth }}>
        {left}
      </div>

      {/* Drag handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        className="w-px shrink-0 cursor-col-resize bg-black/[0.06] transition-colors hover:bg-[#2563EB]/40 dark:bg-white/[0.06] dark:hover:bg-[#2563EB]/40"
        onMouseDown={onMouseDown}
      />

      {/* Right */}
      <div className="min-w-0 flex-1 overflow-hidden">{right}</div>
    </div>
  )
}
