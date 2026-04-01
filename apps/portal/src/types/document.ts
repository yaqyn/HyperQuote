/**
 * Document types for the Documents window.
 * Documents include invoices, delivery notes, quote PDFs, and certificates.
 */

export type DocumentType = 'invoice' | 'delivery_note' | 'quote_pdf' | 'certificate'

export interface Document {
  /** Unique document ID */
  id: string
  /** Document type category */
  type: DocumentType
  /** Document reference number (e.g., INV-2026-00142) -- display in Geist Mono */
  reference: string
  /** Human-readable document title */
  title: string
  /** ISO date string of document creation */
  date: string
  /** Formatted file size (e.g., "2.4 MB") -- display in Geist Mono */
  fileSize: string
  /** Pre-signed download URL (null if not yet available) */
  downloadUrl: string | null
  /** Related order reference (e.g., ORD-2026-00042) */
  relatedOrderRef: string | null
}
