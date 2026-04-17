import type { Session, User } from '@supabase/supabase-js'

export interface AuthSession {
	session: Session
	user: User
	pool: 'internal' | 'external'
	roles: string[]
	tenantId: string | null
}

export interface AuthGuardOptions {
	supabaseUrl: string
	supabaseAnonKey: string
	loginPath?: string
	requiredPool?: 'internal' | 'external'
}
