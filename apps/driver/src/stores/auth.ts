import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isBiometricAvailable } from '../lib/biometric'
import { getPinHash } from '../lib/pin'
import { supabase } from '../lib/supabase'

export type AuthStep =
	| 'phone'
	| 'otp'
	| 'pin-setup'
	| 'pin-verify'
	| 'biometric-prompt'
	| 'biometric-verify'
	| 'authenticated'

export interface DriverProfile {
	id: string
	phone: string
	name: string | null
	avatar_url: string | null
	driver_type: 'internal' | 'contracted' | 'on_demand'
}

interface AuthState {
	session: Session | null
	isAuthenticated: boolean
	driverProfile: DriverProfile | null
	isExternalDriver: boolean
	hasBiometric: boolean
	hasPin: boolean
	authStep: AuthStep
	isInitializing: boolean

	setSession: (session: Session | null) => void
	clearSession: () => void
	setDriverProfile: (profile: DriverProfile | null) => void
	setHasBiometric: (v: boolean) => void
	setHasPin: (v: boolean) => void
	setAuthStep: (step: AuthStep) => void
	initAuth: () => Promise<void>
	logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, _get) => ({
	session: null,
	isAuthenticated: false,
	driverProfile: null,
	isExternalDriver: false,
	hasBiometric: false,
	hasPin: false,
	authStep: 'phone',
	isInitializing: true,

	setSession: (session) => {
		set({
			session,
			isAuthenticated: session !== null,
		})
	},

	clearSession: () => {
		set({
			session: null,
			isAuthenticated: false,
			driverProfile: null,
			isExternalDriver: false,
		})
	},

	setDriverProfile: (profile) =>
		set({
			driverProfile: profile,
			isExternalDriver:
				profile?.driver_type === 'contracted' ||
				profile?.driver_type === 'on_demand',
		}),
	setHasBiometric: (v) => set({ hasBiometric: v }),
	setHasPin: (v) => set({ hasPin: v }),
	setAuthStep: (step) => set({ authStep: step }),

	initAuth: async () => {
		set({ isInitializing: true })
		try {
			// Check existing session
			const {
				data: { session },
			} = await supabase.auth.getSession()

			// Check PIN enrollment
			const pinHash = await getPinHash()
			const hasPin = pinHash !== null

			// Check biometric enrollment
			const bio = await isBiometricAvailable()
			const hasBiometric = bio.isAvailable

			set({
				session,
				isAuthenticated: session !== null,
				hasPin,
				hasBiometric,
				isInitializing: false,
			})

			// Determine initial auth step for returning users
			if (session) {
				set({ authStep: 'authenticated' })
			} else if (hasPin && hasBiometric) {
				set({ authStep: 'biometric-verify' })
			} else if (hasPin) {
				set({ authStep: 'pin-verify' })
			} else {
				set({ authStep: 'phone' })
			}
		} catch {
			set({ isInitializing: false })
		}

		// Listen for auth state changes
		supabase.auth.onAuthStateChange((_event, session) => {
			set({
				session,
				isAuthenticated: session !== null,
			})
		})
	},

	logout: async () => {
		await supabase.auth.signOut()
		set({
			session: null,
			isAuthenticated: false,
			driverProfile: null,
			authStep: 'phone',
		})
	},
}))
