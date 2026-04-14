export type OrderType = 'saved' | 'submitted' | 'confirmed'

export interface OrderItem {
  productId: string
  productName: string
  productNameAr: string
  quantity: number
  unitOfMeasure: string
  imageUrl: string
  category: string
}

export interface Order {
  id: string
  type: OrderType
  name?: string
  reference?: string
  items: OrderItem[]
  itemCount: number
  description: string
  date: string
  amount: number | null
  currency: 'EGP'
}
