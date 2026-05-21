import {
	resolveSupabaseServerConfig,
	type SupabaseServerRuntimeConfig,
} from '@hyperquote/auth/server'
import type { Session, User } from '@supabase/supabase-js'
import { getSafeRedirectPath } from '../login-redirect'

export type InternalLoginErrorCode =
	| 'not_configured'
	| 'invalid_credentials'
	| 'wrong_pool'
	| 'unexpected'

export type InternalLoginResult =
	| { ok: true; redirectTo: string }
	| { ok: false; error: InternalLoginErrorCode }

export interface InternalLoginInput {
	email: string
	password: string
	redirect?: string
}

interface SupabasePasswordAuthClient {
	auth: {
		signInWithPassword(credentials: {
			email: string
			password: string
		}): Promise<{
			data: {
				session: Session | null
				user: User | null
			}
			error: { message?: string } | null
		}>
		signOut(options?: {
			scope?: 'global' | 'local' | 'others'
		}): Promise<unknown>
	}
}

export function getInternalSupabaseConfig(
	env: Record<string, string | undefined>,
): SupabaseServerRuntimeConfig | null {
	return resolveSupabaseServerConfig(env)
}

function getUserPool(user: User | null): string | null {
	const pool = user?.app_metadata?.pool
	return typeof pool === 'string' ? pool : null
}

export async function authenticateInternalPassword({
	client,
	input,
	requestUrl,
}: {
	client: SupabasePasswordAuthClient
	input: InternalLoginInput
	requestUrl: string
}): Promise<InternalLoginResult> {
	const { data, error } = await client.auth.signInWithPassword({
		email: input.email.trim(),
		password: input.password,
	})

	if (error || !data.session || !data.user) {
		return { ok: false, error: 'invalid_credentials' }
	}

	if (getUserPool(data.user) !== 'internal') {
		await client.auth.signOut({ scope: 'local' })
		return { ok: false, error: 'wrong_pool' }
	}

	return {
		ok: true,
		redirectTo: getSafeRedirectPath(input.redirect, new URL(requestUrl).origin),
	}
}
