import { resolveSupabaseBrowserConfig } from '@hyperquote/auth'
import type { DriverRepository } from './driver-repository'
import { createSupabaseDriverRepository } from './supabase-driver-repository'

function createDriverRepository(): DriverRepository {
	const config = resolveSupabaseBrowserConfig(import.meta.env)
	if (!config) {
		throw new Error('Supabase is required for the driver app')
	}
	return createSupabaseDriverRepository(config)
}

export const driverRepository = createDriverRepository()
