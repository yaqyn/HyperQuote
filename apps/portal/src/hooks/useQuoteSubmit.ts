/**
 * Quote submission hook wrapping TanStack Query useMutation.
 * Calls submitQuoteRequest server function.
 * On success: clears draft from localStorage and store.
 * On error: returns error message for toast.
 */
import { useMutation } from '@tanstack/react-query'
import { clearLocalDraft } from '../lib/quote-draft'
import { toQuoteSubmissionPayload } from '../lib/quote-request-payload'
import { submitQuoteRequest } from '../lib/server/quote-requests'
import { useQuoteBuilderStore } from '../stores/quote-builder'

// ============================================================================
// Types
// ============================================================================

interface SubmitResult {
	requestId: string
	reference: string
}

// ============================================================================
// Hook
// ============================================================================

export function useQuoteSubmit() {
	const mutation = useMutation({
		mutationFn: async (): Promise<SubmitResult> => {
			const state = useQuoteBuilderStore.getState()

			if (state.items.length === 0) {
				throw new Error('No items in the quote request')
			}

			const result = await submitQuoteRequest({
				data: {
					...toQuoteSubmissionPayload(state),
					idempotencyKey: crypto.randomUUID(),
				},
			})

			return result
		},
		onSuccess: () => {
			clearLocalDraft()
			useQuoteBuilderStore.getState().reset()
		},
	})

	return {
		submit: mutation.mutate,
		submitAsync: mutation.mutateAsync,
		isSubmitting: mutation.isPending,
		error: mutation.error?.message ?? null,
		data: mutation.data ?? null,
		reset: mutation.reset,
	}
}
