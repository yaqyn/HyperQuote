/**
 * Document types for the Documents window.
 * Documents include invoices, delivery notes, quote PDFs, and certificates.
 */

export type DocumentType =
	| 'invoice'
	| 'delivery_note'
	| 'quote_pdf'
	| 'certificate'

export interface Document {
	/** Unique document ID */
	id: string
	/** Document type category */
	type: DocumentType
	/** Persisted document reference number -- display in readable tabular sans */
	reference: string
	/** Human-readable document title */
	title: string
	/** ISO date string of document creation */
	date: string
	/** Formatted file size (e.g., "2.4 MB") -- display in readable tabular sans */
	fileSize: string
	/** Pre-signed download URL (null if not yet available) */
	downloadUrl: string | null
	/** Persisted related order reference */
	relatedOrderRef: string | null
}
