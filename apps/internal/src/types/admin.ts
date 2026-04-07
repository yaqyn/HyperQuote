// Admin domain types — contracts for the entire admin module
// Users, roles, permissions, settings, margins, approvals, holidays, audit

// ─── Tab Navigation ──────────────────────────────────────

export type AdminTab =
  | 'users'
  | 'settings'
  | 'rules'
  | 'audit'

// ─── Users & Roles ───────────────────────────────────────

export type UserStatus = 'active' | 'suspended' | 'inactive'

export interface UserRecord {
  id: string
  name: string
  email: string
  roles: string[]
  status: UserStatus
  lastLogin: string
  mfaEnabled: boolean
  createdAt: string
}

export interface RoleDefinition {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
}

export interface TemporaryDelegation {
  id: string
  fromUserId: string
  toUserId: string
  roleId: string
  expiryDate: string
  reason: string
}

// ─── System Settings ─────────────────────────────────────

export type SettingType = 'string' | 'number' | 'boolean' | 'json'

export type SettingCategory =
  | 'company'
  | 'locale'
  | 'working_hours'
  | 'payment_terms'
  | 'notification'
  | 'prayer_times'
  | 'ramadan'
  | 'quote_validity'

export interface SystemSetting {
  key: string
  value: string
  type: SettingType
  category: SettingCategory
  description: string
}

// ─── Margin Rules ────────────────────────────────────────

export interface MarginRule {
  id: string
  categoryId: string
  categoryName: string
  /** Geist Mono */ targetMarginPercent: number
  /** Geist Mono */ floorMarginPercent: number
  /** Geist Mono */ absoluteMinimum: number
  /** Geist Mono */ requiresApprovalBelow: number
  customerTierOverrides: Record<string, number>
}

// ─── Approval Thresholds ─────────────────────────────────

export type ApprovalType =
  | 'quote_margin'
  | 'credit_limit'
  | 'po_approval'
  | 'return_credit'
  | 'inventory_adjustment'

export interface ApprovalThreshold {
  id: string
  type: ApprovalType
  condition: string
  approvers: string[]
  /** Geist Mono */ escalationMinutes: number
  escalationTarget: string
}

// ─── Holiday Calendar ────────────────────────────────────

export interface Holiday {
  id: string
  name: string
  nameAr: string
  estimatedDate: string
  confirmedDate: string | null
  isIslamic: boolean
  year: number
}

// ─── Audit Log (WORM: Write Once Read Many) ──────────────
// Audit entries are created by database triggers, never by the UI.
// This interface is READ-ONLY — no mutation functions exist.

export interface AuditEntry {
  id: string
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  oldValue: string | null
  newValue: string | null
  timestamp: string
  ipAddress: string
}

export interface AuditLogResponse {
  entries: AuditEntry[]
  total: number
  page: number
  pageSize: number
}

export interface AuditLogFilters {
  userId?: string
  action?: string
  entityType?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}
