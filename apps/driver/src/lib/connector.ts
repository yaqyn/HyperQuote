import type { PowerSyncBackendConnector } from '@powersync/web'
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

  async uploadData(database: {
    getNextCrudTransaction: () => Promise<{
      crud: Array<{
        table: string
        opType: string
        opData: Record<string, unknown>
        id: string
      }>
      complete: () => Promise<void>
    } | null>
  }) {
    let tx = await database.getNextCrudTransaction()

    while (tx) {
      for (const op of tx.crud) {
        const { table, opType, opData } = op

        switch (opType) {
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
