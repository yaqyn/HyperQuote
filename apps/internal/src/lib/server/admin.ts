import { createServerFn } from '@tanstack/react-start'
import type {
  AuditEntry,
  AuditLogResponse,
  ApprovalThreshold,
  Holiday,
  MarginRule,
  SystemSetting,
  UserRecord,
} from '../../types/admin'

// ─── Mock Users ─────────────────────────────────────────

const MOCK_USERS: UserRecord[] = [
  { id: 'usr-001', name: 'Ahmed El-Sayed', email: 'ahmed@hyperquote.io', roles: ['admin', 'sales_manager'], status: 'active', lastLogin: '2026-04-06T08:30:00Z', mfaEnabled: true, createdAt: '2025-01-15T10:00:00Z' },
  { id: 'usr-002', name: 'Fatma Hassan', email: 'fatma@hyperquote.io', roles: ['procurement_manager'], status: 'active', lastLogin: '2026-04-06T07:45:00Z', mfaEnabled: true, createdAt: '2025-02-01T09:00:00Z' },
  { id: 'usr-003', name: 'Mohamed Khalil', email: 'mohamed.k@hyperquote.io', roles: ['warehouse_manager'], status: 'active', lastLogin: '2026-04-05T16:20:00Z', mfaEnabled: true, createdAt: '2025-02-15T11:00:00Z' },
  { id: 'usr-004', name: 'Nour Ibrahim', email: 'nour@hyperquote.io', roles: ['accountant'], status: 'active', lastLogin: '2026-04-06T09:10:00Z', mfaEnabled: false, createdAt: '2025-03-01T08:30:00Z' },
  { id: 'usr-005', name: 'Omar Farouk', email: 'omar@hyperquote.io', roles: ['sales_rep'], status: 'active', lastLogin: '2026-04-05T14:00:00Z', mfaEnabled: false, createdAt: '2025-03-10T10:00:00Z' },
  { id: 'usr-006', name: 'Hana Mostafa', email: 'hana@hyperquote.io', roles: ['sales_rep'], status: 'suspended', lastLogin: '2026-03-20T12:00:00Z', mfaEnabled: true, createdAt: '2025-04-01T09:00:00Z' },
  { id: 'usr-007', name: 'Youssef Adel', email: 'youssef@hyperquote.io', roles: ['dispatcher'], status: 'active', lastLogin: '2026-04-06T06:00:00Z', mfaEnabled: true, createdAt: '2025-04-15T10:00:00Z' },
  { id: 'usr-008', name: 'Laila Mansour', email: 'laila@hyperquote.io', roles: ['hr_manager'], status: 'active', lastLogin: '2026-04-05T17:30:00Z', mfaEnabled: true, createdAt: '2025-05-01T08:00:00Z' },
  { id: 'usr-009', name: 'Karim Soliman', email: 'karim@hyperquote.io', roles: ['support_agent'], status: 'active', lastLogin: '2026-04-06T08:00:00Z', mfaEnabled: false, createdAt: '2025-05-15T09:00:00Z' },
  { id: 'usr-010', name: 'Sara El-Din', email: 'sara@hyperquote.io', roles: ['sales_rep', 'procurement_agent'], status: 'active', lastLogin: '2026-04-04T11:00:00Z', mfaEnabled: true, createdAt: '2025-06-01T10:00:00Z' },
  { id: 'usr-011', name: 'Tarek Nabil', email: 'tarek@hyperquote.io', roles: ['driver_manager'], status: 'inactive', lastLogin: '2026-02-10T09:00:00Z', mfaEnabled: false, createdAt: '2025-06-15T08:00:00Z' },
  { id: 'usr-012', name: 'Dina Ashraf', email: 'dina@hyperquote.io', roles: ['accountant'], status: 'active', lastLogin: '2026-04-06T07:00:00Z', mfaEnabled: true, createdAt: '2025-07-01T09:00:00Z' },
  { id: 'usr-013', name: 'Hassan Rizk', email: 'hassan@hyperquote.io', roles: ['warehouse_staff'], status: 'active', lastLogin: '2026-04-05T15:00:00Z', mfaEnabled: false, createdAt: '2025-07-15T10:00:00Z' },
  { id: 'usr-014', name: 'Mona Gamal', email: 'mona@hyperquote.io', roles: ['sales_manager', 'admin'], status: 'active', lastLogin: '2026-04-06T09:30:00Z', mfaEnabled: true, createdAt: '2025-08-01T08:00:00Z' },
  { id: 'usr-015', name: 'Amr Helmy', email: 'amr@hyperquote.io', roles: ['it_admin'], status: 'active', lastLogin: '2026-04-06T07:15:00Z', mfaEnabled: true, createdAt: '2025-08-15T09:00:00Z' },
]

// ─── Mock System Settings ───────────────────────────────

const MOCK_SETTINGS: SystemSetting[] = [
  { key: 'company.name_en', value: 'HyperQuote', type: 'string', category: 'company', description: 'Company name (English)' },
  { key: 'company.name_ar', value: 'هايبر كوت', type: 'string', category: 'company', description: 'Company name (Arabic)' },
  { key: 'company.cr_number', value: '12345678', type: 'string', category: 'company', description: 'Commercial Registration number' },
  { key: 'company.trn', value: '100-234-567', type: 'string', category: 'company', description: 'Tax Registration Number (TRN)' },
  { key: 'locale.currency', value: 'EGP', type: 'string', category: 'locale', description: 'Default currency' },
  { key: 'locale.default_language', value: 'ar', type: 'string', category: 'locale', description: 'Default language' },
  { key: 'locale.working_days', value: '["sun","mon","tue","wed","thu"]', type: 'json', category: 'locale', description: 'Working days (Sun-Thu)' },
  { key: 'working_hours.start', value: '08:00', type: 'string', category: 'working_hours', description: 'Working hours start' },
  { key: 'working_hours.end', value: '17:00', type: 'string', category: 'working_hours', description: 'Working hours end' },
  { key: 'prayer_times.enabled', value: 'true', type: 'boolean', category: 'prayer_times', description: 'Enable prayer time API integration' },
  { key: 'ramadan.mode', value: 'false', type: 'boolean', category: 'ramadan', description: 'Ramadan mode active' },
  { key: 'ramadan.adjusted_hours', value: '09:00-15:00', type: 'string', category: 'ramadan', description: 'Adjusted working hours during Ramadan' },
  { key: 'payment_terms.default_days', value: '30', type: 'number', category: 'payment_terms', description: 'Default payment terms (days)' },
  { key: 'notification.quote_submitted', value: '["email","whatsapp"]', type: 'json', category: 'notification', description: 'Channels for quote submission notification' },
  { key: 'quote_validity.default_days', value: '7', type: 'number', category: 'quote_validity', description: 'Default quote validity period (days)' },
]

// ─── Mock Margin Rules ──────────────────────────────────

const MOCK_MARGIN_RULES: MarginRule[] = [
  { id: 'mgn-001', categoryId: 'cat-cement', categoryName: 'Cement', targetMarginPercent: 18, floorMarginPercent: 12, absoluteMinimum: 50, requiresApprovalBelow: 14, customerTierOverrides: { platinum: 10, gold: 12, silver: 14 } },
  { id: 'mgn-002', categoryId: 'cat-steel', categoryName: 'Steel & Rebar', targetMarginPercent: 15, floorMarginPercent: 10, absoluteMinimum: 100, requiresApprovalBelow: 12, customerTierOverrides: { platinum: 8, gold: 10, silver: 12 } },
  { id: 'mgn-003', categoryId: 'cat-aggregates', categoryName: 'Aggregates', targetMarginPercent: 22, floorMarginPercent: 15, absoluteMinimum: 30, requiresApprovalBelow: 18, customerTierOverrides: { platinum: 13, gold: 15, silver: 18 } },
  { id: 'mgn-004', categoryId: 'cat-bricks', categoryName: 'Bricks & Blocks', targetMarginPercent: 20, floorMarginPercent: 14, absoluteMinimum: 25, requiresApprovalBelow: 16, customerTierOverrides: { platinum: 12, gold: 14, silver: 16 } },
  { id: 'mgn-005', categoryId: 'cat-wood', categoryName: 'Wood & Timber', targetMarginPercent: 25, floorMarginPercent: 18, absoluteMinimum: 75, requiresApprovalBelow: 20, customerTierOverrides: { platinum: 16, gold: 18, silver: 20 } },
  { id: 'mgn-006', categoryId: 'cat-paint', categoryName: 'Paint & Coatings', targetMarginPercent: 30, floorMarginPercent: 22, absoluteMinimum: 40, requiresApprovalBelow: 25, customerTierOverrides: { platinum: 20, gold: 22, silver: 25 } },
  { id: 'mgn-007', categoryId: 'cat-plumbing', categoryName: 'Plumbing', targetMarginPercent: 28, floorMarginPercent: 20, absoluteMinimum: 35, requiresApprovalBelow: 23, customerTierOverrides: { platinum: 18, gold: 20, silver: 23 } },
  { id: 'mgn-008', categoryId: 'cat-electrical', categoryName: 'Electrical', targetMarginPercent: 26, floorMarginPercent: 19, absoluteMinimum: 45, requiresApprovalBelow: 22, customerTierOverrides: { platinum: 17, gold: 19, silver: 22 } },
]

// ─── Mock Approval Thresholds ───────────────────────────

const MOCK_APPROVAL_THRESHOLDS: ApprovalThreshold[] = [
  { id: 'apr-001', type: 'quote_margin', condition: 'Margin below floor percentage', approvers: ['sales_manager', 'ceo'], escalationMinutes: 120, escalationTarget: 'ceo' },
  { id: 'apr-002', type: 'credit_limit', condition: 'Credit limit increase > 50,000 EGP', approvers: ['finance_manager', 'ceo'], escalationMinutes: 240, escalationTarget: 'ceo' },
  { id: 'apr-003', type: 'po_approval', condition: 'PO value > 100,000 EGP', approvers: ['procurement_manager'], escalationMinutes: 120, escalationTarget: 'ceo' },
  { id: 'apr-004', type: 'return_credit', condition: 'Return/credit note > 10,000 EGP', approvers: ['sales_manager', 'finance_manager'], escalationMinutes: 180, escalationTarget: 'ceo' },
  { id: 'apr-005', type: 'inventory_adjustment', condition: 'Adjustment value > 5,000 EGP', approvers: ['warehouse_manager'], escalationMinutes: 60, escalationTarget: 'operations_manager' },
]

// ─── Mock Holidays ──────────────────────────────────────

const MOCK_HOLIDAYS: Holiday[] = [
  // Fixed holidays
  { id: 'hol-001', name: "New Year's Day", nameAr: 'رأس السنة الميلادية', estimatedDate: '2026-01-01', confirmedDate: '2026-01-01', isIslamic: false, year: 2026 },
  { id: 'hol-002', name: 'Revolution Day (Jan 25)', nameAr: 'ثورة ٢٥ يناير', estimatedDate: '2026-01-25', confirmedDate: '2026-01-25', isIslamic: false, year: 2026 },
  { id: 'hol-003', name: 'Sinai Liberation Day', nameAr: 'عيد تحرير سيناء', estimatedDate: '2026-04-25', confirmedDate: '2026-04-25', isIslamic: false, year: 2026 },
  { id: 'hol-004', name: 'Labour Day', nameAr: 'عيد العمال', estimatedDate: '2026-05-01', confirmedDate: '2026-05-01', isIslamic: false, year: 2026 },
  { id: 'hol-005', name: 'Revolution Day (Jun 30)', nameAr: 'ثورة ٣٠ يونيو', estimatedDate: '2026-06-30', confirmedDate: '2026-06-30', isIslamic: false, year: 2026 },
  { id: 'hol-006', name: 'Armed Forces Day', nameAr: 'عيد القوات المسلحة', estimatedDate: '2026-10-06', confirmedDate: '2026-10-06', isIslamic: false, year: 2026 },
  { id: 'hol-007', name: 'Coptic Christmas', nameAr: 'عيد الميلاد المجيد', estimatedDate: '2026-01-07', confirmedDate: '2026-01-07', isIslamic: false, year: 2026 },
  { id: 'hol-008', name: 'Sham El-Nessim', nameAr: 'شم النسيم', estimatedDate: '2026-04-13', confirmedDate: '2026-04-13', isIslamic: false, year: 2026 },
  // Islamic holidays (estimated until government announces based on moon sighting)
  { id: 'hol-009', name: 'Eid al-Fitr', nameAr: 'عيد الفطر', estimatedDate: '2026-03-20', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-010', name: 'Eid al-Fitr (Day 2)', nameAr: 'عيد الفطر (اليوم الثاني)', estimatedDate: '2026-03-21', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-011', name: 'Eid al-Fitr (Day 3)', nameAr: 'عيد الفطر (اليوم الثالث)', estimatedDate: '2026-03-22', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-012', name: 'Eid al-Adha', nameAr: 'عيد الأضحى', estimatedDate: '2026-05-27', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-013', name: 'Eid al-Adha (Day 2)', nameAr: 'عيد الأضحى (اليوم الثاني)', estimatedDate: '2026-05-28', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-014', name: 'Eid al-Adha (Day 3)', nameAr: 'عيد الأضحى (اليوم الثالث)', estimatedDate: '2026-05-29', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-015', name: 'Eid al-Adha (Day 4)', nameAr: 'عيد الأضحى (اليوم الرابع)', estimatedDate: '2026-05-30', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-016', name: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', estimatedDate: '2026-06-17', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-017', name: "Prophet's Birthday", nameAr: 'المولد النبوي الشريف', estimatedDate: '2026-08-27', confirmedDate: null, isIslamic: true, year: 2026 },
  { id: 'hol-018', name: "Isra Mi'raj", nameAr: 'ليلة الإسراء والمعراج', estimatedDate: '2026-02-08', confirmedDate: null, isIslamic: true, year: 2026 },
]

// ─── Mock Audit Entries ─────────────────────────────────
// WORM pattern: Write Once Read Many.
// Audit entries are created by database triggers, never by this UI.
// No create/update/delete functions exist for audit data.

const MOCK_AUDIT_ENTRIES: AuditEntry[] = Array.from({ length: 50 }, (_, i) => {
  const actions = ['user.login', 'user.logout', 'quote.create', 'quote.update', 'quote.approve', 'order.create', 'order.update', 'setting.update', 'role.assign', 'role.revoke', 'margin.update', 'holiday.confirm', 'po.approve', 'credit.adjust', 'inventory.adjust']
  const entities = ['user', 'quote', 'order', 'setting', 'role', 'margin_rule', 'holiday', 'purchase_order', 'credit_limit', 'inventory']
  const users = MOCK_USERS.slice(0, 10)
  const user = users[i % users.length]!
  const action = actions[i % actions.length]!
  const entity = entities[i % entities.length]!

  return {
    id: `aud-${String(i + 1).padStart(3, '0')}`,
    userId: user.id,
    userName: user.name,
    action,
    entityType: entity,
    entityId: `${entity}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    oldValue: i % 3 === 0 ? JSON.stringify({ status: 'draft' }) : null,
    newValue: i % 3 === 0 ? JSON.stringify({ status: 'approved' }) : i % 3 === 1 ? JSON.stringify({ margin: 15 }) : null,
    timestamp: new Date(Date.now() - i * 3_600_000).toISOString(),
    ipAddress: `192.168.1.${(i % 254) + 1}`,
  }
})

// ─── Server Functions ───────────────────────────────────

export const getUserList = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserRecord[]> => {
    return MOCK_USERS
  },
)

export const getSystemConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SystemSetting[]> => {
    return MOCK_SETTINGS
  },
)

export const updateSystemConfig = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { key: string; value: string } }): Promise<{ success: boolean; key: string }> => {
    return { success: true, key: data.key }
  },
)

export const manageUserRoles = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { userId: string; roleIds: string[] } }): Promise<UserRecord> => {
    const user = MOCK_USERS.find((u) => u.id === data.userId) ?? MOCK_USERS[0]!
    return { ...user, roles: data.roleIds }
  },
)

/**
 * Get audit log entries with optional filters.
 * READ-ONLY — NO mutation functions for audit data.
 * WORM pattern: Write Once Read Many. 7-year retention, immutable.
 */
export const getAuditLog = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ entries: AuditEntry[]; total: number; page: number; pageSize: number }> => {
    // In production, filters would be applied server-side.
    // Mock returns all 50 entries paginated.
    const page = 1
    const pageSize = 20
    const start = (page - 1) * pageSize
    const entries = MOCK_AUDIT_ENTRIES.slice(start, start + pageSize)
    return {
      entries,
      total: MOCK_AUDIT_ENTRIES.length,
      page,
      pageSize,
    }
  },
)

export const updateMarginRules = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { categoryId: string; targetMarginPercent?: number; floorMarginPercent?: number; absoluteMinimum?: number } }): Promise<MarginRule> => {
    const rule = MOCK_MARGIN_RULES.find((r) => r.categoryId === data.categoryId) ?? MOCK_MARGIN_RULES[0]!
    return {
      ...rule,
      targetMarginPercent: data.targetMarginPercent ?? rule.targetMarginPercent,
      floorMarginPercent: data.floorMarginPercent ?? rule.floorMarginPercent,
      absoluteMinimum: data.absoluteMinimum ?? rule.absoluteMinimum,
    }
  },
)

export const updateApprovalThresholds = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { thresholdId: string; approvers?: string[]; escalationMinutes?: number; escalationTarget?: string } }): Promise<ApprovalThreshold> => {
    const threshold = MOCK_APPROVAL_THRESHOLDS.find((t) => t.id === data.thresholdId) ?? MOCK_APPROVAL_THRESHOLDS[0]!
    return {
      ...threshold,
      approvers: data.approvers ?? threshold.approvers,
      escalationMinutes: data.escalationMinutes ?? threshold.escalationMinutes,
      escalationTarget: data.escalationTarget ?? threshold.escalationTarget,
    }
  },
)

export const updateHolidayCalendar = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { holidayId: string; confirmedDate: string } }): Promise<Holiday> => {
    const holiday = MOCK_HOLIDAYS.find((h) => h.id === data.holidayId) ?? MOCK_HOLIDAYS[0]!
    return { ...holiday, confirmedDate: data.confirmedDate }
  },
)

// Export mock data for use in views
export const getMarginRules = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MarginRule[]> => {
    return MOCK_MARGIN_RULES
  },
)

export const getApprovalThresholds = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApprovalThreshold[]> => {
    return MOCK_APPROVAL_THRESHOLDS
  },
)

export const getHolidayCalendar = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Holiday[]> => {
    return MOCK_HOLIDAYS
  },
)
