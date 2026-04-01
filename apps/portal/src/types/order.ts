export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'quote_ready'
  | 'negotiating'
  | 'accepted'
  | 'order_confirmed'
  | 'being_prepared'
  | 'out_for_delivery'
  | 'delivered'
  | 'expired'
  | 'cancelled'

export interface Order {
  id: string
  reference: string
  status: OrderStatus
  description: string
  itemCount: number
  date: string
  amount: number | null
  currency: 'EGP'
}

export interface OrderFilters {
  status?: OrderStatus
  page: number
  limit: number
  dateRange?: { from: string; to: string }
}

export interface QuoteFilters {
  status?: 'all' | 'pending' | 'ready' | 'negotiating' | 'expired'
  page: number
  limit: number
}

export interface SavedListItem {
  productId: string
  productName: string
  quantity: number
  uom: string
}

export interface SavedList {
  id: string
  name: string
  items: SavedListItem[]
  lastUsedAt: string
  createdAt: string
}
