import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'

interface SignaturePadProps {
  label: string
  onSign: (dataUrl: string) => void
  width?: number
  height?: number
}

/**
 * Clean canvas signature capture with clear/undo.
 * Bordered capture area. Touch-optimized for warehouse tablets.
 * Returns PNG data URL on stroke completion.
 */
export function SignaturePad({
  label,
  onSign,
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width * 2
    canvas.height = height * 2
    ctx.scale(2, 2)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000'
  }, [width, height])

  const getPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      }
    },
    [],
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const pos = getPosition(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      setIsDrawing(true)
      setHasContent(true)
    },
    [getPosition],
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return
      e.preventDefault()
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const pos = getPosition(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    },
    [isDrawing, getPosition],
  )

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas && hasContent) {
      onSign(canvas.toDataURL('image/png'))
    }
  }, [isDrawing, hasContent, onSign])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasContent(false)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          {label}
        </span>
        {hasContent && (
          <Button
            onPress={clear}
            className="text-xs font-medium text-[#2563EB] cursor-pointer hover:underline"
          >
            Clear
          </Button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="rounded-lg border-2 border-black/10 dark:border-white/10 bg-white dark:bg-white/5 touch-none cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  )
}
