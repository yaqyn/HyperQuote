/**
 * Supplier purchase order server functions.
 * PO listing, confirm/reject, delivery note upload.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierPO } from '../../types/supplier'

// ============================================================================
// Helper: check if Supabase is configured
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

function getMockPOs(): SupplierPO[] {
  const now = new Date()
  return [
    {
      id: 'po-001',
      reference: 'HQ-2026-0042',
      status: 'sent',
      dateReceived: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      responseDeadline: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'pol-001',
          productName: 'Portland Cement 50kg',
          productNameAr: 'أسمنت بورتلاندي ٥٠ كجم',
          sku: 'CEM-50K-001',
          quantityRequested: 500,
          unitPrice: 85,
          lineTotal: 42500,
          confirmed: true,
        },
        {
          id: 'pol-002',
          productName: 'Rebar 12mm',
          productNameAr: 'حديد تسليح ١٢ مم',
          sku: 'REB-12M-001',
          quantityRequested: 10,
          unitPrice: 32500,
          lineTotal: 325000,
          confirmed: true,
        },
      ],
    },
    {
      id: 'po-002',
      reference: 'HQ-2026-0039',
      status: 'sent',
      dateReceived: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      responseDeadline: new Date(now.getTime() + 16 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'pol-003',
          productName: 'Washed Sand',
          productNameAr: 'رمل مغسول',
          sku: 'SND-WSH-001',
          quantityRequested: 100,
          unitPrice: 250,
          lineTotal: 25000,
          confirmed: true,
        },
        {
          id: 'pol-004',
          productName: 'Gravel 20mm',
          productNameAr: 'زلط ٢٠ مم',
          sku: 'GRV-20M-001',
          quantityRequested: 80,
          unitPrice: 280,
          lineTotal: 22400,
          confirmed: true,
        },
      ],
    },
    {
      id: 'po-003',
      reference: 'HQ-2026-0035',
      status: 'confirmed',
      dateReceived: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      responseDeadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'pol-005',
          productName: 'Red Bricks',
          productNameAr: 'طوب أحمر',
          sku: 'BRK-RED-001',
          quantityRequested: 5000,
          unitPrice: 1200,
          lineTotal: 6000000,
          confirmed: true,
        },
      ],
      deliverySchedule: {
        estimatedShipDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryMethod: 'supplier_delivers',
        notes: 'Will deliver in 2 batches',
      },
    },
    {
      id: 'po-004',
      reference: 'HQ-2026-0028',
      status: 'shipped',
      dateReceived: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      responseDeadline: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'pol-006',
          productName: 'Welded Steel Mesh 6mm',
          productNameAr: 'شبك حديد ملحوم ٦ مم',
          sku: 'MSH-6MM-001',
          quantityRequested: 50,
          unitPrice: 4500,
          lineTotal: 225000,
          confirmed: true,
        },
      ],
      deliverySchedule: {
        estimatedShipDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryMethod: 'supplier_delivers',
        trackingNumber: 'TRK-2026-8842',
      },
    },
    {
      id: 'po-005',
      reference: 'HQ-2026-0020',
      status: 'delivered',
      dateReceived: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      responseDeadline: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'pol-007',
          productName: 'Portland Cement 50kg',
          productNameAr: 'أسمنت بورتلاندي ٥٠ كجم',
          sku: 'CEM-50K-001',
          quantityRequested: 1000,
          unitPrice: 80,
          lineTotal: 80000,
          confirmed: true,
        },
        {
          id: 'pol-008',
          productName: 'Rebar 16mm',
          productNameAr: 'حديد تسليح ١٦ مم',
          sku: 'REB-16M-001',
          quantityRequested: 20,
          unitPrice: 34000,
          lineTotal: 680000,
          confirmed: true,
        },
      ],
      deliverySchedule: {
        estimatedShipDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryMethod: 'hyperquote_pickup',
      },
    },
  ]
}

// ============================================================================
// getSupplierPOs
// ============================================================================

export const getSupplierPOs = createServerFn()
  .inputValidator(
    z.object({
      status: z.string().optional(),
      page: z.number(),
      limit: z.number(),
    }),
  )
  .handler(
    async ({
      data: input,
    }): Promise<{ purchaseOrders: SupplierPO[]; total: number }> => {
      if (!isSupabaseConfigured()) {
        let pos = getMockPOs()
        if (input.status && input.status !== 'all') {
          pos = pos.filter((po) => po.status === input.status)
        }
        return { purchaseOrders: pos, total: pos.length }
      }

      // TODO: Real Supabase query
      const pos = getMockPOs()
      return { purchaseOrders: pos, total: pos.length }
    },
  )

// ============================================================================
// confirmPO
// ============================================================================

export const confirmPO = createServerFn()
  .inputValidator(
    z.object({
      poId: z.string(),
      lines: z.array(
        z.object({
          lineId: z.string(),
          confirmed: z.boolean(),
          reason: z.string().optional(),
          partialQuantity: z.number().optional(),
          newPrice: z.number().optional(),
        }),
      ),
      deliverySchedule: z.object({
        estimatedShipDate: z.string(),
        deliveryMethod: z.string(),
        trackingNumber: z.string().optional(),
        notes: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Real Supabase query
    return { success: true }
  })

// ============================================================================
// rejectPO
// ============================================================================

export const rejectPO = createServerFn()
  .inputValidator(
    z.object({
      poId: z.string(),
      reason: z.string(),
    }),
  )
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Real Supabase query
    return { success: true }
  })

// ============================================================================
// uploadDeliveryNote
// ============================================================================

export const uploadDeliveryNote = createServerFn()
  .inputValidator(
    z.object({
      poId: z.string(),
      fileUrl: z.string(),
      deliveryDate: z.string(),
      quantity: z.number(),
    }),
  )
  .handler(async ({ data: input }): Promise<{ deliveryNoteId: string }> => {
    if (!isSupabaseConfigured()) {
      return { deliveryNoteId: crypto.randomUUID() }
    }

    // TODO: Real Supabase query — upload file to R2, notify warehouse
    return { deliveryNoteId: crypto.randomUUID() }
  })
