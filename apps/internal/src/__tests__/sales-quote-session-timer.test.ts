import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/internal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('sales quote session timer', () => {
	it('keeps quote timer tracking behind the internal service-role boundary', () => {
		const migration = readRepoFile(
			'supabase/migrations/20260706061500_sales_quote_sessions_employee_flags.sql',
		)
		const authServer = readRepoFile('packages/auth/src/server.ts')
		const salesServer = readRepoFile(
			'apps/internal/src/lib/server/sales-rfq.ts',
		)
		const quoteBuilder = readRepoFile(
			'apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx',
		)

		expect(migration).toContain(
			'create table if not exists public.employee_quote_sessions',
		)
		expect(migration).toContain(
			'create table if not exists public.employee_management_flags',
		)
		expect(migration).toContain('flag_type')
		expect(migration).toContain('quote_open_too_long')
		expect(migration).toContain(
			'alter table public.employee_quote_sessions enable row level security',
		)
		expect(migration).toContain(
			'alter table public.employee_management_flags enable row level security',
		)
		expect(migration).toContain(
			'revoke all on public.employee_quote_sessions from anon, authenticated',
		)
		expect(migration).toContain(
			'grant all on public.employee_quote_sessions to service_role',
		)
		expect(migration).toContain('service_sales_start_quote_session')
		expect(migration).toContain('service_sales_heartbeat_quote_session')
		expect(migration).toContain('service_sales_close_quote_session')
		expect(migration).toContain("'closed_by', 'sales_close_quote_session'")
		expect(migration).toContain(
			'revoke all on function public.sales_start_quote_session(uuid, uuid, integer) from public, anon, authenticated',
		)
		expect(migration).toContain(
			'grant execute on function public.service_sales_heartbeat_quote_session(uuid, text, uuid, uuid, integer) to service_role',
		)

		expect(authServer).toContain("'sales_start_quote_session'")
		expect(authServer).toContain("'sales_heartbeat_quote_session'")
		expect(authServer).toContain("'sales_close_quote_session'")

		expect(salesServer).toContain('export const startSalesQuoteSession')
		expect(salesServer).toContain('export const heartbeatSalesQuoteSession')
		expect(salesServer).toContain('export const closeSalesQuoteSession')
		expect(salesServer).toContain('employeeQuoteSessionRowSchema.parse')

		expect(quoteBuilder).toContain('QUOTE_SESSION_FLAG_SECONDS')
		expect(quoteBuilder).toContain('function QuoteSessionTimer')
		expect(quoteBuilder).toContain('startSalesQuoteSession')
		expect(quoteBuilder).toContain('heartbeatSalesQuoteSession')
		expect(quoteBuilder).toContain('closeSalesQuoteSession')
	})
})
