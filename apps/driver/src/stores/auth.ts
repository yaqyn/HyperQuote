/**
 * Driver session — local-only for the dev shell. Real auth will hand off
 * to Supabase + biometric (capgo) and persist via @capacitor/preferences.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DRIVER_SESSION } from '../lib/mock'
import type { DriverSession } from '../lib/types'

interface AuthState {
	session: DriverSession | null
	signIn: (session?: DriverSession) => void
	signOut: () => void
}

export const useAuth = create<AuthState>()(
	persist(
		(set) => ({
			session: null,
			signIn: (session) => set({ session: session ?? DRIVER_SESSION }),
			signOut: () => set({ session: null }),
		}),
		{ name: 'driver-auth' },
	),
)
