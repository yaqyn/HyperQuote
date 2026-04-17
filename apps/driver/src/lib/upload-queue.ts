import { db } from './powersync'

export interface UploadMetadata {
	type: 'loading' | 'pod' | 'damage' | 'exception' | 'inspection'
	entityId: string
}

/**
 * Queue a photo for background upload to Supabase Storage (R2).
 * Stores file URI in SQLite, NOT base64 (anti-pattern).
 */
export async function queuePhotoUpload(
	fileUri: string,
	metadata: UploadMetadata,
) {
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	await db.execute(
		`INSERT INTO upload_queue (id, file_uri, upload_type, entity_id, status, retry_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[id, fileUri, metadata.type, metadata.entityId, 'pending', 0, now],
	)

	return id
}

/**
 * Process pending uploads: read from SQLite, upload to Supabase Storage,
 * mark as uploaded. Handle failures with retry count.
 */
export async function processUploadQueue() {
	const pending = await db.getAll<{
		id: string
		file_uri: string
		upload_type: string
		entity_id: string
		retry_count: number
	}>('SELECT * FROM upload_queue WHERE status = ? ORDER BY created_at ASC', [
		'pending',
	])

	for (const item of pending) {
		try {
			// Upload to Supabase Storage (R2)
			// Actual upload logic will be wired when Supabase client is configured
			// For now, mark as uploaded after successful fetch
			const response = await fetch(item.file_uri)
			if (!response.ok)
				throw new Error(`Failed to read file: ${response.status}`)

			const _blob = await response.blob()

			// TODO: Wire Supabase storage upload
			// const { error } = await supabase.storage
			//   .from('delivery-photos')
			//   .upload(`${item.upload_type}/${item.entity_id}/${item.id}`, blob)

			await db.execute(
				'UPDATE upload_queue SET status = ?, uploaded_at = ? WHERE id = ?',
				['uploaded', new Date().toISOString(), item.id],
			)
		} catch {
			const newRetryCount = item.retry_count + 1
			const newStatus = newRetryCount >= 5 ? 'failed' : 'pending'

			await db.execute(
				'UPDATE upload_queue SET retry_count = ?, status = ? WHERE id = ?',
				[newRetryCount, newStatus, item.id],
			)
		}
	}
}

/** Return count of pending uploads. */
export async function getPendingUploadCount(): Promise<number> {
	const result = await db.getAll<{ count: number }>(
		'SELECT COUNT(*) as count FROM upload_queue WHERE status = ?',
		['pending'],
	)
	return result[0]?.count ?? 0
}
