/**
 * Auto-save hook for quote builder drafts.
 * - 30-second interval saves to localStorage
 * - Debounced 5-second server save after last change
 * - Restores from localStorage on mount (compares timestamps)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	clearLocalDraft,
	hasRecentDraft,
	loadDraftFromLocal,
	saveDraftToLocal,
} from '../lib/quote-draft'
import { toQuoteDraftPayload } from '../lib/quote-request-payload'
import { saveDraft } from '../lib/server/quote-requests'
import { useQuoteBuilderStore } from '../stores/quote-builder'

// ============================================================================
// Constants
// ============================================================================

const LOCAL_SAVE_INTERVAL = 30_000 // 30 seconds
const SERVER_SAVE_DEBOUNCE = 5_000 // 5 seconds

// ============================================================================
// Hook
// ============================================================================

export function useQuoteDraft() {
	const [isRestoring, setIsRestoring] = useState(false)
	const [hasDraft, setHasDraft] = useState(false)
	const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const lastServerSaveRef = useRef<number>(0)

	// SSR hydration safety -- rehydrate Zustand store on mount
	useEffect(() => {
		useQuoteBuilderStore.persist.rehydrate()
	}, [])

	useEffect(() => {
		setHasDraft(hasRecentDraft())
	}, [])

	useEffect(() => {
		const draft = loadDraftFromLocal()
		if (!draft || draft.items.length === 0) return

		setIsRestoring(true)
		const store = useQuoteBuilderStore.getState()

		if (store.items.length === 0) {
			store.setItems(draft.items)
			if (draft.projectId) store.setProjectId(draft.projectId)
			if (draft.deliveryAddressId)
				store.setDeliveryAddressId(draft.deliveryAddressId)
			if (draft.deliveryDate) store.setDeliveryDate(draft.deliveryDate)
			if (draft.notes) store.setNotes(draft.notes)
			if (draft.draftId) store.setDraftId(draft.draftId)
		}

		setIsRestoring(false)
	}, [])

	useEffect(() => {
		const interval = setInterval(() => {
			const state = useQuoteBuilderStore.getState()
			if (state.items.length === 0 && !state.isDirty) return

			saveDraftToLocal({
				items: state.items,
				projectId: state.projectId,
				deliveryAddressId: state.deliveryAddressId,
				deliveryDate: state.deliveryDate,
				notes: state.notes,
				draftId: state.draftId,
			})
		}, LOCAL_SAVE_INTERVAL)

		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		const unsubscribe = useQuoteBuilderStore.subscribe((state) => {
			if (!state.isDirty) return

			if (serverSaveTimerRef.current) {
				clearTimeout(serverSaveTimerRef.current)
			}

			serverSaveTimerRef.current = setTimeout(async () => {
				const now = Date.now()
				if (now - lastServerSaveRef.current < SERVER_SAVE_DEBOUNCE) return

				const current = useQuoteBuilderStore.getState()
				if (current.items.length === 0) return

				try {
					const result = await saveDraft({
						data: toQuoteDraftPayload(current),
					})

					if (result.draftId && !current.draftId) {
						useQuoteBuilderStore.getState().setDraftId(result.draftId)
					}

					lastServerSaveRef.current = Date.now()
				} catch {
					// Local draft persistence remains the source of continuity in dev.
				}
			}, SERVER_SAVE_DEBOUNCE)
		})

		return () => {
			unsubscribe()
			if (serverSaveTimerRef.current) {
				clearTimeout(serverSaveTimerRef.current)
			}
		}
	}, [])

	const clearDraft = useCallback(() => {
		clearLocalDraft()
		useQuoteBuilderStore.getState().reset()
		setHasDraft(false)
	}, [])

	return {
		isRestoring,
		hasDraft,
		clearDraft,
	}
}
