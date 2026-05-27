import { useEffect, useState } from 'react'

export interface VisualViewportKeyboardState {
	bottomInset: number
	height: number
	isOpen: boolean
	offsetTop: number
}

interface UseVisualViewportKeyboardOptions {
	enabled?: boolean
	threshold?: number
}

const DEFAULT_KEYBOARD_THRESHOLD = 80
const CLOSED_KEYBOARD_STATE: VisualViewportKeyboardState = {
	bottomInset: 0,
	height: 0,
	isOpen: false,
	offsetTop: 0,
}
let documentScrollLockCount = 0
let documentScrollLockState: {
	htmlOverflow: string
	bodyLeft: string
	bodyOverflow: string
	bodyOverscroll: string
	bodyPosition: string
	bodyRight: string
	bodyTop: string
	bodyWidth: string
	scrollY: number
} | null = null

export function readVisualViewportKeyboardState(
	threshold = DEFAULT_KEYBOARD_THRESHOLD,
): VisualViewportKeyboardState {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return CLOSED_KEYBOARD_STATE
	}

	const viewport = window.visualViewport
	if (!viewport) return CLOSED_KEYBOARD_STATE

	const layoutHeight = Math.max(
		document.documentElement.clientHeight,
		window.innerHeight,
	)
	const offsetTop = Math.max(0, viewport.offsetTop)
	const bottomInset = Math.max(0, layoutHeight - viewport.height - offsetTop)
	const isOpen = bottomInset > threshold || offsetTop > threshold

	if (!isOpen) return CLOSED_KEYBOARD_STATE

	return {
		bottomInset: Math.ceil(bottomInset),
		height: Math.max(1, Math.floor(viewport.height)),
		isOpen,
		offsetTop: Math.ceil(offsetTop),
	}
}

export function useVisualViewportKeyboard({
	enabled = true,
	threshold = DEFAULT_KEYBOARD_THRESHOLD,
}: UseVisualViewportKeyboardOptions = {}): VisualViewportKeyboardState {
	const [state, setState] = useState<VisualViewportKeyboardState>(
		CLOSED_KEYBOARD_STATE,
	)

	useEffect(() => {
		if (!enabled) {
			setState(CLOSED_KEYBOARD_STATE)
			return
		}

		let frame = 0
		const update = () => {
			window.cancelAnimationFrame(frame)
			frame = window.requestAnimationFrame(() => {
				setState(readVisualViewportKeyboardState(threshold))
			})
		}

		update()
		const viewport = window.visualViewport
		viewport?.addEventListener('resize', update)
		viewport?.addEventListener('scroll', update)
		window.addEventListener('resize', update)
		window.addEventListener('orientationchange', update)
		document.addEventListener('focusin', update)
		document.addEventListener('focusout', update)

		return () => {
			window.cancelAnimationFrame(frame)
			viewport?.removeEventListener('resize', update)
			viewport?.removeEventListener('scroll', update)
			window.removeEventListener('resize', update)
			window.removeEventListener('orientationchange', update)
			document.removeEventListener('focusin', update)
			document.removeEventListener('focusout', update)
		}
	}, [enabled, threshold])

	return state
}

export function useDocumentScrollLock(enabled: boolean) {
	useEffect(() => {
		if (
			!enabled ||
			typeof document === 'undefined' ||
			typeof window === 'undefined'
		) {
			return
		}

		const html = document.documentElement
		const body = document.body
		documentScrollLockCount += 1

		if (documentScrollLockCount === 1) {
			documentScrollLockState = {
				htmlOverflow: html.style.overflow,
				bodyLeft: body.style.left,
				bodyOverflow: body.style.overflow,
				bodyOverscroll: body.style.overscrollBehavior,
				bodyPosition: body.style.position,
				bodyRight: body.style.right,
				bodyTop: body.style.top,
				bodyWidth: body.style.width,
				scrollY: window.scrollY,
			}

			html.style.overflow = 'hidden'
			body.style.left = '0'
			body.style.overflow = 'hidden'
			body.style.overscrollBehavior = 'none'
			body.style.position = 'fixed'
			body.style.right = '0'
			body.style.top = `-${documentScrollLockState.scrollY}px`
			body.style.width = '100%'
		}

		return () => {
			documentScrollLockCount = Math.max(0, documentScrollLockCount - 1)
			if (documentScrollLockCount > 0 || !documentScrollLockState) return

			const state = documentScrollLockState
			documentScrollLockState = null
			html.style.overflow = state.htmlOverflow
			body.style.left = state.bodyLeft
			body.style.overflow = state.bodyOverflow
			body.style.overscrollBehavior = state.bodyOverscroll
			body.style.position = state.bodyPosition
			body.style.right = state.bodyRight
			body.style.top = state.bodyTop
			body.style.width = state.bodyWidth
			window.scrollTo(0, state.scrollY)
		}
	}, [enabled])
}
