import { useEffect, useRef } from 'react'

interface BackButtonDismissLayerOptions {
	enabled: boolean
	onDismiss: () => void
	priority?: number
}

interface DismissLayer {
	id: number
	onDismiss: () => void
	priority: number
	sequence: number
}

const DISMISS_HISTORY_STATE_KEY = '__hyperquoteBackDismiss'
const DEFAULT_PRIORITY = 0

let nextLayerId = 1
let nextLayerSequence = 1
let historyDepth = 0
let ignoredPopstateCount = 0
let popstateListening = false
let syncTimer: number | null = null

const dismissLayers = new Map<number, DismissLayer>()

function canUseHistory() {
	return (
		typeof window !== 'undefined' &&
		typeof window.history?.pushState === 'function' &&
		typeof window.history?.back === 'function'
	)
}

function orderedLayers() {
	return Array.from(dismissLayers.values()).sort((a, b) => {
		if (a.priority !== b.priority) return a.priority - b.priority
		return a.sequence - b.sequence
	})
}

function topLayer() {
	const layers = orderedLayers()
	return layers[layers.length - 1] ?? null
}

function currentStateIsDismissLayer() {
	if (typeof window === 'undefined') return false
	const state: unknown = window.history.state
	return (
		typeof state === 'object' &&
		state !== null &&
		DISMISS_HISTORY_STATE_KEY in state
	)
}

function maybeReleasePopstateListener() {
	if (
		!popstateListening ||
		typeof window === 'undefined' ||
		dismissLayers.size > 0 ||
		historyDepth > 0 ||
		ignoredPopstateCount > 0
	) {
		return
	}

	window.removeEventListener('popstate', handlePopstate)
	popstateListening = false
}

function runHistorySync() {
	syncTimer = null
	if (!canUseHistory()) return

	const targetDepth = dismissLayers.size
	if (historyDepth < targetDepth) {
		while (historyDepth < targetDepth) {
			historyDepth += 1
			window.history.pushState(
				{ [DISMISS_HISTORY_STATE_KEY]: historyDepth },
				'',
				window.location.href,
			)
		}
		return
	}

	if (historyDepth > targetDepth) {
		if (!currentStateIsDismissLayer()) {
			historyDepth = targetDepth
			maybeReleasePopstateListener()
			return
		}
		ignoredPopstateCount += 1
		historyDepth -= 1
		window.history.back()
		return
	}

	maybeReleasePopstateListener()
}

function scheduleHistorySync() {
	if (!canUseHistory() || syncTimer !== null) return
	syncTimer = window.setTimeout(runHistorySync, 0)
}

function ensurePopstateListener() {
	if (popstateListening || typeof window === 'undefined') return
	window.addEventListener('popstate', handlePopstate)
	popstateListening = true
}

function handlePopstate() {
	if (ignoredPopstateCount > 0) {
		ignoredPopstateCount -= 1
		scheduleHistorySync()
		return
	}

	if (historyDepth <= 0) {
		maybeReleasePopstateListener()
		return
	}

	historyDepth -= 1
	const layer = topLayer()
	if (!layer) {
		scheduleHistorySync()
		return
	}

	layer.onDismiss()
	scheduleHistorySync()
}

export function useBackButtonDismissLayer({
	enabled,
	onDismiss,
	priority = DEFAULT_PRIORITY,
}: BackButtonDismissLayerOptions) {
	const dismissRef = useRef(onDismiss)

	useEffect(() => {
		dismissRef.current = onDismiss
	}, [onDismiss])

	useEffect(() => {
		if (!enabled) return

		const id = nextLayerId
		nextLayerId += 1
		dismissLayers.set(id, {
			id,
			onDismiss: () => dismissRef.current(),
			priority,
			sequence: nextLayerSequence,
		})
		nextLayerSequence += 1
		ensurePopstateListener()
		scheduleHistorySync()

		return () => {
			dismissLayers.delete(id)
			scheduleHistorySync()
		}
	}, [enabled, priority])
}
