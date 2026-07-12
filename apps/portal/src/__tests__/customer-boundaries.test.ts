import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isCustomerDocumentStoragePath,
	safeLegacyDocumentUrl,
} from '../lib/server/document-access'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

describe('customer data boundaries', () => {
	it('only accepts customer-prefixed document object paths', () => {
		const customerId = '11111111-1111-4111-8111-111111111111'
		expect(
			isCustomerDocumentStoragePath(`${customerId}/invoice.pdf`, customerId),
		).toBe(true)
		expect(
			isCustomerDocumentStoragePath(
				'22222222-2222-4222-8222-222222222222/invoice.pdf',
				customerId,
			),
		).toBe(false)
		expect(
			isCustomerDocumentStoragePath(`${customerId}/../invoice.pdf`, customerId),
		).toBe(false)
	})

	it('allows only HTTPS and local HTTP legacy document URLs', () => {
		expect(safeLegacyDocumentUrl('https://files.example.com/invoice.pdf')).toBe(
			'https://files.example.com/invoice.pdf',
		)
		expect(safeLegacyDocumentUrl('http://127.0.0.1:54321/invoice.pdf')).toBe(
			'http://127.0.0.1:54321/invoice.pdf',
		)
		expect(safeLegacyDocumentUrl('http://files.example.com/invoice.pdf')).toBe(
			null,
		)
		expect(safeLegacyDocumentUrl('javascript:alert(1)')).toBe(null)
	})

	it('keeps both quote submission lookups scoped to the customer', () => {
		for (const relativePath of [
			'apps/portal/src/lib/server/quote-requests.ts',
			'apps/website/src/lib/quote-requests.ts',
		]) {
			const source = readFileSync(join(repoRoot, relativePath), 'utf8')
			const lookup = source.slice(
				source.indexOf(".select('id, request_number, status')"),
				source.indexOf(
					'.maybeSingle()',
					source.indexOf(".select('id, request_number, status')"),
				),
			)
			expect(lookup, relativePath).toContain(".eq('customer_id',")
			expect(lookup, relativePath).toContain(".eq('idempotency_key',")
		}
	})
})
