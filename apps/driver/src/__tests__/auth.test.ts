import { readFileSync } from 'node:fs'
import {
	clearInstalledRuntimeEnv,
	installRuntimeEnv,
	resolveSupabaseServiceRoleRuntimeConfig,
	runtimeEnvValue,
} from '@hyperquote/auth/server'
import { describe, expect, it } from 'vitest'
import { loginSchema } from '../lib/auth'

describe('driver login validation', () => {
	it('accepts well-formed credentials for Supabase authentication', () => {
		const values = {
			email: 'driver@hyperquote.net',
			password: 'routepass',
		}

		expect(loginSchema.safeParse(values).success).toBe(true)
	})

	it('rejects invalid email and short passwords', () => {
		const values = {
			email: 'driver',
			password: '12345',
		}

		expect(loginSchema.safeParse(values).success).toBe(false)
	})

	it('matches the local Supabase password floor', () => {
		expect(
			loginSchema.safeParse({
				email: 'driver@hyperquote.net',
				password: '123456',
			}).success,
		).toBe(true)
	})

	it('claims the driver API session and revokes other driver refresh sessions after login', () => {
		const source = readFileSync(
			new URL('../lib/auth.ts', import.meta.url),
			'utf8',
		)

		expect(source).toContain('claimDriverApiSession(config)')
		expect(source).toContain("scope: 'others'")
		expect(source).toContain("scope: 'local'")
	})

	it('reads runtime secret bindings for runtime config', async () => {
		await expect(
			runtimeEnvValue({
				get: async () => 'store-secret',
			}),
		).resolves.toBe('store-secret')

		const config = await resolveSupabaseServiceRoleRuntimeConfig({
			SUPABASE_ANON_KEY: { get: async () => 'anon-key' },
			SUPABASE_SERVICE_ROLE_KEY: { get: async () => 'service-role-key' },
			SUPABASE_URL: { get: async () => 'https://example.supabase.co' },
		})

		expect(config).toMatchObject({
			supabaseAnonKey: 'anon-key',
			supabaseServiceRoleKey: 'service-role-key',
			supabaseUrl: 'https://example.supabase.co',
		})
	})

	it('reads installed runtime env from the TanStack server entry bridge', async () => {
		clearInstalledRuntimeEnv()
		installRuntimeEnv({
			SUPABASE_ANON_KEY: { get: async () => 'installed-anon-key' },
			SUPABASE_SERVICE_ROLE_KEY: {
				get: async () => 'installed-service-role-key',
			},
			SUPABASE_URL: { get: async () => 'https://installed.supabase.co' },
		})

		try {
			const config = await resolveSupabaseServiceRoleRuntimeConfig({})
			expect(config).toMatchObject({
				supabaseAnonKey: 'installed-anon-key',
				supabaseServiceRoleKey: 'installed-service-role-key',
				supabaseUrl: 'https://installed.supabase.co',
			})
		} finally {
			clearInstalledRuntimeEnv()
		}
	})
})
