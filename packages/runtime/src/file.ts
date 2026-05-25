export function sanitizeFileName(value: string, fallback = 'file'): string {
	const sanitized = value
		.normalize('NFKD')
		.replace(/[^\w.-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 120)
	return sanitized || fallback
}

export function decodeBase64Payload(value: string): Uint8Array {
	const base64 = value.includes(',') ? value.split(',').pop() || '' : value
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}
