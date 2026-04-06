import { create } from 'zustand'
import { db } from '../lib/powersync'

export interface ScanResult {
  barcode: string
  itemId: string
  matched: boolean
  timestamp: string
}

export interface LoadItem {
  id: string
  productName: string
  barcode: string | null
  quantityExpected: number
  checked: boolean
}

interface LoadingState {
  routeId: string | null
  items: LoadItem[]
  scanResults: ScanResult[]
  truckPhotoUri: string | null
  cargoPhotoUri: string | null
  weightExpected: number
  weightActual: number | null
  signatureUrl: string | null
  confirmed: boolean

  // Derived
  totalExpected: number
  totalScanned: number
  shortItems: LoadItem[]
  weightVariance: number | null
  canDepart: boolean

  // Actions
  initLoading: (routeId: string, items: LoadItem[]) => void
  recordScan: (barcode: string, itemId: string, matched: boolean) => void
  manualCheck: (itemId: string) => void
  setTruckPhoto: (uri: string) => void
  setCargoPhoto: (uri: string) => void
  setWeight: (kg: number) => void
  setSignature: (dataUrl: string) => void
  setConfirmed: (val: boolean) => void
  isOverweight: (gvwr: number) => boolean
  submitLoadVerification: () => Promise<void>
  reset: () => void
}

/** Weight tolerance: +/- 2% */
const WEIGHT_TOLERANCE = 0.02

function computeDerived(state: {
  items: LoadItem[]
  scanResults: ScanResult[]
  weightExpected: number
  weightActual: number | null
  truckPhotoUri: string | null
  cargoPhotoUri: string | null
  signatureUrl: string | null
  confirmed: boolean
}) {
  const totalExpected = state.items.length
  const totalScanned = state.items.filter((i) => i.checked).length
  const shortItems = state.items.filter((i) => !i.checked)

  const weightVariance =
    state.weightActual !== null && state.weightExpected > 0
      ? ((state.weightActual - state.weightExpected) / state.weightExpected) *
        100
      : null

  const allItemsChecked = state.items.length > 0 && totalScanned === totalExpected
  const hasPhotos = !!state.truckPhotoUri && !!state.cargoPhotoUri
  const hasWeight = state.weightActual !== null
  const hasSignature = !!state.signatureUrl
  const canDepart =
    allItemsChecked && hasPhotos && hasWeight && hasSignature && state.confirmed

  return { totalExpected, totalScanned, shortItems, weightVariance, canDepart }
}

const initialState = {
  routeId: null as string | null,
  items: [] as LoadItem[],
  scanResults: [] as ScanResult[],
  truckPhotoUri: null as string | null,
  cargoPhotoUri: null as string | null,
  weightExpected: 0,
  weightActual: null as number | null,
  signatureUrl: null as string | null,
  confirmed: false,
  totalExpected: 0,
  totalScanned: 0,
  shortItems: [] as LoadItem[],
  weightVariance: null as number | null,
  canDepart: false,
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  ...initialState,

  initLoading: (routeId, items) => {
    const weightExpected = 0 // Will be calculated from route total_weight_kg
    const state = {
      routeId,
      items,
      scanResults: [] as ScanResult[],
      truckPhotoUri: null,
      cargoPhotoUri: null,
      weightExpected,
      weightActual: null,
      signatureUrl: null,
      confirmed: false,
    }
    set({ ...state, ...computeDerived(state) })
  },

  recordScan: (barcode, itemId, matched) => {
    const result: ScanResult = {
      barcode,
      itemId,
      matched,
      timestamp: new Date().toISOString(),
    }

    const scanResults = [...get().scanResults, result]
    const items = get().items.map((i) =>
      i.id === itemId && matched ? { ...i, checked: true } : i
    )

    const state = { ...get(), scanResults, items }
    set({ scanResults, items, ...computeDerived(state) })
  },

  manualCheck: (itemId) => {
    const items = get().items.map((i) =>
      i.id === itemId ? { ...i, checked: true } : i
    )
    const state = { ...get(), items }
    set({ items, ...computeDerived(state) })
  },

  setTruckPhoto: (uri) => {
    set({ truckPhotoUri: uri })
    const state = { ...get(), truckPhotoUri: uri }
    set(computeDerived(state))
  },

  setCargoPhoto: (uri) => {
    set({ cargoPhotoUri: uri })
    const state = { ...get(), cargoPhotoUri: uri }
    set(computeDerived(state))
  },

  setWeight: (kg) => {
    set({ weightActual: kg })
    const state = { ...get(), weightActual: kg }
    set(computeDerived(state))
  },

  setSignature: (dataUrl) => {
    set({ signatureUrl: dataUrl })
    const state = { ...get(), signatureUrl: dataUrl }
    set(computeDerived(state))
  },

  setConfirmed: (val) => {
    set({ confirmed: val })
    const state = { ...get(), confirmed: val }
    set(computeDerived(state))
  },

  isOverweight: (gvwr) => {
    const { weightActual } = get()
    if (weightActual === null) return false
    return weightActual > gvwr
  },

  submitLoadVerification: async () => {
    const state = get()
    if (!state.routeId) return

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO load_verifications (id, route_id, vehicle_id, verified_by, scan_results, total_items_expected, total_items_scanned, weight_expected_kg, weight_actual_kg, weight_variance_percent, truck_photo_uri, cargo_photo_uri, driver_signature_url, gate_clearance, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        state.routeId,
        '', // vehicle_id from shift store
        '', // verified_by from auth
        JSON.stringify(state.scanResults),
        state.totalExpected,
        state.totalScanned,
        state.weightExpected,
        state.weightActual ?? 0,
        state.weightVariance ?? 0,
        state.truckPhotoUri ?? '',
        state.cargoPhotoUri ?? '',
        state.signatureUrl ?? '',
        state.canDepart ? 'approved' : 'blocked',
        now,
      ]
    )
  },

  reset: () => set(initialState),
}))
