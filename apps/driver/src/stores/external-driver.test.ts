import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	calcWithholding,
	MINIMUM_WITHDRAWAL,
	useExternalDriverStore,
} from './external-driver'

// Mock PowerSync db
const mockExecute = vi.fn().mockResolvedValue(undefined)
const mockGetAll = vi.fn().mockResolvedValue([])
vi.mock('../lib/powersync', () => ({
	db: {
		execute: (...args: unknown[]) => mockExecute(...args),
		getAll: (...args: unknown[]) => mockGetAll(...args),
	},
}))

beforeEach(() => {
	useExternalDriverStore.getState().reset()
	mockExecute.mockClear()
	mockGetAll.mockClear()
})

describe('calcWithholding', () => {
	it('calcWithholding(1000) returns correct values', () => {
		const result = calcWithholding(1000)
		expect(result).toEqual({ gross: 1000, withholding: 50, net: 950 })
	})

	it('calcWithholding(850) returns correct rounded values', () => {
		const result = calcWithholding(850)
		expect(result.gross).toBe(850)
		expect(result.withholding).toBe(42.5)
		expect(result.net).toBe(807.5)
	})
})

describe('MINIMUM_WITHDRAWAL', () => {
	it('equals 500', () => {
		expect(MINIMUM_WITHDRAWAL).toBe(500)
	})
})

describe('useExternalDriverStore', () => {
	it('requestWithdrawal with amount < 500 throws', async () => {
		await expect(
			useExternalDriverStore.getState().requestWithdrawal(200, 'bank-1'),
		).rejects.toThrow('Minimum withdrawal is EGP 500')
	})

	it('requestWithdrawal with valid amount inserts into driver_withdrawals', async () => {
		await useExternalDriverStore.getState().requestWithdrawal(1000, 'bank-1')

		expect(mockExecute).toHaveBeenCalledWith(
			expect.stringContaining('INSERT INTO driver_withdrawals'),
			expect.arrayContaining([1000, 'bank-1', 'pending']),
		)

		expect(useExternalDriverStore.getState().withdrawals).toHaveLength(1)
		expect(useExternalDriverStore.getState().withdrawals[0].amount).toBe(1000)
		expect(useExternalDriverStore.getState().withdrawals[0].status).toBe(
			'pending',
		)
	})

	it('acceptJob updates status to accepted and sets accepted_at', async () => {
		await useExternalDriverStore.getState().acceptJob('job-1')

		expect(mockExecute).toHaveBeenCalledWith(
			expect.stringContaining('UPDATE driver_jobs SET status'),
			expect.arrayContaining(['accepted', 'job-1']),
		)
	})

	it('declineJob updates status to declined', async () => {
		await useExternalDriverStore.getState().declineJob('job-1')

		expect(mockExecute).toHaveBeenCalledWith(
			expect.stringContaining('UPDATE driver_jobs SET status'),
			['declined', 'job-1'],
		)
	})

	it('loadJobs queries driver_jobs with status filter', async () => {
		mockGetAll.mockResolvedValueOnce([
			{
				id: 'job-1',
				delivery_id: 'del-1',
				status: 'available',
				offered_at: '2026-04-06T10:00:00Z',
				expires_at: '2026-04-06T10:30:00Z',
				payout_amount: 850,
				payout_currency: 'EGP',
				pickup_address: 'Warehouse A',
				delivery_address: 'Site B',
				estimated_distance_km: 15,
				estimated_duration_minutes: 45,
				materials_summary: 'Cement, Rebar',
				total_weight_kg: 5000,
				requires_moffett: 'false',
				requires_boom: 'false',
			},
		])

		await useExternalDriverStore.getState().loadJobs()

		expect(mockGetAll).toHaveBeenCalledWith(
			expect.stringContaining("status IN ('available', 'offered')"),
			[],
		)
		expect(useExternalDriverStore.getState().jobs).toHaveLength(1)
		expect(useExternalDriverStore.getState().jobs[0].payoutAmount).toBe(850)
		expect(useExternalDriverStore.getState().jobs[0].requiresMoffett).toBe(
			false,
		)
	})

	it('reset clears all state', () => {
		useExternalDriverStore.setState({
			jobs: [
				{ id: 'j1' } as ReturnType<
					typeof useExternalDriverStore.getState
				>['jobs'][0],
			],
		})

		useExternalDriverStore.getState().reset()
		expect(useExternalDriverStore.getState().jobs).toEqual([])
		expect(useExternalDriverStore.getState().selectedJob).toBeNull()
		expect(useExternalDriverStore.getState().withdrawals).toEqual([])
	})
})
