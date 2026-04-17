import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock supabase before importing auth store
vi.mock('../lib/supabase', () => ({
	supabase: {
		auth: {
			getSession: vi
				.fn()
				.mockResolvedValue({ data: { session: null }, error: null }),
			onAuthStateChange: vi
				.fn()
				.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
			signOut: vi.fn().mockResolvedValue({ error: null }),
		},
	},
}))

// Mock biometric
vi.mock('../lib/biometric', () => ({
	isBiometricAvailable: vi
		.fn()
		.mockResolvedValue({ isAvailable: false, biometryType: 0 }),
}))

// Mock pin - keep real implementations, only mock getPinHash for auth store
vi.mock('../lib/pin', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../lib/pin')>()
	return {
		...actual,
		getPinHash: vi.fn().mockResolvedValue(null),
	}
})

// We need to import after mocks
const { useAuthStore } = await import('./auth')

describe('auth store', () => {
	beforeEach(() => {
		// Reset store to initial state
		useAuthStore.setState({
			session: null,
			isAuthenticated: false,
			driverProfile: null,
			hasBiometric: false,
			hasPin: false,
			authStep: 'phone',
		})
	})

	it('initializes as unauthenticated', () => {
		const state = useAuthStore.getState()
		expect(state.session).toBeNull()
		expect(state.isAuthenticated).toBe(false)
		expect(state.authStep).toBe('phone')
	})

	it('setSession updates session and isAuthenticated', () => {
		const mockSession = {
			access_token: 'test-token',
			refresh_token: 'test-refresh',
			user: { id: 'user-1', phone: '+201234567890' },
		}
		useAuthStore.getState().setSession(mockSession as unknown as Session)

		const state = useAuthStore.getState()
		expect(state.session).toBe(mockSession)
		expect(state.isAuthenticated).toBe(true)
	})

	it('clearSession clears session and sets unauthenticated', () => {
		useAuthStore
			.getState()
			.setSession({ access_token: 'x' } as unknown as Session)
		expect(useAuthStore.getState().isAuthenticated).toBe(true)

		useAuthStore.getState().clearSession()
		const state = useAuthStore.getState()
		expect(state.session).toBeNull()
		expect(state.isAuthenticated).toBe(false)
	})

	it('logout clears all state', async () => {
		useAuthStore
			.getState()
			.setSession({ access_token: 'x' } as unknown as Session)
		useAuthStore.getState().setHasBiometric(true)
		useAuthStore.getState().setHasPin(true)

		await useAuthStore.getState().logout()

		const state = useAuthStore.getState()
		expect(state.session).toBeNull()
		expect(state.isAuthenticated).toBe(false)
		expect(state.authStep).toBe('phone')
	})

	it('hasBiometric/hasPin flags track enrollment state', () => {
		expect(useAuthStore.getState().hasBiometric).toBe(false)
		expect(useAuthStore.getState().hasPin).toBe(false)

		useAuthStore.getState().setHasBiometric(true)
		useAuthStore.getState().setHasPin(true)

		expect(useAuthStore.getState().hasBiometric).toBe(true)
		expect(useAuthStore.getState().hasPin).toBe(true)
	})

	it('setAuthStep transitions auth step', () => {
		useAuthStore.getState().setAuthStep('otp')
		expect(useAuthStore.getState().authStep).toBe('otp')

		useAuthStore.getState().setAuthStep('pin-setup')
		expect(useAuthStore.getState().authStep).toBe('pin-setup')
	})
})

describe('pin utilities', () => {
	it('hashPin produces consistent output for same input', async () => {
		const { hashPin } = await import('../lib/pin')
		const hash1 = await hashPin('123456')
		const hash2 = await hashPin('123456')
		expect(hash1).toBe(hash2)
		expect(hash1).toHaveLength(64) // SHA-256 hex = 64 chars
	})

	it('verifyPin returns true for correct pin, false for wrong', async () => {
		const { hashPin, verifyPin } = await import('../lib/pin')
		const hash = await hashPin('123456')
		expect(await verifyPin('123456', hash)).toBe(true)
		expect(await verifyPin('654321', hash)).toBe(false)
	})
})
