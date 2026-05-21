import type { Session, User } from '@supabase/supabase-js'

export type AuthPool = 'internal' | 'external' | 'driver'

export interface AuthSession {
	session: Session
	user: User
	pool: AuthPool
	roles: string[]
	tenantId: string | null
}

export interface AuthGuardOptions {
	supabaseUrl: string
	supabaseAnonKey: string
	cookieDomain?: string
	cookieName?: string
	loginPath?: string
	requiredPool?: AuthPool
}
