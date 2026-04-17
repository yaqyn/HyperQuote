/**
 * CEO attention items server function.
 * Surfaces critical items requiring CEO attention from materialized view.
 */
import { createServerFn } from '@tanstack/react-start'
import type { AttentionItem } from '../../types/attention'

// ============================================================================
// Helper
// ============================================================================

function isSupabaseConfigured(): boolean {
	return !!(
		process.env.SUPABASE_URL &&
		process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
		process.env.SUPABASE_ANON_KEY &&
		process.env.SUPABASE_ANON_KEY !== 'placeholder'
	)
}

// ============================================================================
// Mock data
// ============================================================================

function getMockAttentionItems(): AttentionItem[] {
	return [
		{
			id: 'att-001',
			type: 'bounced_cheque',
			severity: 'critical',
			entityName: 'Al-Masriya Construction Co.',
			description: 'Bounced cheque -- EGP 250,000 (Mar 28)',
			amount: 250000,
			entityType: 'customer',
			entityId: 'cust-001',
			createdAt: '2026-03-28T10:00:00Z',
		},
		{
			id: 'att-002',
			type: 'ar_overdue',
			severity: 'critical',
			entityName: 'Delta Construction Group',
			description: 'AR overdue 94 days -- EGP 1,200,000',
			amount: 1200000,
			entityType: 'customer',
			entityId: 'cust-004',
			createdAt: '2026-03-27T08:00:00Z',
		},
		{
			id: 'att-003',
			type: 'delivery_failure',
			severity: 'warning',
			entityName: 'DEL-4519',
			description: 'Delivery failed -- driver reported site access denied',
			entityType: 'delivery',
			entityId: 'del-4519',
			createdAt: '2026-03-28T14:30:00Z',
		},
		{
			id: 'att-004',
			type: 'margin_alert',
			severity: 'warning',
			entityName: 'ORD-1210',
			description: 'Margin below floor at 4.2% (floor: 8%)',
			entityType: 'order',
			entityId: 'ord-1210',
			createdAt: '2026-03-28T09:15:00Z',
		},
		{
			id: 'att-005',
			type: 'po_rejection',
			severity: 'warning',
			entityName: 'Suez Timber',
			description: 'PO-8821 rejected -- minimum order not met',
			entityType: 'supplier',
			entityId: 'sup-003',
			createdAt: '2026-03-27T16:00:00Z',
		},
	]
}

// ============================================================================
// getCEOAttentionItems
// ============================================================================

export const getCEOAttentionItems = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{ items: AttentionItem[]; count: number }> => {
		if (isSupabaseConfigured()) {
			// TODO: Real query from ceo_attention_items materialized view
		}

		const items = getMockAttentionItems()
		return { items, count: items.length }
	},
)
