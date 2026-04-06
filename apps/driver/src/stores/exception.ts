import { create } from 'zustand'
import { db } from '../lib/powersync'
import { queuePhotoUpload } from '../lib/upload-queue'

export type ExceptionType =
  | 'customer_unavailable'
  | 'site_blocked'
  | 'wrong_address'
  | 'damaged_goods'
  | 'partial_delivery'
  | 'weather_delay'
  | 'vehicle_issue'

export const EXCEPTION_TYPES: readonly {
  type: ExceptionType
  labelKey: string
  requiresPhoto: boolean
}[] = [
  { type: 'customer_unavailable', labelKey: 'exception.types.customerUnavailable', requiresPhoto: false },
  { type: 'site_blocked', labelKey: 'exception.types.siteBlocked', requiresPhoto: true },
  { type: 'wrong_address', labelKey: 'exception.types.wrongAddress', requiresPhoto: true },
  { type: 'damaged_goods', labelKey: 'exception.types.damagedGoods', requiresPhoto: true },
  { type: 'partial_delivery', labelKey: 'exception.types.partialDelivery', requiresPhoto: false },
  { type: 'weather_delay', labelKey: 'exception.types.weatherDelay', requiresPhoto: true },
  { type: 'vehicle_issue', labelKey: 'exception.types.vehicleIssue', requiresPhoto: true },
] as const

/** Maps exception type to delivery failure_reason column value */
const FAILURE_REASON_MAP: Record<ExceptionType, string> = {
  customer_unavailable: 'customer_absent',
  site_blocked: 'access_blocked',
  wrong_address: 'wrong_address',
  damaged_goods: 'damaged_in_transit',
  partial_delivery: 'customer_refused',
  weather_delay: 'weather',
  vehicle_issue: 'vehicle_breakdown',
}

interface ExceptionState {
  type: ExceptionType | null
  deliveryId: string | null
  stopId: string | null
  photos: string[]
  gpsLat: number | null
  gpsLng: number | null
  details: Record<string, unknown>
  step: number

  setType: (type: ExceptionType) => void
  setDelivery: (deliveryId: string, stopId: string) => void
  addPhoto: (uri: string) => void
  removePhoto: (index: number) => void
  setDetails: (key: string, value: unknown) => void
  setGps: (lat: number, lng: number) => void
  nextStep: () => void
  prevStep: () => void
  submit: () => Promise<void>
  reset: () => void
}

const initialState = {
  type: null as ExceptionType | null,
  deliveryId: null as string | null,
  stopId: null as string | null,
  photos: [] as string[],
  gpsLat: null as number | null,
  gpsLng: null as number | null,
  details: {} as Record<string, unknown>,
  step: 0,
}

export const useExceptionStore = create<ExceptionState>((set, get) => ({
  ...initialState,

  setType: (type) => set({ type, step: 1 }),

  setDelivery: (deliveryId, stopId) => set({ deliveryId, stopId }),

  addPhoto: (uri) => set((state) => ({ photos: [...state.photos, uri] })),

  removePhoto: (index) =>
    set((state) => ({
      photos: state.photos.filter((_, i) => i !== index),
    })),

  setDetails: (key, value) =>
    set((state) => ({
      details: { ...state.details, [key]: value },
    })),

  setGps: (lat, lng) => set({ gpsLat: lat, gpsLng: lng }),

  nextStep: () => set((state) => ({ step: state.step + 1 })),

  prevStep: () => set((state) => ({ step: Math.max(0, state.step - 1) })),

  submit: async () => {
    const state = get()
    if (!state.type || !state.deliveryId) return

    const exceptionId = crypto.randomUUID()
    const now = new Date().toISOString()
    const failureReason = FAILURE_REASON_MAP[state.type]

    // Insert exception record
    await db.execute(
      `INSERT INTO delivery_exceptions (id, delivery_id, stop_id, type, photos, gps_lat, gps_lng, details, resolution, dispatch_notified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exceptionId,
        state.deliveryId,
        state.stopId ?? '',
        state.type,
        JSON.stringify(state.photos),
        state.gpsLat ?? 0,
        state.gpsLng ?? 0,
        JSON.stringify(state.details),
        '',
        'false',
        now,
      ]
    )

    // Update delivery failure reason
    await db.execute(
      'UPDATE deliveries SET failure_reason = ? WHERE id = ?',
      [failureReason, state.deliveryId]
    )

    // Queue photos for upload
    for (const photoUri of state.photos) {
      await queuePhotoUpload(photoUri, {
        type: 'exception',
        entityId: exceptionId,
      })
    }
  },

  reset: () => set(initialState),
}))
