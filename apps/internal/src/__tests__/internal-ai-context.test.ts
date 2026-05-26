import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	allowedInternalAiVtables,
	buildInternalAiContextPackage,
	buildInternalAiSystemPrompt,
	buildInternalAiToolSystemPrompt,
	internalAiPolicyRefusal,
	normalPanelExcludedRequest,
	requestedInternalAiEntityTypes,
	resolveInternalAiScope,
} from '../lib/internal-ai-context'
import type { SearchDisplayIndexRow } from '../lib/search-display'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('internal AI vtable context', () => {
	it('splits normal panel and Search panel vtable access', () => {
		const normalEntities = allowedInternalAiVtables('employee').map(
			(vtable) => vtable.entityType,
		)
		const searchEntities = allowedInternalAiVtables('search').map(
			(vtable) => vtable.entityType,
		)

		expect(normalEntities).toContain('payment')
		expect(normalEntities).toContain('finance')
		expect(normalEntities).toContain('document')
		expect(normalEntities).not.toContain('employee')
		expect(normalEntities).not.toContain('finance_payroll')
		expect(normalEntities).not.toContain('activity')
		expect(searchEntities).toContain('employee')
		expect(searchEntities).toContain('finance_payroll')
		expect(searchEntities).toContain('activity')
	})

	it('keeps the DB search RPC aligned with AI vtable scopes', () => {
		const baseMigration = readWorkspaceFile(
			'supabase/migrations/20260525065956_internal_ai_scoped_search_documents.sql',
		)
		const financeMigration = readWorkspaceFile(
			'supabase/migrations/20260526013854_ceo_search_finance_vtables.sql',
		)
		const migration = `${baseMigration}\n${financeMigration}`
		const aiChatSource = readWorkspaceFile('apps/internal/src/lib/ai-chat.ts')
		const authServerSource = readWorkspaceFile('packages/auth/src/server.ts')
		const normalEntities = allowedInternalAiVtables('employee').map(
			(vtable) => vtable.entityType,
		)
		const searchEntities = allowedInternalAiVtables('search').map(
			(vtable) => vtable.entityType,
		)
		const normalBranch = financeMigration.slice(
			financeMigration.indexOf('else array['),
			financeMigration.indexOf(
				'\n\t\t\tend',
				financeMigration.indexOf('else array['),
			),
		)

		expect(aiChatSource).toContain("client.rpc('internal_ai_search_documents'")
		expect(aiChatSource).not.toContain(".from('ceo_search_documents')")
		expect(authServerSource).toContain("'internal_ai_search_documents'")
		expect(baseMigration).toContain(
			'create or replace function app_private.internal_ai_search_documents',
		)
		expect(baseMigration).toContain(
			'create or replace function public.service_internal_ai_search_documents',
		)
		expect(migration).toContain(
			"if p_agent_scope = 'search' and not public.can_access_ceo_search()",
		)
		for (const entityType of normalEntities) {
			expect(normalBranch).toContain(`'${entityType}'`)
		}
		expect(normalBranch).not.toContain("'employee'")
		expect(normalBranch).not.toContain("'finance_payroll'")
		expect(normalBranch).not.toContain("'activity'")
		for (const entityType of searchEntities) {
			expect(migration).toContain(`'${entityType}'`)
		}
	})

	it('uses the active Search panel as the Search AI switch', () => {
		expect(
			resolveInternalAiScope({
				panelId: 'search',
			}),
		).toBe('search')
		expect(
			resolveInternalAiScope({
				panelId: 'finance',
			}),
		).toBe('employee')
		expect(
			resolveInternalAiScope({
				panelId: 'sales',
			}),
		).toBe('employee')
	})

	it('blocks employee and activity requests in normal panel mode', () => {
		expect(normalPanelExcludedRequest('show employee salaries')).toContain(
			'employee information',
		)
		expect(normalPanelExcludedRequest('show payroll')).toContain(
			'employee information',
		)
		expect(normalPanelExcludedRequest('summarize activity history')).toContain(
			'activity history',
		)
		expect(normalPanelExcludedRequest('show overdue payments')).toBeNull()
	})

	it('blocks workflow writes without blocking read-only status questions', () => {
		expect(internalAiPolicyRefusal('approve this order', 'employee')).toContain(
			'read-only',
		)
		expect(
			internalAiPolicyRefusal('change status to delivered', 'search'),
		).toContain('read-only')
		expect(
			internalAiPolicyRefusal('show approved orders', 'employee'),
		).toBeNull()
		expect(
			internalAiPolicyRefusal('summarize rejected orders', 'search'),
		).toBeNull()
	})

	it('builds business context and audit entities from allowed vtable rows', () => {
		const row: SearchDisplayIndexRow = {
			entity_id: 'customer_order:order-1',
			entity_type: 'payment',
			metadata: {
				amount_paid: 500,
				company_name: 'Local Cairo Contractors',
				payment_status: 'partial',
				remaining_due: 1500,
				source: 'customer_payment',
				total_due: 2000,
			},
			search_text: 'customer payment Local Cairo Contractors partial',
			sort_at: '2026-05-24T09:00:00Z',
			subtitle: 'partial',
			title: 'Customer payment - ORD-2026-00067',
		}

		const context = buildInternalAiContextPackage({
			panelId: 'sales',
			query: 'payments',
			rows: [row],
			scope: 'employee',
		})

		expect(context.readEntities).toEqual(['ceo_search_payment_vtable'])
		expect(context.context).toContain('Normal internal AI')
		expect(context.context).not.toContain('Active panel')
		expect(context.context).not.toContain('Sales')
		expect(context.context).toContain('Local Cairo Contractors')
		expect(context.context).toContain('Remaining')
		expect(context.context).not.toContain('entity_id')
		const systemPrompt = buildInternalAiSystemPrompt({
			context: context.context,
			panelId: 'sales',
			scope: 'employee',
		})
		expect(systemPrompt).toContain('except employee information and activities')
		expect(systemPrompt).not.toContain('Active panel')
		expect(systemPrompt).not.toContain('Sales')
		expect(systemPrompt).toContain('Do not tell the user to open another panel')
		expect(systemPrompt).toContain('"Next step" headings')
		expect(systemPrompt).toContain('current screen')
	})

	it('maps accounting and payroll rows to the correct read entities', () => {
		const accountingRow: SearchDisplayIndexRow = {
			entity_id: 'journal_entry:entry-1',
			entity_type: 'finance',
			metadata: {
				entry_number: 'JE-2026-000001',
				source: 'finance_journal_entry',
				status: 'draft',
			},
			search_text: 'finance accounting journal',
			sort_at: '2026-05-26T09:00:00Z',
			subtitle: 'draft',
			title: 'Journal entry JE-2026-000001',
		}
		const payrollRow: SearchDisplayIndexRow = {
			entity_id: 'finance_payroll:employee-1',
			entity_type: 'finance_payroll',
			metadata: {
				base_salary: 12000,
				employee_name: 'Mona Finance',
				source: 'finance_payroll',
			},
			search_text: 'finance payroll salary Mona Finance',
			sort_at: '2026-05-26T09:00:00Z',
			subtitle: 'Finance',
			title: 'Payroll - Mona Finance',
		}

		expect(
			buildInternalAiContextPackage({
				query: 'journal',
				rows: [accountingRow],
				scope: 'employee',
			}).readEntities,
		).toEqual([
			'ceo_search_finance_vtable',
			'ceo_search_finance_damage_vtable',
			'ceo_search_inventory_damage_activity_vtable',
		])
		expect(
			buildInternalAiContextPackage({
				query: 'payroll',
				rows: [payrollRow],
				scope: 'search',
			}).readEntities,
		).toEqual(['ceo_search_index', 'ceo_search_finance_payroll_vtable'])
	})

	it('routes broad Search AI finance intent to the CEO finance vtable', () => {
		const entityTypes = requestedInternalAiEntityTypes({
			query: 'show finance panel records',
			scope: 'search',
		})

		expect(entityTypes).toContain('payment')
		expect(entityTypes).toContain('finance')
		expect(
			buildInternalAiContextPackage({
				queriedEntityTypes: entityTypes,
				query: 'show finance panel records',
				rows: [],
				scope: 'search',
			}).readEntities,
		).toEqual(
			expect.arrayContaining([
				'ceo_search_index',
				'ceo_search_payment_vtable',
				'ceo_search_finance_vtable',
				'ceo_search_finance_damage_vtable',
				'ceo_search_inventory_damage_activity_vtable',
			]),
		)
	})

	it('routes damaged inventory questions to finance damage records', () => {
		const entityTypes = requestedInternalAiEntityTypes({
			query: 'show damaged inventory write downs and NRV',
			scope: 'employee',
		})

		expect(entityTypes).toContain('finance')
		expect(entityTypes).toContain('inventory')
		expect(
			buildInternalAiContextPackage({
				queriedEntityTypes: entityTypes,
				query: 'show damaged inventory write downs and NRV',
				rows: [],
				scope: 'employee',
			}).readEntities,
		).toEqual(
			expect.arrayContaining([
				'ceo_search_finance_vtable',
				'ceo_search_finance_damage_vtable',
				'ceo_search_inventory_damage_activity_vtable',
				'ceo_search_inventory_vtable',
			]),
		)
	})

	it('tells Lyon to infer natural language intent and call tools', () => {
		const prompt = buildInternalAiToolSystemPrompt({ scope: 'employee' })

		expect(prompt).toContain('call search_internal_records before answering')
		expect(prompt).toContain('natural, messy, slangy, misspelled')
		expect(prompt).toContain('Do not require exact keywords')
		expect(prompt).toContain('Tools are the source of truth')
		expect(prompt).toContain('generic navigation advice')
		expect(prompt).toContain('except employee information and activities')
	})
})
