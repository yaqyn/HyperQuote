import { describe, expect, it } from 'vitest'
import {
	allowedInternalAiVtables,
	buildInternalAiContextPackage,
	buildInternalAiSystemPrompt,
	normalPanelExcludedRequest,
	resolveInternalAiScope,
} from '../lib/internal-ai-context'
import type { SearchDisplayIndexRow } from '../lib/search-display'

describe('internal AI vtable context', () => {
	it('splits normal panel and Search panel vtable access', () => {
		const normalEntities = allowedInternalAiVtables('employee').map(
			(vtable) => vtable.entityType,
		)
		const searchEntities = allowedInternalAiVtables('search').map(
			(vtable) => vtable.entityType,
		)

		expect(normalEntities).toContain('payment')
		expect(normalEntities).toContain('document')
		expect(normalEntities).not.toContain('employee')
		expect(normalEntities).not.toContain('activity')
		expect(searchEntities).toContain('employee')
		expect(searchEntities).toContain('activity')
	})

	it('uses the active Search panel as the Search AI switch', () => {
		expect(
			resolveInternalAiScope({
				panelId: 'search',
				userText: 'show employees and activities',
			}),
		).toBe('search')
		expect(
			resolveInternalAiScope({
				panelId: 'finance',
				userText: 'show payments',
			}),
		).toBe('employee')
		expect(
			resolveInternalAiScope({
				panelId: 'sales',
				userText: 'Search internal database for: employee activity',
			}),
		).toBe('search')
	})

	it('blocks employee and activity requests in normal panel mode', () => {
		expect(normalPanelExcludedRequest('show employee salaries')).toContain(
			'employee information',
		)
		expect(normalPanelExcludedRequest('summarize activity history')).toContain(
			'activity history',
		)
		expect(normalPanelExcludedRequest('show overdue payments')).toBeNull()
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
			panelId: 'finance',
			query: 'payments',
			rows: [row],
			scope: 'employee',
		})

		expect(context.readEntities).toEqual(['ceo_search_payment_vtable'])
		expect(context.context).toContain('Normal panel AI')
		expect(context.context).toContain('Local Cairo Contractors')
		expect(context.context).toContain('Remaining')
		expect(context.context).not.toContain('entity_id')
		expect(
			buildInternalAiSystemPrompt({
				context: context.context,
				panelId: 'finance',
				scope: 'employee',
			}),
		).toContain('except employee information and activities')
	})
})
