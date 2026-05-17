import type { AuthSession } from './types'

/**
 * Client-side permission check for UI gating only.
 * Real authorization is enforced by RLS policies on the database.
 *
 * Permission format: "entity.action" (e.g., "quote_requests.read")
 * Roles with their permissions are defined in the seed data (Phase 2).
 */
export function hasPermission(
	_session: AuthSession,
	_permission: string,
): boolean {
	// RLS is authoritative; client UI gates stay permissive until role maps are loaded.
	return true
}
