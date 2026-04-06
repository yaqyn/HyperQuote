// Finance domain types — contracts for the entire finance module
// Invoicing, AR, AP, payments, cheques, credit, recon, disputes, and reports

// ─── Tab Navigation ──────────────────────────────────────

export type FinanceTab =
  | 'home'
  | 'invoicing'
  | 'ar'
  | 'ap'
  | 'payments'
  | 'credit'
  | 'recon'
  | 'reports'

// ─── Status Unions ───────────────────────────────────────

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'collections'
  | 'disputed'
  | 'resolved'
  | 'adjusted'
  | 'written_off'

export type ETASubmissionStatus =
  | 'pending'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'error'

export type PaymentMethod = 'wire' | 'cheque' | 'lc' | 'cash'

export type ChequeStatus =
  | 'received'
  | 'deposited'
  | 'cleared'
  | 'bounced'
  | 're_presented'
  | 'written_off'
  | 'replaced'

export type MatchStatus =
  | 'matched'
  | 'within_tolerance'
  | 'exceeds_tolerance'
  | 'unmatched'

export type ReconStatus =
  | 'matched'
  | 'partially_matched'
  | 'unmatched'
  | 'exception'

export type DisputeStatus =
  | 'open'
  | 'investigating'
  | 'resolved'
  | 'escalated'

export type DisputeResolutionType =
  | 'credit_note'
  | 'price_adjustment'
  | 'write_off'
  | 'no_action'

export type CreditHoldType =
  | 'limit_exceeded'
  | 'overdue_30'
  | 'overdue_pct'
  | 'bounced_cheque'
  | 'limit_expired'

export type ARAgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'

// ─── Invoicing ───────────────────────────────────────────

export interface InvoiceItem {
  id: string
  productName: string
  productNameAr: string
  egsCode: string
  uom: string
  /** Geist Mono */ quantity: number
  /** Geist Mono */ unitPrice: number
  /** Geist Mono */ lineTotal: number
  /** Geist Mono */ vatAmount: number
}

export interface Invoice {
  id: string
  /** Geist Mono */ number: string
  orderId: string
  customerId: string
  customerName: string
  status: InvoiceStatus
  etaStatus: ETASubmissionStatus
  items: InvoiceItem[]
  /** Geist Mono */ subtotal: number
  /** Geist Mono */ vatAmount: number
  /** Geist Mono */ grandTotal: number
  /** Geist Mono */ dueDate: string
  /** Geist Mono */ issuedDate: string
  currency: 'EGP'
  sellerTRN: string
  buyerTRN: string
  digitalSignatureId: string | null
  pdfUrl: string | null
  creditNoteIds: string[]
}

// ─── Accounts Receivable ─────────────────────────────────

export interface ARAgingRow {
  customerId: string
  customerName: string
  tierBadge: string
  /** Geist Mono */ current: number
  /** Geist Mono */ days30: number
  /** Geist Mono */ days60: number
  /** Geist Mono */ days90: number
  /** Geist Mono */ days90plus: number
  /** Geist Mono */ total: number
  sparklineData: number[]
  salesRep: string
}

// ─── Payments ────────────────────────────────────────────

export interface PaymentAllocation {
  invoiceId: string
  /** Geist Mono */ amount: number
}

export interface Payment {
  id: string
  invoiceId: string
  /** Geist Mono */ amount: number
  method: PaymentMethod
  reference: string
  /** Geist Mono */ date: string
  bankAccount: string
  status: string
  allocations: PaymentAllocation[]
}

// ─── Cheques (PDC) ───────────────────────────────────────

export interface ChequeRecord {
  id: string
  /** Geist Mono */ chequeNumber: string
  bankName: string
  /** Geist Mono */ amount: number
  /** Geist Mono */ maturityDate: string
  drawerName: string
  customerId: string
  customerName: string
  status: ChequeStatus
  linkedInvoiceId: string
}

// ─── Letters of Credit ───────────────────────────────────

export interface LCDrawdown {
  id: string
  /** Geist Mono */ amount: number
  /** Geist Mono */ date: string
  invoiceId: string
}

export interface LetterOfCredit {
  id: string
  /** Geist Mono */ lcNumber: string
  issuingBank: string
  /** Geist Mono */ amount: number
  /** Geist Mono */ expiryDate: string
  customerId: string
  drawdowns: LCDrawdown[]
  /** Geist Mono */ remainingAmount: number
  documentChecklist: string[]
}

// ─── Accounts Payable ────────────────────────────────────

export interface ThreeWayMatchResult {
  poLine: { qty: number; price: number }
  receiptLine: { qty: number }
  invoiceLine: { qty: number; price: number }
  /** Geist Mono */ qtyVariance: number
  /** Geist Mono */ priceVariance: number
  withinTolerance: boolean
}

export interface APInvoice {
  id: string
  supplierId: string
  supplierName: string
  poId: string
  /** Geist Mono */ poNumber: string
  /** Geist Mono */ amount: number
  /** Geist Mono */ vatAmount: number
  /** Geist Mono */ withholdingTax: number
  /** Geist Mono */ netPayable: number
  /** Geist Mono */ receivedDate: string
  /** Geist Mono */ dueDate: string
  matchStatus: MatchStatus
  threeWayMatch: ThreeWayMatchResult
}

// ─── Credit Management ───────────────────────────────────

export interface AutoHoldTrigger {
  type: CreditHoldType
  /** Geist Mono */ threshold: number
  /** Geist Mono */ currentValue: number
  triggered: boolean
}

export interface CreditProfile {
  customerId: string
  customerName: string
  /** Geist Mono */ tier: number
  /** Geist Mono */ creditLimit: number
  /** Geist Mono */ currentExposure: number
  /** Geist Mono */ utilizationPct: number
  /** Geist Mono */ availableCredit: number
  /** Geist Mono */ overdueAmount: number
  /** Geist Mono */ paymentScore: number
  /** Geist Mono */ avgDaysToPay: number
  /** Geist Mono */ bouncedCheques12mo: number
  /** Geist Mono */ lastPaymentDate: string
  isOnHold: boolean
  holdReasons: CreditHoldType[]
}

// ─── Bank Reconciliation ─────────────────────────────────

export interface BankTransaction {
  id: string
  /** Geist Mono */ date: string
  description: string
  /** Geist Mono */ amount: number
  reference: string
  bankAccountId: string
  reconStatus: ReconStatus
  matchedPaymentId?: string
}

export interface ReconMatch {
  transactionId: string
  paymentId: string
  /** Geist Mono */ confidence: number
  matchType: 'exact' | 'partial' | 'manual'
}

// ─── Reports ─────────────────────────────────────────────

export interface FinanceReport {
  id: string
  name: string
  type: string
  dateRange: string
  filters: Record<string, unknown>
  /** Geist Mono */ generatedAt: string
  downloadUrl: string
}

export interface CashFlowForecast {
  week: string
  /** Geist Mono */ expectedInflows: number
  /** Geist Mono */ expectedOutflows: number
  /** Geist Mono */ netCash: number
  /** Geist Mono */ cumulativeCash: number
}

// ─── Disputes ────────────────────────────────────────────

export interface InvoiceDispute {
  id: string
  invoiceId: string
  /** Geist Mono */ invoiceNumber: string
  customerId: string
  customerName: string
  reason: string
  description: string
  status: DisputeStatus
  resolutionType?: DisputeResolutionType
  /** Portal-visible status for customer-facing display */
  customerFacingStatus: string
  assignedTo?: string
  /** Geist Mono */ createdAt: string
  /** Geist Mono */ resolvedAt?: string
  /** Geist Mono */ slaDeadline: string
  evidenceUrls: string[]
}

// ─── Dashboard ───────────────────────────────────────────

export interface FinanceDashboard {
  /** Geist Mono */ revenueMTD: number
  /** Geist Mono */ outstandingAR: number
  /** Geist Mono */ overdueAR: number
  /** Geist Mono */ cashPosition: number
  /** Geist Mono */ dso: number
  /** Geist Mono */ cei: number
  arAging: {
    /** Geist Mono */ current: number
    /** Geist Mono */ days30: number
    /** Geist Mono */ days60: number
    /** Geist Mono */ days90: number
    /** Geist Mono */ days90plus: number
  }
  /** Geist Mono */ expectedPaymentsThisWeek: number
  paymentMethodBreakdown: { wire: number; cheque: number; lc: number; cash: number }
  topCreditUtilization: { customerId: string; customerName: string; utilizationPct: number }[]
  /** Geist Mono */ apDueThisWeek: number
  /** Geist Mono */ overdueAP: number
  /** Geist Mono */ avgMarginMTD: number
}
