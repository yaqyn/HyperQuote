import type { DriverRepository } from './driver-repository'
import { resolveDriverSupabaseConfig } from './supabase-config'
import { createSupabaseDriverRepository } from './supabase-driver-repository'

function createDriverRepository(): DriverRepository {
	const config = resolveDriverSupabaseConfig()
	if (!config) {
		throw new Error('Supabase is required for the driver app')
	}
	return createSupabaseDriverRepository(config)
}

export const driverRepository = createDriverRepository()
