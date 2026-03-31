# Phase 22: Remaining Internal Modules

## Goal
Customer service, HR, admin, reports, and AI assistant modules complete the internal platform.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete
- Phase 13-14 (Database tables) must be complete — tickets, ticket_messages, returns, attendance_records, leave_requests, driver_compliance, ai_conversations, etc.
- Phase 3 (Shared Packages) must be complete

## Requirements

- **CS-01**: Customer Service: WhatsApp inbox, ticket management (10-status flow), SLA tracking, returns & claims workflow, AI triage
- **HR-01**: HR: employee directory, driver compliance (CDL/medical/drug test -- blocks dispatch if expired), attendance, leave management
- **ADM-01**: Admin: users/roles/permissions, system settings, margin rules (by category), approval thresholds, holiday calendar, audit log viewer
- **RPT-01**: Reports: role-specific pre-built reports with date range/filter/export
- **AI-01**: AI Assistant: chat interface within glass window, role-aware capabilities, safety guardrails (read-only DB, draft-review-confirm)

## Success Criteria
1. Customer service shows WhatsApp inbox, ticket management (10-status flow), SLA tracking, and returns & claims workflow
2. HR tracks driver compliance (CDL/medical/drug test) and blocks dispatch if certifications are expired
3. Admin manages users/roles/permissions, margin rules, approval thresholds, holiday calendar, and audit log
4. AI assistant operates within glass window with role-aware capabilities and safety guardrails (read-only DB, draft-review-confirm)

## What to Build

### Module 7: Customer Service / Support
- WhatsApp inbox, ticket management, returns & claims

### Module 8: HR
- Employee directory, driver compliance, leave management, attendance

### Module 9: Admin
- Users/roles, system settings, margin rules, approval thresholds, holiday calendar, audit log

### Module 10: Reports
- Role-specific pre-built reports (Report Builder deferred to Phase 2)

### Module 11: AI Assistant
- Chat interface, role-aware capabilities, safety guardrails

## Spec References

### FRONTEND.md — MODULE 7: CUSTOMER SERVICE / SUPPORT

**Primary users:** CS Representatives, Claims Specialist, CS Manager
**Hotkey:** `C`

#### 7.1 Support Home View

**Tabs:** `[Home] [WhatsApp Inbox] [Tickets] [Returns/Claims] [Knowledge Base] [Reports]`

**Home content:**
- Open tickets by priority: critical, high, normal, low (counts + oldest age)
- Unread WhatsApp messages (count)
- SLA status: on-track %, at-risk %, breached %
- Active returns/claims count

#### 7.2 WhatsApp Inbox

**Layout:** Chat interface (similar to WhatsApp Web)

**Left panel:** Conversation list sorted by last message time
- Each conversation: customer name, last message preview, timestamp, unresolved indicator
- Filter: `[All]` `[Unread]` `[AI Resolved]` `[Needs Human]`

**Right panel:** Active conversation
- Message thread with customer messages and agent responses
- AI triage panel (top): AI classifies incoming message and suggests action
  - Tier 0 (55-75%): Auto-resolved by AI (order status, invoice lookup, stock checks)
  - Tier 1: AI suggests response. Agent reviews, edits, sends.
  - Tier 2: AI flags as complex. Human required.
- Customer context sidebar: name, order history, open quotes, outstanding invoices, recent deliveries, support history
- Quick actions: `[Check Order Status]` `[Look Up Invoice]` `[Create Ticket]` `[Escalate]`
- Response templates for frequent questions

#### 7.3 Ticket Management

**Ticket list:** table with number, customer, subject, priority, status, assigned agent, SLA countdown, created date

**SLAs by priority:**
| Priority | First Response | Resolution |
|----------|---------------|------------|
| Critical | 15 min | 4 hours |
| High | 1 hour | 8 hours |
| Normal | 4 hours | 24 hours |
| Low | 8 hours | 48 hours |

**Ticket detail:**
- Customer info, linked orders/quotes/invoices
- Description, attachments
- Internal notes vs customer-visible messages
- Status (10-status flow from `ticket_status` enum): New -> Open -> In Progress -> Awaiting Customer -> Awaiting Internal -> Awaiting Supplier -> Escalated -> Resolved -> Closed / Reopened
- Cross-department sub-tickets
- Activity timeline

**Ticket taxonomy:** 50+ reason tags across 7 categories: Order, Quote, Delivery, Payment, Account, Product, Platform

#### 7.4 Returns and Claims

**Damage claim flow:**
1. Customer reports damage (WhatsApp with photos)
2. System creates Damage Claim linked to delivery + order
3. Tier classification: Minor (<5% value, auto-approve), Moderate (5-20%, inspection within 48h), Major (>20%, third-party inspection within 24h)
4. Resolution options: partial replacement, credit note, price reduction, full replacement, full refund, return and reorder
5. Financial settlement: credit note issued, invoice adjusted, supplier claim filed

**Return processing:** RMA creation, warehouse receiving for inspection, credit note generation

**NPS/Feedback:** WhatsApp survey 2 hours post-delivery, 3 questions max. Detractor rescue within 24 hours.

#### 7.5 Support Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `W` | Go to WhatsApp Inbox |
| `G` then `T` | Go to Tickets |
| `G` then `R` | Go to Returns |
| `N` | New Ticket |

---

### FRONTEND.md — MODULE 8: HR

**Primary users:** HR Manager, Department Managers
**Hotkey:** `H`
**Phase 1:** Profiles, attendance, driver compliance, leave, documents
**Phase 2 (30-50 employees):** Self-service, commissions, org chart, payroll integration
**Phase 3 (100+):** Performance reviews, training, recruitment

#### 8.1 HR Home View

**Tabs:** `[Home] [Employees] [Driver Compliance] [Leave] [Attendance] [Documents] [Settings]`

**Home content:**
- Headcount: total, by department, new this month
- Compliance alerts: expiring driver certifications
- Pending leave requests
- Attendance: clocked in today / total

#### 8.2 Employee Profiles

**Employee directory:** searchable table with name, department, role, status (active/inactive), hire date
**Profile detail:**
- Personal info: name, phone, email, address, emergency contact, national ID
- Employment: role, department, hire date, contract type, reporting manager
- Compensation: salary, benefits, commission structure (linked to order margins for sales)
- Documents: contract (Arabic, 4 copies as required by Egyptian labor law), national ID copy, tax card, social insurance card, professional licenses
- Leave balance: annual (15-30 days by tenure), sick, maternity (120 days up to 3x), other
- Attendance history
- Performance notes

#### 8.3 Driver Compliance Tracking

**Per driver:**
- Professional license: degree, number, expiry
- Medical card, drug test, equipment certifications
- Insurance (contracted)
- **Red = dispatch block.** System prevents assigning driver with expired certifications.
- Alerts: 30 days before expiry, 7 days escalation

#### 8.4 Leave Management

- Leave request form: 8 types (annual, sick, maternity, paternity, study, pilgrimage, childcare, nursing)
- Manager approval with team calendar
- Vacation delegation: auto-routes queue to delegate
- Egyptian labor law compliance (15-30 days annual by tenure, 120 days maternity, mandatory 3% raise)

#### 8.5 Attendance

- Clock in/out (manual + GPS for drivers)
- Working hours: 8h/day, 48h/week (6h/day Ramadan)
- Overtime: 135% day, 170% night, 200% holidays
- Weekend: Friday + Saturday
- Holiday calendar with variable Islamic dates

---

### FRONTEND.md — MODULE 9: ADMIN

**Primary users:** IT Administrator, Department Managers, CEO
**Hotkey:** `A`

#### 9.1-9.7 Admin Sections

**Tabs:** `[Users & Roles] [Permissions] [System Settings] [Margin Rules] [Approval Thresholds] [Holiday Calendar] [Integrations] [Audit Log]`

**Users and Roles:** 25+ predefined roles. Permission principles: unauthorized elements HIDDEN not disabled. Temporary delegation for vacation.

**Permissions:** Each role maps to a set of permissions. Frontend checks are UX only -- gateway validates on every API call. Unauthorized elements are HIDDEN, not disabled.

**System Settings:** Company info (Arabic/English), currency/locale, working days/hours, prayer time API, Ramadan mode, WhatsApp/email/SMS config, payment terms defaults, quote validity defaults.

**Margin Rules:** Per material category: target margin %, floor margin %, absolute minimum, approval thresholds, customer tier overrides.

**Approval Thresholds:** Quote margin, credit limit increase, PO approvals, return/credit note, inventory adjustment. Each with condition, approver(s), escalation time/target.

**Holiday Calendar:** 14-15 Egyptian public holidays pre-loaded. Islamic holidays variable (moon sighting). Used for SLA timers, delivery scheduling, escalation.

**Integrations:** WhatsApp Business API, email (Resend), SMS (Twilio), ETA e-invoicing, prayer time API, and other third-party service configurations. Managed from this tab rather than buried in System Settings.

**Audit Log:** Every action logged: who, what, when, old/new value. Searchable, immutable (WORM), 7-year retention, exportable.

---

### FRONTEND.md — MODULE 10: REPORTS / ANALYTICS

**Primary users:** All roles (filtered), Management, CEO
**Hotkey:** `R`

#### 10.1 Role-Specific Dashboards

Each role sees different KPIs:
- **Sales:** Pipeline, conversion, response time, win rate, revenue vs target, margin trend, rep leaderboard
- **Procurement:** Pending inquiries, response rate, PO distribution, supplier rankings, cost savings
- **Operations:** Orders by stage, on-time rate, fulfillment cycle time, warehouse utilization
- **Finance:** Revenue, AR/AP outstanding, overdue, margin trend, payment distribution, 13-week forecast, cheque summary
- **Warehouse:** Inventory accuracy, pick accuracy, on-time shipment, receiving cycle time, capacity utilization
- **Dispatch:** Deliveries, first-attempt rate, stops/driver, route efficiency, Cairo compliance
- **CS:** Open tickets, SLA compliance, resolution time, NPS trend, top issues

#### 10.2 Report Builder

Phase 1: Pre-built role-specific reports with date range filtering (MTD/QTD/YTD/custom), department/team/individual filters, CSV + PDF export, recurring email scheduling. **Custom Report Builder deferred to Phase 2.**

---

### FRONTEND.md — MODULE 11: AI ASSISTANT

**Primary users:** All internal employees
**Hotkey:** `I`
**Also accessible from:** Ctrl+K command palette, floating AI button within any module

#### 11.1 AI Chat Interface

Glass window chat with text input, conversation thread, suggested prompts, full history.

#### 11.2 Role-Aware Capabilities

AI has same permission system as UI. Examples per role:
- Sales: "Show open quotes for Al-Nour", "Draft follow-up email", "Which customers inactive 30+ days?"
- Procurement: "Best rebar pricing this month?", "Supplier A on-time rate?"
- Operations: "Orders at risk of missing delivery?", "Deliveries scheduled tomorrow?"
- Finance: "AR aging over 90 days?", "Customers with bounced cheques?"
- Warehouse: "Where is Portland Cement Type I?", "Cycle count accuracy?"
- Dispatch: "Available drivers for tomorrow?", "Optimize Cairo routes?"
- Management: "How are we doing this month?", "Compare quarters", "What needs my approval?"

#### 11.3 AI Features Beyond Chat

- Morning briefing, anomaly detection, draft generation, document parsing, price prediction

#### 11.4 AI Safety

- Never constructs raw SQL (parameterized queries only)
- Read-only database connection
- Draft-review-confirm for all mutations
- Capability tiers per role
- Full audit log
- Prompt caching for repeated schemas (90% cost reduction)

#### 11.5 AI Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `I` | Open AI module |
| `Ctrl+K` then type | Quick AI query |
| `Enter` | Send message |
| `Escape` | Close |

### BACKEND.md — Server Functions

**Support (7 functions):**
`getTicketQueue`, `respondToTicket`, `escalateTicket`, `getWhatsAppInbox`, `sendWhatsAppReply`, `createDamageClaim`, `createRMA`

**HR (8 functions):**
`getEmployeeDirectory`, `updateEmployeeRecord`, `getDriverCompliance`, `getLeaveRequests`, `submitLeaveRequest`, `approveLeaveRequest`, `getAttendance`, `clockInOut`

**Admin (8 functions):**
`getSystemConfig`, `updateSystemConfig`, `manageUserRoles`, `getUserList`, `getAuditLog`, `updateMarginRules`, `updateApprovalThresholds`, `updateHolidayCalendar`

**AI (2 functions):**
`askAI` (POST, routes by complexity), `getAISuggestion` (GET, cached 15min)

## Business Rules

**Support SLAs:** Critical 15min/4h, High 1h/8h, Normal 4h/24h, Low 8h/48h.

**Damage Claims:** Three tiers -- Minor (<5% auto-approve), Moderate (5-20%, 48h inspection), Major (>20%, 24h third-party). Egyptian Commercial Code Article 101: 15 days to notify seller of damage/shortage.

**Driver Compliance (Egyptian Law):**
- Licenses: Third/Second/First Degree professional system
- Working hours: 8h/day, 48h/week, 12h max presence. Overtime 135%/170%/200%
- Drug testing: mandatory for license renewal (Decision 1741/2025)
- GPS tracking: legal with consent (Data Protection Law 151/2020)

**Egyptian Labor Law (Law 14/2025):**
- Social insurance: Employee 11% + Employer 18.75%
- 8 leave types with specific allowances
- Mandatory 3% annual salary increase
- Arabic contracts required

**AI Safety:** Read-only DB, parameterized queries only, draft-review-confirm, role-based capability tiers, full audit logging.

## Non-Negotiable Rules

1. **Three colors only.** White, Black, Blue.
2. **Spatial glass, not dashboards.** Each module opens in its own glass window.
3. **Geist Mono for ALL numbers.**
4. **React Aria Components, NOT shadcn.**
5. **Motion v12.** Import from `motion/react`.
6. **`useWatch()`, NEVER `watch()`.**
7. **Colors in `:root {}`, NEVER in `@theme`.**
8. **ALL numbers -> Arabic-Indic numerals in Arabic context.**

## Known Risks & Gotchas

- WhatsApp inbox requires WhatsApp Cloud API integration (Phase 27) — for Phase 22, build the UI with mock data
- AI assistant requires AI Pipeline (Phase 30) — build the chat UI and routing infrastructure, mock AI responses
- Report Builder is deferred to Phase 2 — only build pre-built role-specific reports
- Holiday calendar Islamic dates are variable by moon sighting — must support "estimated" vs "confirmed" date fields
- Audit log WORM pattern: append-only, never delete or modify

## Tips

- This phase covers 5 modules but they are all smaller than the previous ones. Prioritize CS and Admin first.
- WhatsApp inbox chat UI is similar to the portal AI chat — reuse patterns
- Driver compliance tracking integrates with dispatch (Phase 21) — expired = blocked from assignment
- The AI module is a glass window like any other module — it uses `useChat()` from @tanstack/ai-react
- Reports module Phase 1 is just pre-built reports with filters and export — no drag-and-drop builder
- Admin audit log viewer needs search, filtering, and export — it's a large dataset, use pagination
