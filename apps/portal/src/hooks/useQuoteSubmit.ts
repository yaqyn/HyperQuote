/**
 * Quote submission hook wrapping TanStack Query useMutation.
 * Calls submitQuoteRequest server function.
 * On success: clears draft from localStorage and store.
 * On error: returns error message for toast.
 */
import { useMutation } from '@tanstack/react-query'
import { submitQuoteRequest } from '../lib/server/quote-requests'
import { useQuoteBuilderStore } from '../stores/quote-builder'
import { clearLocalDraft } from '../lib/quote-draft'

// ============================================================================
// Types
// ============================================================================

export interface SubmitResult {
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
          items: state.items.map((item) => ({
            productId: item.productId,
            customerDescription: item.customerDescription,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            notes: item.notes,
            sortOrder: item.sortOrder,
            matchConfidence: item.matchConfidence,
            isUnmatched: item.isUnmatched,
          })),
          deliveryAddressId: state.deliveryAddressId ?? undefined,
          deliveryDate: state.deliveryDate ?? undefined,
          notes: state.notes || undefined,
          projectId: state.projectId ?? undefined,
          idempotencyKey: crypto.randomUUID(),
        },
      })

      return result
    },
    onSuccess: () => {
      // Clear draft from both localStorage and store
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
