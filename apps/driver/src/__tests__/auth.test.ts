import { readFileSync } from 'node:fs'
import {
	resolveSupabaseWorkerServiceRoleConfig,
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

	it('reads Cloudflare Secrets Store bindings for Worker runtime config', async () => {
		await expect(
			runtimeEnvValue({
				get: async () => 'store-secret',
			}),
		).resolves.toBe('store-secret')

		const config = await resolveSupabaseWorkerServiceRoleConfig({
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
})
