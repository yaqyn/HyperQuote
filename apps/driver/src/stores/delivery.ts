import { create } from 'zustand'
import { db } from '../lib/powersync'

export interface Delivery {
  id: string
  order_id: string
  route_id: string
  driver_id: string
  customer_id: string
  status: string
  scheduled_date: string
  actual_arrival: string
  actual_departure: string
  pod_signature_url: string
  pod_photos: string
  notes: string
}

export type DeliveryItemStatus =
  | 'pending'
  | 'delivered'
  | 'partial'
  | 'damaged'
  | 'refused'

export type PartialDeliveryReason =
  | 'damaged_at_warehouse'
  | 'not_loaded'
  | 'customer_request'
  | 'other'

export interface DeliveryItem {
  id: string
  delivery_id: string
  product_id: string
  product_name: string
  quantity_expected: number
  quantity_delivered: number
  unit: string
  status: DeliveryItemStatus
  damage_notes: string
  photo_url: string
}

interface DeliveryState {
  activeDelivery: Delivery | null
  items: DeliveryItem[]
  unloadingStartedAt: string | null
  unloadingDuration: number

  // Derived
  allItemsResolved: boolean

  // Actions
  loadDelivery: (deliveryId: string) => Promise<void>
  confirmItem: (itemId: string) => Promise<void>
  adjustQuantity: (
    itemId: string,
    quantity: number,
    reason: PartialDeliveryReason
  ) => Promise<void>
  flagDamage: (
    itemId: string,
    notes: string,
    photoUri: string
  ) => Promise<void>
  startUnloadingTimer: () => void
  stopUnloadingTimer: () => void
  completeDelivery: () => Promise<void>
  reset: () => void
}

let timerInterval: ReturnType<typeof setInterval> | null = null

function computeAllResolved(items: DeliveryItem[]): boolean {
  return (
    items.length > 0 && items.every((item) => item.status !== 'pending')
  )
}

const initialState = {
  activeDelivery: null as Delivery | null,
  items: [] as DeliveryItem[],
  unloadingStartedAt: null as string | null,
  unloadingDuration: 0,
  allItemsResolved: false,
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  ...initialState,

  loadDelivery: async (deliveryId) => {
    const deliveries = await db.getAll<Delivery>(
      'SELECT * FROM deliveries WHERE id = ?',
      [deliveryId]
    )
    const delivery = deliveries[0] ?? null

    const items = await db.getAll<DeliveryItem>(
      'SELECT * FROM delivery_items WHERE delivery_id = ?',
      [deliveryId]
    )

    set({
      activeDelivery: delivery,
      items,
      unloadingStartedAt: null,
      unloadingDuration: 0,
      allItemsResolved: computeAllResolved(items),
    })
  },

  confirmItem: async (itemId) => {
    const item = get().items.find((i) => i.id === itemId)
    if (!item) return

    await db.execute(
      'UPDATE delivery_items SET status = ?, quantity_delivered = ? WHERE id = ?',
      ['delivered', item.quantity_expected, itemId]
    )

    const items = get().items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            status: 'delivered' as DeliveryItemStatus,
            quantity_delivered: i.quantity_expected,
          }
        : i
    )
    set({ items, allItemsResolved: computeAllResolved(items) })
  },

  adjustQuantity: async (itemId, quantity, reason) => {
    await db.execute(
      'UPDATE delivery_items SET status = ?, quantity_delivered = ?, damage_notes = ? WHERE id = ?',
      ['partial', quantity, reason, itemId]
    )

    const items = get().items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            status: 'partial' as DeliveryItemStatus,
            quantity_delivered: quantity,
            damage_notes: reason,
          }
        : i
    )
    set({ items, allItemsResolved: computeAllResolved(items) })
  },

  flagDamage: async (itemId, notes, photoUri) => {
    await db.execute(
      'UPDATE delivery_items SET status = ?, damage_notes = ?, photo_url = ? WHERE id = ?',
      ['damaged', notes, photoUri, itemId]
    )

    const items = get().items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            status: 'damaged' as DeliveryItemStatus,
            damage_notes: notes,
            photo_url: photoUri,
          }
        : i
    )
    set({ items, allItemsResolved: computeAllResolved(items) })
  },

  startUnloadingTimer: () => {
    if (timerInterval) return
    const now = new Date().toISOString()
    set({ unloadingStartedAt: now })

    timerInterval = setInterval(() => {
      const { unloadingStartedAt } = get()
      if (!unloadingStartedAt) return
      const elapsed = Math.floor(
        (Date.now() - new Date(unloadingStartedAt).getTime()) / 1000
      )
      set({ unloadingDuration: elapsed })
    }, 1000)
  },

  stopUnloadingTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  },

  completeDelivery: async () => {
    const { activeDelivery, items, allItemsResolved } = get()
    if (!activeDelivery || !allItemsResolved) return

    const now = new Date().toISOString()
    await db.execute(
      'UPDATE deliveries SET status = ?, actual_departure = ? WHERE id = ?',
      ['delivered', now, activeDelivery.id]
    )

    set({
      activeDelivery: { ...activeDelivery, status: 'delivered', actual_departure: now },
    })
  },

  reset: () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    set(initialState)
  },
}))
