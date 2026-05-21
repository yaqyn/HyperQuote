import type { AuthSession } from './types'

/**
 * Client-side permission check for UI gating only.
 * Real authorization is enforced by RLS policies on the database.
 *
 * Permission format: "entity.action" (e.g., "quote_requests.read")
 * Roles with their permissions are defined in the seed data (Phase 2).
 */
export function hasPermission(
	session: AuthSession,
	permission: string,
): boolean {
	if (session.pool !== 'internal') return false
	return session.roles.some((role) =>
		(ROLE_PERMISSIONS[role] ?? []).some((rule) =>
			permissionMatches(rule, permission),
		),
	)
}

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
	admin: ['*'],
	ceo: ['*'],
	customer_service: ['customer_service.*'],
	dispatch: ['dispatch.*'],
	finance: ['finance.*'],
	inventory: ['inventory.*', 'procurement.*'],
	sales: ['sales.*'],
	warehouse: ['warehouse.*'],
}

function permissionMatches(rule: string, permission: string): boolean {
	if (rule === '*') return true
	if (rule.endsWith('.*')) {
		return permission.startsWith(rule.slice(0, -1))
	}
	return rule === permission
}
