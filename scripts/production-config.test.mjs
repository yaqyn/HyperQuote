import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import {
	configuredEnvValue,
	missingEnvNames,
	optionalRuntimeSecretNamesForApp,
	productionAppById,
	productionBuildEnv,
	requiredRuntimeSecretNamesForApp,
	runtimeSecretPayloadForApp,
} from './production-config.mjs'

describe('optional production providers', () => {
	test('syncs the selected Groq model to AI-enabled Workers', () => {
		for (const app of ['website', 'portal', 'internal']) {
			const payload = runtimeSecretPayloadForApp(productionAppById(app), {
				GROQ_MODEL: 'openai/gpt-oss-120b',
				USE_AI: '1',
			})
			expect(payload.GROQ_MODEL).toBe('openai/gpt-oss-120b')
			expect(payload.USE_AI).toBe('1')
		}
		expect(
			optionalRuntimeSecretNamesForApp(productionAppById('driver')),
		).not.toContain('GROQ_MODEL')
	})
	test('removes temporary secret payloads when Wrangler fails to start', () => {
		const payloadDirectories = () =>
			readdirSync(tmpdir()).filter((name) =>
				name.startsWith('hyperquote-worker-secrets-'),
			)
		const before = payloadDirectories()
		const result = spawnSync(
			process.execPath,
			['scripts/sync-worker-secrets.mjs', 'driver'],
			{
				env: {
					PATH: '/nonexistent',
					COOKIE_DOMAIN: '.example.test',
					SUPABASE_ANON_KEY: 'test-anon-key',
					SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
					SUPABASE_URL: 'https://example.test',
				},
			},
		)
		expect(result.status).toBe(1)
		expect(payloadDirectories()).toEqual(before)
	})
	test('blanks unconfigured managed secrets instead of retaining old credentials', () => {
		const payload = runtimeSecretPayloadForApp(productionAppById('internal'), {
			RESEND_API_KEY: 'FILL_ME',
			USE_AI: 'false',
		})
		expect(payload.RESEND_API_KEY).toBe('')
		expect(payload.RESEND_WEBHOOK_SECRET).toBe('')
		expect(payload.GROQ_API_KEY).toBe('')
		expect(payload.USE_AI).toBe('false')
	})
	test('rejects credential placeholders', () => {
		expect(configuredEnvValue(' FILL_ME ')).toBe('')
		expect(missingEnvNames(['KEY'], { KEY: 'FILL_ME' })).toEqual(['KEY'])
	})
	test('keeps only backend credentials required for every Worker', () => {
		expect(requiredRuntimeSecretNamesForApp()).toEqual([
			'COOKIE_DOMAIN',
			'SUPABASE_ANON_KEY',
			'SUPABASE_SERVICE_ROLE_KEY',
			'SUPABASE_URL',
		])
		expect(
			optionalRuntimeSecretNamesForApp(productionAppById('internal')),
		).toContain('RESEND_API_KEY')
	})
	test('disables unavailable AI and omits placeholder map keys', () => {
		const env = productionBuildEnv(productionAppById('website'), {
			GROQ_API_KEY: 'FILL_ME',
			MAPTILER_KEY: 'FILL_ME',
		})
		expect(env.VITE_USE_AI).toBe('false')
		expect(env.VITE_MAPTILER_KEY).toBe('')
	})
	test('allows unconfigured development providers but rejects partial Twilio config', () => {
		const env = {
			PATH: process.env.PATH,
			HYPERQUOTE_VERIFY_INFISICAL_ENV: 'dev',
		}
		const args = ['scripts/verify-infisical-env.mjs', 'dev']
		expect(spawnSync(process.execPath, args, { env }).status).toBe(0)
		expect(
			spawnSync(process.execPath, args, {
				env: { ...env, TWILIO_ACCOUNT_SID: 'ACtest' },
			}).status,
		).toBe(1)
	})
})
