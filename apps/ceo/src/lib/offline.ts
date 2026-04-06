import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface CEOOfflineDB extends DBSchema {
  digest: {
    key: string
    value: { date: string; data: unknown; syncedAt: number }
  }
  insight: {
    key: string
    value: { weekOf: string; data: unknown; syncedAt: number }
  }
  attention: {
    key: 'current'
    value: { items: unknown[]; syncedAt: number }
  }
  entities: {
    key: string
    value: { type: string; id: string; data: unknown; syncedAt: number }
    indexes: { 'by-type': string }
  }
  searches: {
    key: string
    value: { query: string; results: unknown; syncedAt: number }
  }
}

let dbPromise: Promise<IDBPDatabase<CEOOfflineDB>> | null = null

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<CEOOfflineDB>('ceo-offline', 1, {
      upgrade(db) {
        db.createObjectStore('digest')
        db.createObjectStore('insight')
        db.createObjectStore('attention')
        const entities = db.createObjectStore('entities')
        entities.createIndex('by-type', 'type')
        db.createObjectStore('searches')
      },
    })
  }
  return dbPromise
}

// --- Entity helpers ---

export async function cacheEntity(type: string, id: string, data: unknown) {
  const db = await getOfflineDB()
  await db.put('entities', { type, id, data, syncedAt: Date.now() }, `${type}-${id}`)
}

export async function getCachedEntity(type: string, id: string) {
  const db = await getOfflineDB()
  return db.get('entities', `${type}-${id}`)
}

// --- Search helpers ---

export async function cacheSearchResults(query: string, results: unknown) {
  const db = await getOfflineDB()
  await db.put('searches', { query, results, syncedAt: Date.now() }, query)
}

export async function getCachedSearch(query: string) {
  const db = await getOfflineDB()
  return db.get('searches', query)
}

// --- Attention helpers ---

export async function cacheAttentionItems(items: unknown[]) {
  const db = await getOfflineDB()
  await db.put('attention', { items, syncedAt: Date.now() }, 'current')
}

export async function getCachedAttentionItems() {
  const db = await getOfflineDB()
  return db.get('attention', 'current')
}

// --- Digest helpers ---

export async function cacheDigest(date: string, data: unknown) {
  const db = await getOfflineDB()
  await db.put('digest', { date, data, syncedAt: Date.now() }, date)
}

export async function getCachedDigest(date: string) {
  const db = await getOfflineDB()
  return db.get('digest', date)
}

// --- Insight helpers ---

export async function cacheInsight(weekOf: string, data: unknown) {
  const db = await getOfflineDB()
  await db.put('insight', { weekOf, data, syncedAt: Date.now() }, weekOf)
}

export async function getCachedInsight(weekOf: string) {
  const db = await getOfflineDB()
  return db.get('insight', weekOf)
}
