import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	companyAppById,
	companyBuildEnv,
	companySupabaseConfig,
	companyUrls,
	loadCompanyRegistry,
	validateCompanyRegistry,
	writeGeneratedWranglerConfig,
} from './registry.mjs'

describe('LOGIS company registry', () => {
	it('loads HyperQuote production identity from registry', () => {
		const company = loadCompanyRegistry('hyperquote')
		assert.equal(company.slug, 'hyperquote')
		assert.equal(company.infisical.path, '/Projects/HyperQuote')
		assert.equal(company.supabase.projectId, 'hyperquote-production')
		assert.deepEqual(companyUrls(company), {
			driver: 'https://driver.hyperquote.net',
			internal: 'https://internal.hyperquote.net',
			portal: 'https://portal.hyperquote.net',
			root: 'https://hyperquote.net',
			website: 'https://www.hyperquote.net',
		})
		assert.equal(company.apps.website.workerName, 'hyperquote-website')
		assert.equal(company.apps.portal.cookieName, 'hyperquote_customer_auth')
		assert.equal(company.apps.internal.cookieName, 'hyperquote_internal_auth')
		assert.equal(company.apps.driver.cookieName, 'hyperquote_driver_auth')
	})

	it('generates the existing HyperQuote production build env', () => {
		const company = loadCompanyRegistry('hyperquote')
		const app = companyAppById(company, 'portal')
		const env = companyBuildEnv(company, app, {
			SUPABASE_ANON_KEY: 'anon',
			SUPABASE_URL: 'https://example.supabase.co',
		})
		assert.equal(env.VITE_WEBSITE_URL, 'https://www.hyperquote.net')
		assert.equal(env.VITE_PORTAL_URL, 'https://portal.hyperquote.net')
		assert.equal(env.VITE_INTERNAL_URL, 'https://internal.hyperquote.net')
		assert.equal(env.VITE_DRIVER_API_BASE, 'https://driver.hyperquote.net')
		assert.equal(env.VITE_SUPABASE_COOKIE_NAME, 'hyperquote_customer_auth')
		assert.equal(env.VITE_SUPPORT_EMAIL, 'support@hyperquote.net')
		assert.equal(env.LOGIS_COMPANY_SLUG, 'hyperquote')
		assert.equal(env.LOGIS_RELEASE_CHANNEL, 'stable')
	})

	it('generates Supabase auth config redirects from registry', () => {
		const company = loadCompanyRegistry('hyperquote')
		const config = [
			'project_id = "hyperquote"',
			'site_url = "http://localhost:3000"',
			'additional_redirect_urls = [',
			'  "http://localhost:3000"',
			']',
			'',
			'# Use pre-defined local phone OTPs for development smoke checks.',
			'[auth.sms.test_otp]',
			'"+201000000000" = "123456"',
			'',
		].join('\n')
		const output = companySupabaseConfig(company, config)
		assert.match(output, /project_id = "hyperquote-production"/u)
		assert.match(output, /site_url = "https:\/\/www\.hyperquote\.net"/u)
		assert.match(output, /"https:\/\/driver\.hyperquote\.net\/login"/u)
		assert.doesNotMatch(output, /\[auth\.sms\.test_otp\]/u)
	})

	it('rejects invalid company configs', () => {
		assert.throws(
			() => validateCompanyRegistry({ slug: 'Bad Slug' }, 'fixture'),
			/slug must be lowercase/u,
		)
	})

	it('writes generated Worker config without secrets', () => {
		const company = loadCompanyRegistry('hyperquote')
		const app = companyAppById(company, 'internal')
		const path = writeGeneratedWranglerConfig(company, app)
		assert.match(
			path,
			/\.logis\/generated\/hyperquote\/internal\.wrangler\.json$/u,
		)
	})
})
