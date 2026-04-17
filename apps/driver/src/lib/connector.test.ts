import type { AbstractPowerSyncDatabase } from '@powersync/web'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock supabase before importing connector
vi.mock('./supabase', () => ({
	supabase: {
		auth: {
			getSession: vi.fn(),
		},
		from: vi.fn(),
	},
}))

import { SupabaseConnector } from './connector'
import { supabase } from './supabase'

const mockGetSession = vi.mocked(supabase.auth.getSession)
const mockFrom = vi.mocked(supabase.from)

type FromReturn = ReturnType<typeof supabase.from>
const asFromMock = (value: unknown) => value as FromReturn

describe('SupabaseConnector', () => {
	let connector: SupabaseConnector

	beforeEach(() => {
		connector = new SupabaseConnector()
		vi.clearAllMocks()
	})

	describe('fetchCredentials', () => {
		it('returns credentials when session exists', async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						access_token: 'test-token',
						refresh_token: 'refresh',
						expires_in: 3600,
						token_type: 'bearer',
						user: {} as User,
					},
				},
				error: null,
			})

			const creds = await connector.fetchCredentials()
			expect(creds.token).toBe('test-token')
			expect(creds.endpoint).toBeDefined()
		})

		it('throws when no session exists', async () => {
			mockGetSession.mockResolvedValue({
				data: { session: null },
				error: null,
			})

			await expect(connector.fetchCredentials()).rejects.toThrow(
				'Not authenticated',
			)
		})
	})

	describe('uploadData', () => {
		const createMockDatabase = (
			ops: Array<{
				opType: string
				table: string
				opData: Record<string, unknown>
				id?: string
			}>,
		) =>
			({
				getNextCrudTransaction: vi
					.fn()
					.mockResolvedValueOnce({
						crud: ops.map((op) => ({
							table: op.table,
							op: op.opType,
							opData: op.opData,
							id: op.id ?? 'test-id',
						})),
						complete: vi.fn(),
					})
					.mockResolvedValue(null),
			}) as unknown as AbstractPowerSyncDatabase

		it('routes PUT operations to supabase upsert', async () => {
			const mockUpsert = vi.fn().mockResolvedValue({ error: null })
			mockFrom.mockReturnValue(asFromMock({ upsert: mockUpsert }))

			const db = createMockDatabase([
				{
					opType: 'PUT',
					table: 'vehicles',
					opData: { plate_number: 'ABC123' },
				},
			])

			await connector.uploadData(db)

			expect(mockFrom).toHaveBeenCalledWith('vehicles')
			expect(mockUpsert).toHaveBeenCalledWith({ plate_number: 'ABC123' })
		})

		it('routes PATCH operations to supabase update', async () => {
			const mockEq = vi.fn().mockResolvedValue({ error: null })
			const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
			mockFrom.mockReturnValue(asFromMock({ update: mockUpdate }))

			const db = createMockDatabase([
				{
					opType: 'PATCH',
					table: 'vehicles',
					opData: { status: 'active' },
					id: 'v-1',
				},
			])

			await connector.uploadData(db)

			expect(mockFrom).toHaveBeenCalledWith('vehicles')
			expect(mockUpdate).toHaveBeenCalledWith({ status: 'active' })
			expect(mockEq).toHaveBeenCalledWith('id', 'v-1')
		})

		it('routes DELETE operations to supabase delete', async () => {
			const mockEq = vi.fn().mockResolvedValue({ error: null })
			const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
			mockFrom.mockReturnValue(asFromMock({ delete: mockDelete }))

			const db = createMockDatabase([
				{ opType: 'DELETE', table: 'vehicles', opData: {}, id: 'v-1' },
			])

			await connector.uploadData(db)

			expect(mockFrom).toHaveBeenCalledWith('vehicles')
			expect(mockDelete).toHaveBeenCalled()
			expect(mockEq).toHaveBeenCalledWith('id', 'v-1')
		})

		it('completes transaction after processing all ops', async () => {
			mockFrom.mockReturnValue(
				asFromMock({
					upsert: vi.fn().mockResolvedValue({ error: null }),
				}),
			)

			const completeFn = vi.fn()
			const db = {
				getNextCrudTransaction: vi
					.fn()
					.mockResolvedValueOnce({
						crud: [
							{
								table: 'vehicles',
								op: 'PUT',
								opData: { plate_number: 'X' },
								id: '1',
							},
						],
						complete: completeFn,
					})
					.mockResolvedValue(null),
			} as unknown as AbstractPowerSyncDatabase

			await connector.uploadData(db)

			expect(completeFn).toHaveBeenCalled()
		})
	})
})
