import { RotateCcw } from 'lucide-react'
import type { PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface SignaturePadProps {
	onSignatureChange: (signatureDataUrl: string, strokeCount: number) => void
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
	const { t } = useTranslation('driver')
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const isDrawingRef = useRef(false)
	const lastPointRef = useRef<{ x: number; y: number } | null>(null)
	const [strokeCount, setStrokeCount] = useState(0)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const targetCanvas = canvas

		function resizeCanvas() {
			const context = targetCanvas.getContext('2d')
			if (!context) return

			const rect = targetCanvas.getBoundingClientRect()
			const ratio = window.devicePixelRatio || 1
			targetCanvas.width = Math.max(1, Math.floor(rect.width * ratio))
			targetCanvas.height = Math.max(1, Math.floor(rect.height * ratio))
			context.scale(ratio, ratio)
			context.lineWidth = 2
			context.lineCap = 'round'
			context.lineJoin = 'round'
			context.strokeStyle = getComputedStyle(document.documentElement)
				.getPropertyValue('--color-text')
				.trim()
		}

		resizeCanvas()
		const observer = new ResizeObserver(resizeCanvas)
		observer.observe(targetCanvas)
		return () => observer.disconnect()
	}, [])

	function getPoint(event: PointerEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current
		if (!canvas) return null
		const rect = canvas.getBoundingClientRect()
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		}
	}

	function emitSignature(nextStrokeCount: number) {
		const canvas = canvasRef.current
		if (!canvas) return
		onSignatureChange(canvas.toDataURL('image/png'), nextStrokeCount)
	}

	function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current
		const point = getPoint(event)
		if (!canvas || !point) return

		canvas.setPointerCapture(event.pointerId)
		isDrawingRef.current = true
		lastPointRef.current = point

		const context = canvas.getContext('2d')
		if (!context) return
		context.beginPath()
		context.arc(point.x, point.y, 1.5, 0, Math.PI * 2)
		context.fillStyle = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-text')
			.trim()
		context.fill()
	}

	function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
		if (!isDrawingRef.current) return
		const point = getPoint(event)
		const previousPoint = lastPointRef.current
		const canvas = canvasRef.current
		if (!canvas || !point || !previousPoint) return

		const context = canvas.getContext('2d')
		if (!context) return
		context.beginPath()
		context.moveTo(previousPoint.x, previousPoint.y)
		context.lineTo(point.x, point.y)
		context.stroke()
		lastPointRef.current = point
	}

	function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current
		if (!canvas || !isDrawingRef.current) return
		canvas.releasePointerCapture(event.pointerId)
		isDrawingRef.current = false
		lastPointRef.current = null
		const nextStrokeCount = strokeCount + 1
		setStrokeCount(nextStrokeCount)
		emitSignature(nextStrokeCount)
	}

	function handleClear() {
		const canvas = canvasRef.current
		const context = canvas?.getContext('2d')
		if (!canvas || !context) return
		context.clearRect(0, 0, canvas.width, canvas.height)
		setStrokeCount(0)
		onSignatureChange('', 0)
	}

	return (
		<div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
			<div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
				<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
					{t('verification.signature')}
				</p>
				<Button
					className="driver-control-button grid h-8 w-8 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
					onPress={handleClear}
					aria-label={t('verification.clearSignature')}
				>
					<RotateCcw aria-hidden="true" size={15} />
				</Button>
			</div>
			<canvas
				ref={canvasRef}
				className="h-36 w-full touch-none bg-[linear-gradient(to_bottom,transparent_31px,var(--color-grid)_32px)] bg-[length:100%_32px]"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerCancel={handlePointerUp}
				onPointerUp={handlePointerUp}
				aria-label={t('verification.signatureCanvas')}
			/>
		</div>
	)
}
