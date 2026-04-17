import type { AuthSession } from '@hyperquote/auth'
import { createServerFn } from '@tanstack/react-start'

// ============================================================================
// Helper: check if Supabase is configured
// ============================================================================

function isDevMode(): boolean {
	return (
		!process.env.SUPABASE_URL ||
		process.env.SUPABASE_URL === 'https://placeholder.supabase.co'
	)
}

// ============================================================================
// checkCEOAuth -- Used in _ceo.tsx beforeLoad
// ============================================================================

export const checkCEOAuth = createServerFn().handler(
	async (): Promise<{
		auth: AuthSession | null
		roles: string[]
		name: string
	}> => {
		// Dev mode: bypass auth, return mock CEO user
		if (isDevMode()) {
			return {
				auth: {
					session: {} as AuthSession['session'],
					user: {
						id: 'dev-ceo',
						user_metadata: {
							name: 'Karim',
							roles: ['ceo'],
						},
					} as unknown as AuthSession['user'],
					pool: 'internal',
					roles: ['ceo'],
					tenantId: null,
				},
				roles: ['ceo'],
				name: 'Karim',
			}
		}

		// Real auth path
		const { getServerSession } = await import('@hyperquote/auth/session')
		const session = await getServerSession({
			supabaseUrl:
				process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
			supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
		})

		if (!session) {
			return { auth: null, roles: [], name: '' }
		}

		const roles: string[] = session.roles ?? []
		const name: string = (session.user?.user_metadata?.name as string) ?? ''

		return { auth: session, roles, name }
	},
)
