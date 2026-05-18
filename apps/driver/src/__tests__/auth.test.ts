import { describe, expect, it } from 'vitest'
import {
	createMockDriverSession,
	isMockLoginAccepted,
	loginSchema,
} from '../lib/auth'

describe('driver login validation', () => {
	it('accepts a valid driver email and password length', () => {
		const values = {
			email: 'driver@hyperquote.net',
			password: 'routepass',
		}

		expect(loginSchema.safeParse(values).success).toBe(true)
		expect(isMockLoginAccepted(values)).toBe(true)
		expect(createMockDriverSession(values).source).toBe('mock')
	})

	it('rejects invalid email and short passwords', () => {
		const values = {
			email: 'driver',
			password: 'short',
		}

		expect(loginSchema.safeParse(values).success).toBe(false)
		expect(isMockLoginAccepted(values)).toBe(false)
	})
})
