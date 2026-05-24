import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'

const PROOF_BUCKET = 'proofs'
const MAX_PROOF_BYTES = 1024 * 1024
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const proofPanelSchema = z.enum([
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'admin',
	'search',
])

const proofTypeSchema = z.enum([
	'price_change',
	'stock_change',
	'finance_in',
	'finance_out',
	'warehouse_loading',
	'warehouse_receiving',
	'dispatch_delivery',
	'dispatch_return',
	'sales_evaluation',
	'rejection',
	'advisor_signoff',
	'support',
	'other',
])

const uploadProofDocumentInput = z.object({
	base64: z.string().min(1),
	fileName: z.string().trim().min(1).max(180),
	mimeType: z.string().trim().min(1).max(120),
	notes: z.string().trim().max(500).optional(),
	panel: proofPanelSchema,
	proofType: proofTypeSchema,
	relatedEntityId: z.string().regex(UUID_RE).optional(),
	relatedEntityType: z.string().trim().min(1).max(80).optional(),
	sizeBytes: z.number().int().min(1).max(MAX_PROOF_BYTES),
	title: z.string().trim().min(1).max(180).optional(),
})

const activityProofDocumentsInput = z.object({
	activityId: z.string().regex(UUID_RE),
})

export type ProofPanel = z.infer<typeof proofPanelSchema>
export type ProofType = z.infer<typeof proofTypeSchema>

export interface UploadedProofDocument {
	id: string
	fileName: string
	mimeType: string
	panel: ProofPanel
	proofPath: string
	proofType: ProofType
	sizeBytes: number
	storagePath: string
	title: string
}

export interface ActivityProofDocument {
	id: string
	fileName: string
	mimeType: string
	panel: ProofPanel
	proofType: ProofType
	sizeBytes: number
	title: string
	uploadedAt: string
	uploadedBy: string | null
	url: string | null
}

function assertAllowedProofMimeType(mimeType: string) {
	if (mimeType === 'application/pdf') return
	if (mimeType.startsWith('image/')) return
	throw new Error('Proof must be a PDF or image file')
}

function sanitizeFileName(value: string): string {
	const sanitized = value
		.normalize('NFKD')
		.replace(/[^\w.-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 120)
	return sanitized || 'proof'
}

function decodeBase64(value: string): Uint8Array {
	const base64 = value.includes(',') ? value.split(',').pop() || '' : value
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}

function proofStoragePath({
	fileName,
	panel,
	proofType,
}: {
	fileName: string
	panel: ProofPanel
	proofType: ProofType
}): string {
	const now = new Date()
	const year = now.getUTCFullYear()
	const month = String(now.getUTCMonth() + 1).padStart(2, '0')
	return [
		'internal',
		panel,
		proofType,
		String(year),
		month,
		`${crypto.randomUUID()}-${sanitizeFileName(fileName)}`,
	].join('/')
}

export const uploadProofDocument = createServerFn({ method: 'POST' })
	.inputValidator(uploadProofDocumentInput)
	.handler(async ({ data: input }): Promise<UploadedProofDocument> => {
		assertAllowedProofMimeType(input.mimeType)

		const bytes = decodeBase64(input.base64)
		if (bytes.byteLength !== input.sizeBytes) {
			throw new Error('Proof file size mismatch')
		}

		const auth = await getInternalSupabaseClient()
		const { error: permissionError } = await auth.client.rpc('require_panel', {
			required_panel: input.panel,
			write_required: true,
		})
		if (permissionError) throw new Error(permissionError.message)

		const storagePath = proofStoragePath({
			fileName: input.fileName,
			panel: input.panel,
			proofType: input.proofType,
		})
		const { error: uploadError } = await auth.client.storage
			.from(PROOF_BUCKET)
			.upload(storagePath, bytes, {
				contentType: input.mimeType,
				upsert: false,
			})
		if (uploadError) throw new Error(uploadError.message)

		const { data: registered, error: registerError } = await auth.client.rpc(
			'register_proof_document',
			{
				p_file_name: input.fileName,
				p_file_size_bytes: input.sizeBytes,
				p_mime_type: input.mimeType,
				p_notes: input.notes ?? null,
				p_panel: input.panel,
				p_proof_type: input.proofType,
				p_related_entity_id: input.relatedEntityId ?? null,
				p_related_entity_type: input.relatedEntityType ?? null,
				p_storage_path: storagePath,
				p_title: input.title ?? input.fileName,
			},
		)
		if (registerError) throw new Error(registerError.message)
		if (!registered) throw new Error('Proof registration failed')

		const row = registered as {
			file_name: string
			file_size_bytes: number
			id: string
			mime_type: string
			panel: ProofPanel
			proof_type: ProofType
			storage_path: string
			title: string | null
		}

		return {
			id: row.id,
			fileName: row.file_name,
			mimeType: row.mime_type,
			panel: row.panel,
			proofPath: `storage://${PROOF_BUCKET}/${row.storage_path}`,
			proofType: row.proof_type,
			sizeBytes: row.file_size_bytes,
			storagePath: row.storage_path,
			title: row.title ?? row.file_name,
		}
	})

export const getActivityProofDocuments = createServerFn({ method: 'POST' })
	.inputValidator(activityProofDocumentsInput)
	.handler(async ({ data }): Promise<ActivityProofDocument[]> => {
		const auth = await getInternalSupabaseClient()
		const { data: canSearch, error: accessError } = await auth.client.rpc(
			'can_access_ceo_search',
		)
		if (accessError) throw new Error(accessError.message)
		if (canSearch !== true) throw new Error('ceo_search_required')

		const { data: proofLinks, error: linkError } = await auth.client
			.from('activity_event_proofs')
			.select('proof_document_id')
			.eq('activity_event_id', data.activityId)
		if (linkError) throw new Error(linkError.message)

		const proofIds = [
			...new Set(
				(proofLinks ?? [])
					.map((link) => link.proof_document_id)
					.filter((id): id is string => typeof id === 'string'),
			),
		]
		if (proofIds.length === 0) return []

		const { data: proofRows, error: proofError } = await auth.client
			.from('proof_documents')
			.select(
				'id, storage_path, file_name, mime_type, file_size_bytes, panel, proof_type, title, uploaded_by_employee_id, created_at',
			)
			.in('id', proofIds)
			.order('created_at', { ascending: false })
		if (proofError) throw new Error(proofError.message)

		const uploaderIds = [
			...new Set(
				(proofRows ?? [])
					.map((row) => row.uploaded_by_employee_id)
					.filter((id): id is string => typeof id === 'string'),
			),
		]
		const uploaderById = new Map<string, string>()
		if (uploaderIds.length > 0) {
			const { data: employees, error: employeeError } = await auth.client
				.from('employees')
				.select('id, full_name')
				.in('id', uploaderIds)
			if (employeeError) throw new Error(employeeError.message)
			for (const employee of employees ?? []) {
				uploaderById.set(employee.id, employee.full_name)
			}
		}

		const docs: ActivityProofDocument[] = []
		for (const row of proofRows ?? []) {
			const { data: signed, error: signedError } = await auth.client.storage
				.from(PROOF_BUCKET)
				.createSignedUrl(row.storage_path, 300)
			if (signedError) throw new Error(signedError.message)
			docs.push({
				id: row.id,
				fileName: row.file_name,
				mimeType: row.mime_type,
				panel: row.panel as ProofPanel,
				proofType: row.proof_type as ProofType,
				sizeBytes: row.file_size_bytes,
				title: row.title ?? row.file_name,
				uploadedAt: row.created_at,
				uploadedBy: row.uploaded_by_employee_id
					? (uploaderById.get(row.uploaded_by_employee_id) ?? null)
					: null,
				url: signed.signedUrl ?? null,
			})
		}
		return docs
	})
