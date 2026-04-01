/**
 * Supplier stock & pricing server functions.
 * Product listing, inline updates, bulk price CSV, price history.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierProduct, PriceHistoryEntry } from '../../types/supplier'

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

function getMockProducts(): SupplierProduct[] {
  const now = new Date()
  return [
    {
      id: 'sp-001',
      name: 'Portland Cement 50kg',
      nameAr: 'أسمنت بورتلاندي ٥٠ كجم',
      sku: 'CEM-50K-001',
      currentPrice: 85,
      currency: 'EGP',
      stockQuantity: 12000,
      minOrderQuantity: 100,
      leadTimeDays: null,
      lastUpdatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-002',
      name: 'Rebar 12mm',
      nameAr: 'حديد تسليح ١٢ مم',
      sku: 'REB-12M-001',
      currentPrice: 32500,
      currency: 'EGP',
      stockQuantity: 450,
      minOrderQuantity: 5,
      leadTimeDays: 3,
      lastUpdatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-003',
      name: 'Washed Sand',
      nameAr: 'رمل مغسول',
      sku: 'SND-WSH-001',
      currentPrice: 250,
      currency: 'EGP',
      stockQuantity: 5000,
      minOrderQuantity: 10,
      leadTimeDays: 1,
      lastUpdatedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-004',
      name: 'Gravel 20mm',
      nameAr: 'زلط ٢٠ مم',
      sku: 'GRV-20M-001',
      currentPrice: 280,
      currency: 'EGP',
      stockQuantity: 3000,
      minOrderQuantity: 10,
      leadTimeDays: 1,
      lastUpdatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'low_stock',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-005',
      name: 'Red Bricks',
      nameAr: 'طوب أحمر',
      sku: 'BRK-RED-001',
      currentPrice: 1200,
      currency: 'EGP',
      stockQuantity: 0,
      minOrderQuantity: 1,
      leadTimeDays: 5,
      lastUpdatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'out_of_stock',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-006',
      name: 'Rebar 16mm',
      nameAr: 'حديد تسليح ١٦ مم',
      sku: 'REB-16M-001',
      currentPrice: 34000,
      currency: 'EGP',
      stockQuantity: 200,
      minOrderQuantity: 5,
      leadTimeDays: 3,
      lastUpdatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-007',
      name: 'Welded Steel Mesh 6mm',
      nameAr: 'شبك حديد ملحوم ٦ مم',
      sku: 'MSH-6MM-001',
      currentPrice: 4500,
      currency: 'EGP',
      stockQuantity: 80,
      minOrderQuantity: null,
      leadTimeDays: 7,
      lastUpdatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      supplierId: 'sup-001',
    },
    {
      id: 'sp-008',
      name: 'White Cement 50kg',
      nameAr: 'أسمنت أبيض ٥٠ كجم',
      sku: 'CEM-WHT-001',
      currentPrice: 150,
      currency: 'EGP',
      stockQuantity: 500,
      minOrderQuantity: 50,
      leadTimeDays: null,
      lastUpdatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'suppressed',
      supplierId: 'sup-001',
    },
  ]
}

function getMockPriceHistory(): PriceHistoryEntry[] {
  const now = new Date()
  return [
    {
      id: 'ph-001',
      productName: 'Portland Cement 50kg',
      productNameAr: 'أسمنت بورتلاندي ٥٠ كجم',
      oldPrice: 80,
      newPrice: 85,
      changedBy: 'Ahmed Hassan',
      changedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'applied',
    },
    {
      id: 'ph-002',
      productName: 'Rebar 12mm',
      productNameAr: 'حديد تسليح ١٢ مم',
      oldPrice: 31000,
      newPrice: 32500,
      changedBy: 'Ahmed Hassan',
      changedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'applied',
    },
    {
      id: 'ph-003',
      productName: 'Gravel 20mm',
      productNameAr: 'زلط ٢٠ مم',
      oldPrice: 270,
      newPrice: 290,
      changedBy: 'Mohamed Ali',
      changedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending_review',
    },
    {
      id: 'ph-004',
      productName: 'Red Bricks',
      productNameAr: 'طوب أحمر',
      oldPrice: 1100,
      newPrice: 1350,
      changedBy: 'Mohamed Ali',
      changedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'rejected',
    },
    {
      id: 'ph-005',
      productName: 'Washed Sand',
      productNameAr: 'رمل مغسول',
      oldPrice: 240,
      newPrice: 250,
      changedBy: 'Ahmed Hassan',
      changedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'applied',
    },
  ]
}

// ============================================================================
// getSupplierProducts
// ============================================================================

export const getSupplierProducts = createServerFn()
  .inputValidator(
    z.object({
      page: z.number(),
      limit: z.number(),
      search: z.string().optional(),
    }),
  )
  .handler(
    async ({
      data: input,
    }): Promise<{ products: SupplierProduct[]; total: number }> => {
      if (!isSupabaseConfigured()) {
        let products = getMockProducts()
        if (input.search) {
          const s = input.search.toLowerCase()
          products = products.filter(
            (p) =>
              p.name.toLowerCase().includes(s) ||
              p.nameAr.includes(s) ||
              p.sku.toLowerCase().includes(s),
          )
        }
        return { products, total: products.length }
      }

      // TODO: Real Supabase query
      const products = getMockProducts()
      return { products, total: products.length }
    },
  )

// ============================================================================
// updateSupplierStock
// ============================================================================

export const updateSupplierStock = createServerFn()
  .inputValidator(
    z.object({
      productId: z.string(),
      quantity: z.number().optional(),
      price: z.number().optional(),
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
// bulkUpdatePrices
// ============================================================================

export const bulkUpdatePrices = createServerFn()
  .inputValidator(
    z.object({
      updates: z.array(
        z.object({
          productId: z.string(),
          price: z.number().optional(),
          quantity: z.number().optional(),
        }),
      ),
    }),
  )
  .handler(
    async ({
      data: input,
    }): Promise<{ updatedCount: number; errors: string[] }> => {
      if (!isSupabaseConfigured()) {
        return { updatedCount: input.updates.length, errors: [] }
      }

      // TODO: Real Supabase query
      return { updatedCount: input.updates.length, errors: [] }
    },
  )

// ============================================================================
// getSupplierPriceHistory
// ============================================================================

export const getSupplierPriceHistory = createServerFn()
  .inputValidator(
    z.object({
      page: z.number(),
      limit: z.number(),
    }),
  )
  .handler(
    async ({
      data: input,
    }): Promise<{ history: PriceHistoryEntry[]; total: number }> => {
      if (!isSupabaseConfigured()) {
        const history = getMockPriceHistory()
        return { history, total: history.length }
      }

      // TODO: Real Supabase query
      const history = getMockPriceHistory()
      return { history, total: history.length }
    },
  )
