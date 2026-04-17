/**
 * Approval role hooks.
 * useIsApprover: checks if current user has 'approver' role.
 * useNeedsApproval: checks if user needs to go through approval workflow.
 */
import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { checkTeamHasApprover } from '../lib/server/approvals'

// ============================================================================
// useIsApprover
// ============================================================================

/**
 * Returns true if the current user has the 'approver' role.
 * Reads from route context (loaded by _portal.tsx beforeLoad).
 * In dev mode, also checks localStorage flag 'dev-is-approver'.
 */
export function useIsApprover(): boolean {
	const context = useRouteContext({ from: '/_portal' })
	const auth = context.auth

	if (!auth) return false

	const roles: string[] = auth.user?.user_metadata?.roles ?? []
	const isApprover = roles.includes('approver')

	// Dev mode override for testing
	if (
		typeof window !== 'undefined' &&
		!isApprover &&
		localStorage.getItem('dev-is-approver') === 'true'
	) {
		return true
	}

	return isApprover
}

// ============================================================================
// useNeedsApproval
// ============================================================================

/**
 * Returns true if the current user is NOT an approver AND their team HAS an approver.
 * If true, submit should go through approval workflow.
 * If false (solo account or user IS the approver), submit directly.
 */
export function useNeedsApproval(): {
	needsApproval: boolean
	isLoading: boolean
} {
	const isApprover = useIsApprover()

	const { data, isLoading } = useQuery({
		queryKey: ['team-has-approver'],
		queryFn: () => checkTeamHasApprover(),
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: !isApprover, // Only check if user is not an approver
	})

	// If user IS the approver, they never need approval
	if (isApprover) {
		return { needsApproval: false, isLoading: false }
	}

	// If still loading, assume no approval needed (prevents UI flicker)
	if (isLoading) {
		return { needsApproval: false, isLoading: true }
	}

	return {
		needsApproval: data?.hasApprover ?? false,
		isLoading: false,
	}
}
