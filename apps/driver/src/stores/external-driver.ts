import { create } from 'zustand'
import { db } from '../lib/powersync'

export interface DriverJob {
  id: string
  deliveryId: string
  status: string
  offeredAt: string
  expiresAt: string
  payoutAmount: number
  payoutCurrency: string
  pickupAddress: string
  deliveryAddress: string
  estimatedDistanceKm: number
  estimatedDurationMinutes: number
  materialsSummary: string
  totalWeightKg: number
  requiresMoffett: boolean
  requiresBoom: boolean
}

export interface EarningsSummary {
  thisWeek: number
  thisMonth: number
  pending: number
  available: number
  rating: number
  totalJobs: number
}

export interface EarningsHistoryItem {
  id: string
  jobId: string
  date: string
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'processing'
  breakdown: {
    basePay: number
    distanceBonus: number
    heavyLoadSurcharge: number
    nightPremium: number
  }
}

export interface Withdrawal {
  id: string
  amount: number
  status: string
  requestedAt: string
  completedAt: string | null
}

/** 5% Egyptian services tax withholding for external drivers */
export function calcWithholding(amount: number): {
  gross: number
  withholding: number
  net: number
} {
  const withholding = Math.round(amount * 5) / 100
  return {
    gross: amount,
    withholding,
    net: amount - withholding,
  }
}

/** Minimum withdrawal amount in EGP */
export const MINIMUM_WITHDRAWAL = 500

const initialEarnings: EarningsSummary = {
  thisWeek: 0,
  thisMonth: 0,
  pending: 0,
  available: 0,
  rating: 0,
  totalJobs: 0,
}

interface ExternalDriverState {
  jobs: DriverJob[]
  selectedJob: DriverJob | null
  earnings: EarningsSummary
  earningsHistory: EarningsHistoryItem[]
  withdrawals: Withdrawal[]

  loadJobs: () => Promise<void>
  loadJob: (jobId: string) => Promise<void>
  acceptJob: (jobId: string) => Promise<void>
  declineJob: (jobId: string, reason?: string) => Promise<void>
  loadEarnings: (driverId: string) => Promise<void>
  loadEarningsHistory: (driverId: string) => Promise<void>
  requestWithdrawal: (amount: number, bankAccountId: string) => Promise<void>
  reset: () => void
}

const initialState = {
  jobs: [] as DriverJob[],
  selectedJob: null as DriverJob | null,
  earnings: { ...initialEarnings },
  earningsHistory: [] as EarningsHistoryItem[],
  withdrawals: [] as Withdrawal[],
}

function mapRowToJob(row: Record<string, unknown>): DriverJob {
  return {
    id: row.id as string,
    deliveryId: row.delivery_id as string,
    status: row.status as string,
    offeredAt: row.offered_at as string,
    expiresAt: row.expires_at as string,
    payoutAmount: row.payout_amount as number,
    payoutCurrency: row.payout_currency as string,
    pickupAddress: row.pickup_address as string,
    deliveryAddress: row.delivery_address as string,
    estimatedDistanceKm: row.estimated_distance_km as number,
    estimatedDurationMinutes: row.estimated_duration_minutes as number,
    materialsSummary: row.materials_summary as string,
    totalWeightKg: row.total_weight_kg as number,
    requiresMoffett: row.requires_moffett === 'true',
    requiresBoom: row.requires_boom === 'true',
  }
}

export const useExternalDriverStore = create<ExternalDriverState>((set, get) => ({
  ...initialState,

  loadJobs: async () => {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM driver_jobs WHERE status IN ('available', 'offered') ORDER BY offered_at DESC",
      []
    )
    set({ jobs: rows.map(mapRowToJob) })
  },

  loadJob: async (jobId) => {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM driver_jobs WHERE id = ?',
      [jobId]
    )
    if (rows.length > 0) {
      set({ selectedJob: mapRowToJob(rows[0]) })
    }
  },

  acceptJob: async (jobId) => {
    const now = new Date().toISOString()
    await db.execute(
      'UPDATE driver_jobs SET status = ?, accepted_at = ? WHERE id = ?',
      ['accepted', now, jobId]
    )

    // Update local state
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
      selectedJob:
        state.selectedJob?.id === jobId
          ? { ...state.selectedJob, status: 'accepted', offeredAt: state.selectedJob.offeredAt }
          : state.selectedJob,
    }))
  },

  declineJob: async (jobId, _reason?) => {
    await db.execute(
      'UPDATE driver_jobs SET status = ? WHERE id = ?',
      ['declined', jobId]
    )

    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
      selectedJob: state.selectedJob?.id === jobId ? null : state.selectedJob,
    }))
  },

  loadEarnings: async (driverId) => {
    const rows = await db.getAll<{
      total_jobs: number
      total_earned: number
      withholding_tax: number
      net_payable: number
      status: string
    }>('SELECT * FROM driver_earnings WHERE driver_id = ? ORDER BY period_end DESC', [driverId])

    if (rows.length === 0) {
      set({ earnings: { ...initialEarnings } })
      return
    }

    // Aggregate earnings
    let thisWeek = 0
    let thisMonth = 0
    let pending = 0
    let available = 0
    let totalJobs = 0

    for (const row of rows) {
      totalJobs += row.total_jobs
      if (row.status === 'pending') {
        pending += row.net_payable
      } else if (row.status === 'available') {
        available += row.net_payable
      }
      thisMonth += row.net_payable
      thisWeek += row.net_payable // Simplified; real impl would filter by date range
    }

    set({
      earnings: {
        thisWeek,
        thisMonth,
        pending,
        available,
        rating: 0, // Loaded separately from driver profile
        totalJobs,
      },
    })
  },

  loadEarningsHistory: async (driverId) => {
    const rows = await db.getAll<{
      id: string
      total_jobs: number
      total_earned: number
      withholding_tax: number
      net_payable: number
      status: string
      period_start: string
      period_end: string
    }>('SELECT * FROM driver_earnings WHERE driver_id = ? ORDER BY period_end DESC', [driverId])

    const history: EarningsHistoryItem[] = rows.map((row) => ({
      id: row.id,
      jobId: row.id,
      date: row.period_end,
      amount: row.net_payable,
      status: row.status as EarningsHistoryItem['status'],
      breakdown: {
        basePay: row.total_earned,
        distanceBonus: 0,
        heavyLoadSurcharge: 0,
        nightPremium: 0,
      },
    }))

    set({ earningsHistory: history })
  },

  requestWithdrawal: async (amount, bankAccountId) => {
    if (amount < MINIMUM_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal is EGP ${MINIMUM_WITHDRAWAL}`)
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO driver_withdrawals (id, driver_id, amount, bank_account_id, status, requested_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, '', amount, bankAccountId, 'pending', now, '']
    )

    set((state) => ({
      withdrawals: [
        ...state.withdrawals,
        { id, amount, status: 'pending', requestedAt: now, completedAt: null },
      ],
    }))
  },

  reset: () => set(initialState),
}))
