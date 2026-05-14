import type { AuthSession } from '@hyperquote/auth'
import { createContext, type ReactNode, useContext } from 'react'

const InternalAuthContext = createContext<AuthSession | null>(null)

export function InternalAuthProvider({
	auth,
	children,
}: {
	auth: AuthSession
	children: ReactNode
}) {
	return (
		<InternalAuthContext.Provider value={auth}>
			{children}
		</InternalAuthContext.Provider>
	)
}

export function useInternalAuth() {
	return useContext(InternalAuthContext)
}
