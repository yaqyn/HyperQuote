import type {
	AbstractPowerSyncDatabase,
	PowerSyncBackendConnector,
} from '@powersync/web'
import { supabase } from './supabase'

export class SupabaseConnector implements PowerSyncBackendConnector {
	async fetchCredentials() {
		const {
			data: { session },
		} = await supabase.auth.getSession()

		if (!session) {
			throw new Error('Not authenticated')
		}

		return {
			endpoint: import.meta.env.VITE_POWERSYNC_URL,
			token: session.access_token,
		}
	}

	async uploadData(database: AbstractPowerSyncDatabase) {
		let tx = await database.getNextCrudTransaction()

		while (tx) {
			for (const op of tx.crud) {
				const table = op.table
				const opData = op.opData ?? {}

				switch (op.op) {
					case 'PUT':
						await supabase.from(table).upsert(opData)
						break
					case 'PATCH':
						await supabase.from(table).update(opData).eq('id', op.id)
						break
					case 'DELETE':
						await supabase.from(table).delete().eq('id', op.id)
						break
				}
			}

			await tx.complete()
			tx = await database.getNextCrudTransaction()
		}
	}
}
