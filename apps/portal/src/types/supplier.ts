export interface SupplierProduct {
  id: string
  name: string
  nameAr: string
  sku: string
  currentPrice: number
  currency: string
  stockQuantity: number
  minOrderQuantity: number | null
  leadTimeDays: number | null
  lastUpdatedAt: string
  status: 'active' | 'low_stock' | 'out_of_stock' | 'suppressed'
  supplierId: string
}

export interface SupplierPO {
  id: string
  reference: string
  status:
    | 'sent'
    | 'acknowledged'
    | 'confirmed'
    | 'rejected'
    | 'in_production'
    | 'shipped'
    | 'delivered'
  dateReceived: string
  responseDeadline: string
  items: SupplierPOLine[]
  deliverySchedule?: DeliverySchedule
}

export interface SupplierPOLine {
  id: string
  productName: string
  productNameAr: string
  sku: string
  quantityRequested: number
  unitPrice: number
  lineTotal: number
  confirmed: boolean
  reason?:
    | 'out_of_stock'
    | 'partial_only'
    | 'price_changed'
    | 'lead_time_needed'
  partialQuantity?: number
  newPrice?: number
}

export interface DeliverySchedule {
  estimatedShipDate: string
  deliveryMethod: 'supplier_delivers' | 'hyperquote_pickup'
  trackingNumber?: string
  notes?: string
}

export interface SupplierInvoice {
  id: string
  invoiceNumber: string
  poReference: string
  status:
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'paid'
    | 'disputed'
  subtotal: number
  taxAmount: number
  total: number
  currency: string
  invoiceDate: string
  submittedAt: string
  fileUrl?: string
}

export interface PriceHistoryEntry {
  id: string
  productName: string
  productNameAr: string
  oldPrice: number
  newPrice: number
  changedBy: string
  changedAt: string
  status: 'applied' | 'pending_review' | 'rejected'
}

export interface CatalogUpload {
  id: string
  filename: string
  uploadedAt: string
  itemsParsed: number
  status: 'processing' | 'completed' | 'failed' | 'review_required'
  parsedItems?: CatalogParsedItem[]
}

export interface CatalogParsedItem {
  id: string
  productName: string
  productNameAr: string
  sku: string
  price: number
  quantity: number
  confidence: number
  originalText: string
}

export interface SupplierAnalytics {
  revenue: { value: number; trend: number }
  fillRate: { value: number; trend: number }
  onTimeRate: { value: number; trend: number }
  quoteInclusion: { value: number; trend: number }
  monthlyRevenue: { month: string; revenue: number }[]
  topProducts: ProductPerformance[]
}

export interface ProductPerformance {
  id: string
  productName: string
  productNameAr: string
  views: number
  quoteInclusions: number
  purchaseOrders: number
  revenue: number
  winRate: number
}
