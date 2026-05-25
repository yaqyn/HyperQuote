import { decodeBase64Payload, sanitizeFileName } from '@hyperquote/runtime/file'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './_supabase'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = new Set([
	'application/pdf',
	'image/jpeg',
	'image/png',
])

const uploadQuoteAttachmentInput = z.object({
	fileName: z.string().min(1).max(180),
	contentType: z.string().min(1).max(120),
	size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
	base64: z.string().min(1),
})

export const uploadQuoteAttachment = createServerFn({ method: 'POST' })
	.inputValidator(uploadQuoteAttachmentInput)
	.handler(
		async ({
			data: input,
		}): Promise<{
			name: string
			size: number
			type: string
			url: string
		}> => {
			if (!ALLOWED_ATTACHMENT_TYPES.has(input.contentType)) {
				throw new Error('Unsupported quote attachment type')
			}

			const bytes = decodeBase64Payload(input.base64)
			if (bytes.byteLength !== input.size) {
				throw new Error('Attachment payload size mismatch')
			}

			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const safeName = sanitizeFileName(input.fileName, 'attachment')
			const path = `${customerId}/${crypto.randomUUID()}-${safeName}`
			const { error } = await supabase.storage
				.from('quote-attachments')
				.upload(path, bytes, {
					contentType: input.contentType,
					upsert: false,
				})

			if (error) throw new Error(error.message)

			return {
				name: input.fileName,
				size: input.size,
				type: input.contentType,
				url: `storage://quote-attachments/${path}`,
			}
		},
	)
