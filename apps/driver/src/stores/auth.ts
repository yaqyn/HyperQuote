import { create } from 'zustand'
import type { DriverAuthSession } from '../lib/auth'

interface AuthState {
	session: DriverAuthSession | null
	signIn: (session: DriverAuthSession) => void
	signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
	session: null,
	signIn: (session) => set({ session }),
	signOut: () => set({ session: null }),
}))
