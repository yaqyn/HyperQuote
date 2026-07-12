import type { getAuthenticatedPortalCustomer } from './_supabase'

const CUSTOMER_DOCUMENTS_BUCKET = 'customer-documents'
const SIGNED_DOWNLOAD_TTL_SECONDS = 60

type PortalCustomerSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']

export async function resolveCustomerDocumentUrl(
	supabase: PortalCustomerSupabase,
	customerId: string,
	document: { download_url: string | null; storage_path: string | null },
): Promise<string | null> {
	if (!document.storage_path) {
		return safeLegacyDocumentUrl(document.download_url)
	}
	if (!isCustomerDocumentStoragePath(document.storage_path, customerId)) {
		return null
	}

	const { data, error } = await supabase.storage
		.from(CUSTOMER_DOCUMENTS_BUCKET)
		.createSignedUrl(document.storage_path, SIGNED_DOWNLOAD_TTL_SECONDS)
	return error ? null : (data?.signedUrl ?? null)
}

export function isCustomerDocumentStoragePath(
	storagePath: string,
	customerId: string,
): boolean {
	return (
		storagePath.startsWith(`${customerId}/`) &&
		!storagePath.startsWith('/') &&
		!storagePath.includes('..') &&
		!storagePath.includes('//')
	)
}

export function safeLegacyDocumentUrl(value: string | null): string | null {
	if (!value) return null
	try {
		const url = new URL(value)
		if (url.protocol === 'https:') return url.toString()
		if (
			url.protocol === 'http:' &&
			(url.hostname === '127.0.0.1' || url.hostname === 'localhost')
		) {
			return url.toString()
		}
	} catch {
		return null
	}
	return null
}
