import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
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
