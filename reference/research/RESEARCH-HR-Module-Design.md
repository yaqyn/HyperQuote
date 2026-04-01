> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: HR Module Design for HyperQuote
## B2B Building Materials Distribution — Internal Platform (app.hyperquote.net)

**Date:** 2026-03-28
**Context:** HyperQuote is a quote-based B2B building materials distributor with 10-50 employees growing to 100+. The HR module is part of the unified internal platform. The company may operate in Egypt and/or the US, employing warehouse workers, drivers, sales reps, and office staff.

**Companion Documents:**
- `RESEARCH-Roles-Departments-Responsibilities.md` — Complete role catalog
- `RESEARCH-Driver-Onboarding-Compliance-Legal.md` — CDL, drug testing, FMCSA compliance
- `RESEARCH-Internal-Operations-Org-Structure.md` — Org structure by company size
- `RESEARCH-Complete-Driver-Operations-Model.md` — Driver operations

---

## TABLE OF CONTENTS

1. [Build In-House vs Integrate: The Strategic Decision](#1-build-in-house-vs-integrate-the-strategic-decision)
2. [What to Build In-House (Core HR in HyperQuote)](#2-what-to-build-in-house-core-hr-in-hyperquote)
3. [What to Integrate Externally](#3-what-to-integrate-externally)
4. [Employee Data Model](#4-employee-data-model)
5. [Egyptian Labor Law Compliance](#5-egyptian-labor-law-compliance)
6. [Driver HR Management](#6-driver-hr-management)
7. [Attendance and Time Tracking](#7-attendance-and-time-tracking)
8. [Leave Management](#8-leave-management)
9. [Payroll Integration](#9-payroll-integration)
10. [Employee Self-Service](#10-employee-self-service)
11. [Organizational Chart](#11-organizational-chart)
12. [HR Reporting and CEO Dashboard](#12-hr-reporting-and-ceo-dashboard)
13. [Onboarding and Offboarding](#13-onboarding-and-offboarding)
14. [Document Management](#14-document-management)
15. [Performance Management](#15-performance-management)
16. [Implementation Phases](#16-implementation-phases)

---

## 1. BUILD IN-HOUSE VS INTEGRATE: THE STRATEGIC DECISION

### The Core Principle

**Build what is unique to your business. Integrate what is commoditized.**

HyperQuote is not a generic office company. It has drivers with CDL expirations, warehouse workers clocking in/out at 5am, sales reps earning commissions on $500K deals, and (potentially) Egyptian labor law compliance. No off-the-shelf HR tool handles all of this well. But payroll tax calculation and remittance is a solved problem — never build that.

### Decision Matrix

| Capability | Build In-House | Integrate Externally | Reasoning |
|---|---|---|---|
| **Employee directory & profiles** | YES | — | Core to every other module in the platform. Needed for permissions, assignments, org chart. |
| **Organizational chart** | YES | — | Auto-generated from reporting lines already in the system. Simple to build. |
| **Driver compliance tracking** | YES | — | CDL expiry, drug tests, Moffett certs, medical cards — deeply tied to dispatch/delivery. No HR tool does this well for building materials. |
| **Attendance / time tracking** | YES | — | Must integrate with driver app (shift start/end), warehouse operations, and GPS. Platform-native. |
| **Leave management** | YES | — | Egyptian labor law has specific rules. Must integrate with attendance and payroll. Relatively simple to build. |
| **Commission calculations** | YES | — | Tied to the quote/order system. Only HyperQuote knows the deal margin and commission rules. |
| **Onboarding checklists** | YES | — | Driver onboarding is unique (CDL verification, drug test, Moffett cert). Office onboarding can use the same engine. |
| **Document storage** | YES | — | Contracts, IDs, certifications already need to be in the platform for compliance. Use Supabase Storage / R2. |
| **Performance reviews** | LATER | — | Nice-to-have. Build simple version at 50+ employees. |
| **Payroll processing** | NO | YES | Tax calculation, remittance, payslip generation — use a payroll provider. In Egypt: local provider. In US: Gusto (< 50 employees) or ADP (50+). |
| **Benefits administration** | NO | YES | Health insurance, retirement — managed by external provider. |
| **Recruitment / ATS** | NO | YES (or manual) | At 10-50 employees, hiring is infrequent. Use LinkedIn/Wuzzuf + spreadsheet or simple ATS. |
| **Training / LMS** | NO | LATER | Not needed until 100+ employees. |

### Why NOT Use BambooHR / Gusto / Zoho People as the Primary HR System

1. **Data fragmentation:** Employee data would live outside the platform. Every module (dispatch, warehouse, sales, finance) needs to know who the employee is, what role they have, what permissions they get, and what department they belong to. If this lives in BambooHR, every feature needs an API call.

2. **Driver compliance is not standard HR:** No HR platform tracks CDL Class A vs B, Moffett certification expiry, drug test scheduling tied to FMCSA random pools, or medical card 2-year renewal cycles. You would still need to build this.

3. **Egyptian labor law:** BambooHR and Gusto do not support Egyptian payroll, social insurance (11% employee / 18.75% employer), or Arabic employment contracts in 4 copies. Zoho People has some MENA support but is limited.

4. **Attendance tied to operations:** Clock-in for a warehouse worker must trigger warehouse staffing visibility. Driver shift-start must trigger route availability. This is operational, not just HR.

5. **Commission tied to deals:** Sales rep commissions are calculated from quote margins, deal values, and custom rules. No external HR tool can calculate this.

### The Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│              HyperQuote Internal Platform                │
│                  (app.hyperquote.net)                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Employee     │  │  Attendance  │  │   Leave      │  │
│  │  Directory    │  │  & Time      │  │   Management │  │
│  │  & Profiles   │  │  Tracking    │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Driver       │  │  Org Chart   │  │  Document    │  │
│  │  Compliance   │  │  & Reporting │  │  Management  │  │
│  │  Tracker      │  │  Lines       │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Onboarding  │  │  Commission  │  │  HR Reports  │  │
│  │  & Offboard  │  │  Calculator  │  │  & Dashboard │  │
│  │  Checklists  │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│                    ▼ API Sync ▼                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           External Payroll Provider              │    │
│  │  Egypt: Local provider (e.g., PaperWork, Bayzat) │    │
│  │  US: Gusto (<50) → ADP (50+)                    │    │
│  │                                                   │    │
│  │  Receives: hours worked, leave taken, base salary │    │
│  │           commissions, deductions, social ins.    │    │
│  │  Returns: payslips, tax filings, net pay          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. WHAT TO BUILD IN-HOUSE (CORE HR IN HYPERQUOTE)

### Essential (Phase 1 — Launch)

| Feature | Why It Must Be In-House |
|---|---|
| **Employee profiles & directory** | Foundation for permissions, assignments, org chart. Every module references employees. |
| **Reporting lines & departments** | Drives approval workflows (leave, expenses, quotes), org chart, and permission inheritance. |
| **Attendance tracking** | Warehouse clock-in/out, driver shift start/end from driver app, GPS-based field tracking. Operational, not just HR. |
| **Leave management** | Egyptian law requires tracking 6+ leave types. Must deduct from balances, block scheduling conflicts, feed into payroll. |
| **Driver compliance tracker** | CDL expiry, medical card, drug test dates, Moffett cert, safety training. Triggers alerts. Blocks dispatch if expired. |
| **Document storage** | Employment contracts, IDs, certifications, medical cards. Required for compliance. Stored in Supabase Storage or R2. |
| **Onboarding checklists** | Driver onboarding has 15+ steps (CDL verify, drug test, road test, Moffett training). Office onboarding is simpler but still structured. |

### Important (Phase 2 — Growth to 50+)

| Feature | Why |
|---|---|
| **Commission calculator** | Sales reps need to see projected and actual commissions. Tied to quote/order margin data already in the platform. |
| **Employee self-service portal** | View payslips (from payroll provider), request leave, update personal info, view schedule. Reduces HR admin workload by 40%. |
| **Org chart visualization** | Auto-generated from reporting lines. Interactive. Helps CEO see the company structure at a glance. |
| **HR dashboard for CEO** | Headcount, turnover, cost per employee, certification compliance %, attendance patterns. |

### Nice-to-Have (Phase 3 — 100+ Employees)

| Feature | Why |
|---|---|
| **Performance reviews** | Simple 360 review or quarterly check-in system. Not needed at < 50 employees. |
| **Training tracker / LMS** | Track who completed safety training, forklift cert, new product training. |
| **Recruitment pipeline** | Simple ATS for tracking candidates, interview stages, offer letters. |
| **Employee surveys** | Engagement surveys, pulse checks. |

---

## 3. WHAT TO INTEGRATE EXTERNALLY

### Payroll Provider

**Never build payroll.** Tax calculation, remittance, payslip generation, year-end filings — this is a regulated, complex domain that changes every year.

| Region | Provider | Pricing | Notes |
|---|---|---|---|
| **Egypt** | Local payroll provider (PaperWork, Bayzat, or local accountant) | Varies | Must handle Egyptian social insurance (18.75% employer + 11% employee), income tax brackets (0%-27.5%), Arabic payslips |
| **US (< 50 employees)** | Gusto | $40/mo + $6/employee | Transparent pricing, modern API, handles federal/state taxes, 1099s for contractors |
| **US (50+ employees)** | ADP Run / ADP Workforce Now | Quote-based | Better for multi-state, complex overtime, larger teams |
| **Multi-country** | Deel, Remote, Papaya Global | $49-$599/employee/mo | If HyperQuote has employees in multiple countries |

### Data Flow: HyperQuote → Payroll Provider

```
HyperQuote sends (monthly or per pay period):
├── Employee ID, name, bank details (synced on change)
├── Hours worked (from attendance module)
├── Overtime hours (calculated per Egyptian/US rules)
├── Leave days taken (by type)
├── Base salary (from employee profile)
├── Commissions earned (from commission calculator)
├── Deductions (advances, loans, penalties)
├── Social insurance salary base (Egypt)
└── Any mid-period changes (new hire, termination, raise)

Payroll provider returns:
├── Net pay per employee
├── Tax withheld per employee
├── Social insurance contributions
├── Payslip PDF (or data for rendering)
└── Filing confirmations
```

### Benefits Administration

At 10-50 employees, benefits (health insurance, retirement) are typically managed directly with providers or through a broker. No need to build this. At 100+, integrate with a benefits platform.

### Recruitment

At the current size, use LinkedIn + Wuzzuf (Egypt) + a simple shared spreadsheet or Notion board. At 50+, consider integrating with a lightweight ATS (Lever, Greenhouse, or Zoho Recruit).

---

## 4. EMPLOYEE DATA MODEL

### Core Employee Record

Every employee in the system needs the following data. This is the `employees` table (or related tables) in Supabase.

#### Personal Information

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | Primary key, referenced everywhere |
| `employee_number` | String | Yes | Human-readable ID (e.g., HQ-0042) |
| `first_name` | String | Yes | |
| `last_name` | String | Yes | |
| `first_name_ar` | String | Egypt | Arabic name for contracts |
| `last_name_ar` | String | Egypt | Arabic name for contracts |
| `email` | String | Yes | Company email, used for auth |
| `personal_email` | String | No | |
| `phone` | String | Yes | |
| `date_of_birth` | Date | Yes | |
| `gender` | Enum | Yes | Male / Female |
| `nationality` | String | Yes | |
| `national_id` | String | Yes | Egyptian National ID or SSN |
| `national_id_expiry` | Date | If applicable | |
| `passport_number` | String | If foreign | |
| `passport_expiry` | Date | If foreign | |
| `address` | JSON | Yes | Street, city, state/governorate, postal code, country |
| `profile_photo_url` | String | No | |

#### Emergency Contact

| Field | Type | Required |
|---|---|---|
| `emergency_contact_name` | String | Yes |
| `emergency_contact_phone` | String | Yes |
| `emergency_contact_relationship` | String | Yes |
| `emergency_contact_2_name` | String | No |
| `emergency_contact_2_phone` | String | No |

#### Employment Information

| Field | Type | Required | Notes |
|---|---|---|---|
| `department` | FK → departments | Yes | Sales, Operations, Warehouse, Logistics, Finance, Admin, IT |
| `job_title` | String | Yes | |
| `job_title_ar` | String | Egypt | Arabic for contracts |
| `role` | FK → roles | Yes | Maps to app permissions |
| `reports_to` | FK → employees | Yes (except CEO) | Direct manager, drives org chart |
| `hire_date` | Date | Yes | |
| `probation_end_date` | Date | Yes | 3 months max in Egypt |
| `contract_type` | Enum | Yes | `full_time`, `part_time`, `contractor`, `temporary` |
| `contract_start_date` | Date | Yes | |
| `contract_end_date` | Date | If fixed-term | |
| `employment_status` | Enum | Yes | `active`, `probation`, `on_leave`, `suspended`, `terminated`, `resigned` |
| `termination_date` | Date | If terminated | |
| `termination_reason` | Text | If terminated | |
| `work_location` | FK → locations | Yes | Office, warehouse, remote, field |
| `assigned_warehouse` | FK → warehouses | If warehouse/driver | |

#### Compensation

| Field | Type | Required | Notes |
|---|---|---|---|
| `base_salary` | Decimal | Yes | Monthly gross salary |
| `salary_currency` | Enum | Yes | EGP, USD |
| `pay_frequency` | Enum | Yes | `monthly`, `bi_weekly`, `weekly` |
| `social_insurance_salary` | Decimal | Egypt | The insured salary for social insurance calculation (has min/max caps) |
| `commission_plan` | FK → commission_plans | If sales | |
| `bank_name` | String | Yes | |
| `bank_account_number` | String | Yes | Encrypted |
| `bank_branch` | String | No | |
| `iban` | String | If applicable | |

#### Driver-Specific Fields (see Section 6 for detail)

| Field | Type | Required | Notes |
|---|---|---|---|
| `is_driver` | Boolean | Yes | Flags driver-specific HR logic |
| `cdl_class` | Enum | If driver | `class_a`, `class_b`, `none` |
| `cdl_number` | String | If driver | |
| `cdl_state` | String | If driver | Issuing state |
| `cdl_expiry_date` | Date | If driver | **Alert at 90, 60, 30 days before expiry** |
| `cdl_endorsements` | Array | If driver | `H`, `N`, `T`, `X`, `P` |
| `cdl_restrictions` | Array | If driver | `L` (no air brakes), etc. |
| `medical_card_expiry` | Date | If driver | **2-year cycle, alert at 90, 60, 30 days** |
| `drug_test_last_date` | Date | If driver | |
| `drug_test_next_due` | Date | If driver | |
| `drug_test_status` | Enum | If driver | `clear`, `pending`, `failed` |
| `moffett_certified` | Boolean | If driver | |
| `moffett_cert_expiry` | Date | If driver | **3-year cycle typically** |
| `assigned_vehicle` | FK → vehicles | If driver | |
| `safety_training_date` | Date | If driver | |

---

## 5. EGYPTIAN LABOR LAW COMPLIANCE

### Overview: Law No. 14 of 2025 (Effective September 1, 2025)

Egypt enacted a comprehensive new labor law in May 2025. This is the first major overhaul since 2003. **Every HR system serving Egyptian employees must comply with these requirements.**

### Employment Contracts

| Requirement | Detail | System Implication |
|---|---|---|
| **Written in Arabic** | Contracts must be in Arabic. Bilingual allowed for non-Arabic speakers. | System must generate Arabic contracts or store Arabic contract templates. |
| **Four copies** | One each for: employer, employee, social insurance office, Labour Office | Document management must track which copies have been distributed. |
| **Required content** | Start date, employer identity/address, employee qualifications, job description, wage details, payment method | Employee profile must capture all these fields. |
| **Indefinite-term default** | If no term specified, the contract is indefinite | `contract_type` and `contract_end_date` logic |
| **Probation max 3 months** | Cannot exceed 3 months | `probation_end_date` must be <= `hire_date` + 90 days |

### Working Hours and Overtime

| Rule | Detail | System Implication |
|---|---|---|
| **Standard hours** | 8 hours/day, 48 hours/week | Attendance module must flag overtime beyond 8h/day or 48h/week |
| **Rest period** | Minimum 1 hour break during workday (not counted as work time) | Clock-in/out must account for breaks |
| **Weekly rest** | 1 paid rest day per week (typically Friday) | Leave/scheduling must respect this |
| **Daytime overtime** | 135% of normal hourly wage (35% premium) | Overtime calculation in payroll sync |
| **Night overtime** | 170% of normal hourly wage (70% premium) | Night = 7pm-7am (or 10pm-6am per some provisions) |
| **Holiday/rest day work** | 200% of normal wage (double pay) | Must flag work on Fridays and public holidays |
| **Max overtime** | 2 hours per day in special circumstances | Alert if overtime exceeds 2h/day |

### Social Insurance (Law No. 148 of 2019, Updated Annually)

| Component | Employee | Employer | Notes |
|---|---|---|---|
| **Social insurance** | 11% | 18.75% | Of the social insurance salary (not gross salary) |
| **Health insurance** | 1% | 3.25% | Of gross salary, no cap |
| **Training fund** | — | 0.25% of min social insured salary | Min EGP 10, max EGP 30 per employee |

**Salary Caps (2025):**
- Minimum social insurance salary: EGP 2,300/month
- Maximum social insurance salary: EGP 14,500/month

**Salary Caps (2026):**
- Minimum: EGP 2,700/month
- Maximum: EGP 16,700/month

**System must:**
- Store the `social_insurance_salary` per employee (capped between min and max)
- Calculate employer and employee contributions
- Update caps annually (new values every January 1)
- Send contribution amounts to payroll provider

### Income Tax Brackets (Progressive, Annual)

| Annual Income (EGP) | Tax Rate |
|---|---|
| 0 - 40,000 | 0% (exempt) |
| 40,001 - 55,000 | 10% |
| 55,001 - 70,000 | 15% |
| 70,001 - 200,000 | 20% |
| 200,001 - 400,000 | 22.5% |
| 400,001 - 1,200,000 | 25% |
| Over 1,200,000 | 27.5% |

**Personal exemption:** EGP 20,000/year (deducted before applying brackets).

**System must:**
- Send gross salary and deductions to payroll provider
- Payroll provider calculates and withholds tax monthly
- Withholding remitted to tax authority within 15 days of the following month

### Leave Entitlements (Egyptian Law)

| Leave Type | Entitlement | Pay | Notes |
|---|---|---|---|
| **Annual leave (Year 1)** | 15 working days | 100% | |
| **Annual leave (Year 2+)** | 21 working days | 100% | |
| **Annual leave (10+ years)** | 30 working days | 100% | Across total career, not just with current employer |
| **Annual leave (disabled)** | 45 working days | 100% | From date of employment |
| **Annual leave (50+ years old)** | 30 working days | 100% | |
| **Maternity leave** | 120 calendar days (4 months) | 100% | Minimum 45 days post-delivery. Up to 3 times during employment. |
| **Paternity leave** | 1 day (day of birth) | 100% | Up to 3 times during employment. Does not deduct from annual leave. |
| **Sick leave** | Up to 180 days | 75% (first 90 days), 85% (next 90 days) | Paid by social insurance, not employer. Medical certificate required. |
| **Sick leave (industrial)** | 3 months full, 6 months at 85%, 3 months at 75% | Varies | Per 3-year service cycle |
| **Childcare leave** | Up to 2 years unpaid | 0% | For women with 1+ year service, at companies with 50+ employees. Up to 3 times. |
| **Study/exam leave** | Actual exam days | 100% | 10-15 days notice required. Does not deduct from annual leave. |
| **Nursing breaks** | 2x 30-minute breaks daily | 100% | For 2 years after childbirth. Counted as work time. |
| **Public holidays** | ~15 days/year | 100% | Islamic and national holidays (dates vary) |

**System must:**
- Track leave balances per type per employee
- Auto-calculate entitlement based on years of service and age
- Enforce minimum post-delivery maternity days (45)
- Track maternity/paternity usage count (max 3 per career)
- Require medical certificate upload for sick leave
- Calculate partial pay for sick leave (75%/85%)
- Block scheduling if leave balance insufficient

### Mandatory Annual Raise

The law requires a minimum annual salary increase of **3% of the social insured salary** for all private sector employees.

**System must:**
- Track last raise date per employee
- Alert HR when annual raise is due
- Ensure raise meets minimum threshold

### Termination Rules

| Scenario | Requirement | System Implication |
|---|---|---|
| **Fixed-term contract ends** | No compensation needed | Track contract end date, send alert |
| **Employer terminates indefinite** | 2 months' salary per year of service | Calculate severance based on tenure |
| **Employee resigns** | 3-month notice period | Track notice period, resignation date |
| **Disciplinary dismissal** | Requires court approval | Track disciplinary actions, court status |
| **Pre-signed resignation** | Legally invalid under new law | Never use pre-dated resignation forms |
| **Record retention** | 5 years after termination | Do not delete terminated employee records |

### Compliance Checklist for the HR System

- [ ] Arabic employment contracts generated or stored
- [ ] 4-copy contract distribution tracked
- [ ] Social insurance contributions calculated correctly
- [ ] Social insurance salary caps updated annually
- [ ] Income tax withholding sent to payroll provider
- [ ] All 8 leave types tracked with correct balances
- [ ] Maternity leave usage count tracked (max 3)
- [ ] Annual 3% minimum raise enforced
- [ ] Overtime calculated at 135% (day) / 170% (night) / 200% (holiday)
- [ ] Weekly rest day enforced
- [ ] Probation period capped at 3 months
- [ ] Termination requires proper notice/court approval
- [ ] Employee files retained 5 years post-termination
- [ ] Employee data submitted to Labour Office within 30 days of hire

---

## 6. DRIVER HR MANAGEMENT

### Why Drivers Need Special HR Treatment

Drivers are the highest-compliance-risk employees in a building materials distribution company. A single expired CDL or missed drug test can result in:
- FMCSA fines of $16,000+ per violation
- DOT out-of-service orders (truck pulled off the road)
- Insurance coverage voidance (if accident occurs with non-compliant driver)
- Criminal liability for the fleet manager

### Driver Compliance Data Points

| Data Point | Renewal Cycle | Alert Schedule | Blocks Dispatch? |
|---|---|---|---|
| **CDL license** | Per state (typically 5-8 years) | 90, 60, 30, 14 days before expiry | YES — expired CDL = cannot drive |
| **CDL medical card** | 2 years | 90, 60, 30, 14 days before expiry | YES — expired medical = CDL downgraded |
| **DOT drug test (pre-employment)** | Before first dispatch | Must be completed before assignment | YES — no clear test = no driving |
| **DOT drug test (random)** | Annual pool (50% rate for drugs, 10% for alcohol) | Selected drivers notified immediately | YES — refusal = positive result |
| **DOT drug test (post-accident)** | After qualifying accidents | Within 8 hours (alcohol) / 32 hours (drugs) | YES — must test before returning |
| **Moffett/forklift certification** | 3 years (OSHA) | 90, 60, 30 days before expiry | YES — for Moffett-assigned routes |
| **Safety training** | Annual | 30 days before annual date | NO — but required for compliance |
| **MVR (Motor Vehicle Record)** | Annual check | 30 days before annual review date | NO — but flags risk |
| **Road test (internal)** | At hire | Before first solo dispatch | YES |

### Integration with Dispatch Module

The HR compliance tracker MUST integrate with the dispatch/delivery module:

```
When dispatcher assigns driver to a route:
1. Check CDL expiry → is it current?
2. Check CDL class → does it match the vehicle (Class A for tractor-trailer)?
3. Check medical card → is it current?
4. Check drug test status → is it clear?
5. Check Moffett cert → if route requires Moffett delivery, is cert current?
6. Check Hours of Service → has driver exceeded 11h driving / 14h on-duty?

If ANY check fails → BLOCK assignment with specific reason
```

### Driver Compliance Dashboard

The fleet manager and HR need a dashboard showing:

```
DRIVER COMPLIANCE OVERVIEW
─────────────────────────────────────────────
Total Drivers: 12
Fully Compliant: 9 (75%)  ← Green
Expiring Soon (30 days): 2 (17%)  ← Yellow
Non-Compliant: 1 (8%)  ← Red

EXPIRING ITEMS
─────────────────────────────────────────────
🔴 Ahmed K. — CDL Medical Card expired 3 days ago → BLOCKED from dispatch
🟡 Mohamed S. — Moffett cert expires in 22 days → Schedule renewal
🟡 Carlos R. — CDL expires in 45 days → Schedule renewal

UPCOMING RANDOM DRUG TESTS
─────────────────────────────────────────────
Q1 2026 pool: 3 drivers selected (due by March 31)
├── Ali H. — Tested Jan 15 ✓
├── James W. — Scheduled for March 5
└── Youssef M. — Not yet scheduled ← ACTION NEEDED
```

### Drug Test Scheduling (FMCSA/DOT Requirements)

The system must maintain a random drug testing pool:

1. All CDL drivers are in the pool
2. Each year, at least 50% must be randomly tested for drugs, 10% for alcohol
3. Selection must be truly random (use cryptographic random, not sequential)
4. Selected drivers must be notified and tested within the testing period
5. Results must be recorded: Negative, Positive, Refused (= Positive)
6. Positive result triggers immediate removal from safety-sensitive duties
7. Return-to-duty requires SAP (Substance Abuse Professional) evaluation + follow-up testing

**System implementation:**
- Store pool membership (all active CDL drivers)
- Generate random selections quarterly (configurable frequency)
- Track notification date, test date, result
- Automatically flag driver status if positive/refused
- Block dispatch for non-compliant drivers

### Post-January 2026 Digital Medical Certification

As of January 10, 2026, medical certifications are reported digitally to FMCSA and reflected on the MVR. Carriers must verify medical qualification through MVR checks rather than paper certificates. The system should:
- Store MVR check date and result
- Alert when annual MVR review is due
- Flag any status changes (medical certification lapsed on MVR)

---

## 7. ATTENDANCE AND TIME TRACKING

### Different Employee Types Need Different Tracking

| Employee Type | Clock Method | Location Verification | Overtime Rules | Notes |
|---|---|---|---|---|
| **Office staff** | Web app clock-in/out | IP-based (office network) or none | After 8h/day or 48h/week | Standard |
| **Warehouse workers** | Tablet kiosk at warehouse or mobile app | Geofence around warehouse | After 8h/day, night premium after 7pm | Early shifts common (5am-1pm) |
| **Drivers** | Driver app (shift start/end) | GPS at warehouse or first stop | After 8h/day, HOS limits apply separately | Tied to route/delivery system |
| **Sales reps (field)** | Mobile app with GPS | GPS verification optional | After 8h/day | Often on client sites |
| **Sales reps (office)** | Web app clock-in/out | IP-based | After 8h/day | Standard office |

### Attendance System Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Office Web App │     │  Warehouse Kiosk │     │   Driver App     │
│   Clock In/Out   │     │  (Tablet + PIN)  │     │  Shift Start/End │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                         │
         ▼                        ▼                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Attendance Records Table                          │
│  employee_id | clock_in | clock_out | type | location | verified    │
│  UUID        | timestamp| timestamp | enum | point    | boolean     │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Payroll Calculation Engine                         │
│  Regular hours | Overtime (day) | Overtime (night) | Holiday hours   │
│  × 100%        | × 135%         | × 170%           | × 200%         │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Payroll Provider Sync                              │
│  Monthly summary per employee → External payroll system              │
└──────────────────────────────────────────────────────────────────────┘
```

### Geofencing for Warehouse and Field

- **Warehouse geofence:** Define a radius (e.g., 100m) around each warehouse. Clock-in only accepted within the geofence. Prevents remote clock-in fraud.
- **Driver geofence:** Shift start accepted at warehouse or at first delivery stop. GPS coordinates logged with each clock event.
- **Buddy punching prevention:** Each employee uses their own authenticated session (phone or badge). PIN + device verification for kiosk.

### What Feeds Into Payroll

Each pay period, the attendance system calculates per employee:

| Data Point | Calculation |
|---|---|
| Regular hours worked | Total hours - overtime - leave hours |
| Daytime overtime hours | Hours beyond 8/day worked between 7am-7pm |
| Night overtime hours | Hours beyond 8/day worked between 7pm-7am |
| Holiday hours | Any hours worked on official holidays or weekly rest day |
| Leave days taken | By type (annual, sick, etc.) — from leave module |
| Absent days (unexcused) | Days with no clock-in and no approved leave |
| Late arrivals | Count and total minutes late |

---

## 8. LEAVE MANAGEMENT

### Leave Types to Implement

Based on Egyptian labor law and general best practices:

| Leave Type | Code | Accrual | Approval Required | Documents Required | Payroll Impact |
|---|---|---|---|---|---|
| Annual leave | `ANNUAL` | Based on years of service (15/21/30 days) | Manager approval | None | 100% paid |
| Sick leave | `SICK` | Up to 180 days per occurrence | Auto (with medical cert) | Medical certificate | 75%/85% (social insurance) |
| Maternity leave | `MATERNITY` | 120 calendar days, up to 3 times | HR approval | Medical certificate | 100% paid |
| Paternity leave | `PATERNITY` | 1 day per birth, up to 3 times | Auto | Birth certificate | 100% paid |
| Childcare leave | `CHILDCARE` | Up to 2 years unpaid, up to 3 times | HR approval | Birth certificate | Unpaid |
| Study/exam leave | `STUDY` | Actual exam days | Manager + HR approval | Exam schedule | 100% paid |
| Unpaid leave | `UNPAID` | As agreed | Manager + HR approval | None | Unpaid |
| Compassionate leave | `COMPASSIONATE` | 3-5 days (per policy) | Manager approval | None | 100% paid |

### Leave Balance Calculation Logic

```
Annual leave balance for employee X:
  years_of_service = (today - hire_date) in years

  if years_of_service < 1:
    annual_entitlement = 15 days (prorated if mid-year hire)
  elif years_of_service < 10 AND age < 50:
    annual_entitlement = 21 days
  else:  // 10+ years OR age 50+
    annual_entitlement = 30 days

  if employee.is_disabled:
    annual_entitlement = 45 days

  balance = annual_entitlement
           - annual_leave_days_taken_this_year
           + carryover_from_last_year (if company policy allows, max per policy)
```

### Leave Request Workflow

```
Employee submits request
    │
    ▼
System checks:
├── Sufficient balance?
├── Conflicts with other team members' leave?
├── Minimum staffing met? (for warehouse/drivers)
├── Notice period met? (15 days for exam leave)
│
    ▼
Manager receives notification → Approves / Rejects
    │
    ▼
If approved:
├── Deduct from balance
├── Update attendance calendar
├── Notify payroll (if leave type affects pay)
└── Notify team (calendar update)
```

---

## 9. PAYROLL INTEGRATION

### What HyperQuote Calculates vs What Payroll Provider Calculates

| Calculated by HyperQuote | Calculated by Payroll Provider |
|---|---|
| Hours worked (regular, overtime day/night, holiday) | Income tax withholding |
| Leave days taken by type | Social insurance contributions (using salary base from HyperQuote) |
| Commission earned (from order/quote data) | Net pay after all deductions |
| Loan/advance deductions | Payslip generation |
| Penalties/deductions | Tax filing and remittance |
| Social insurance salary base (within caps) | Year-end tax forms |
| Gross pay components | |

### Commission Calculation for Sales Reps

Commissions are uniquely tied to the HyperQuote order system and cannot be calculated externally.

**Common commission structures for B2B building materials:**

| Model | How It Works | Example |
|---|---|---|
| **Percentage of gross profit** | Rep earns X% of the margin on their deals | 15% of gross profit on orders they close |
| **Tiered percentage** | Higher % at higher volumes | 10% on first $50K margin/month, 15% on $50K-$100K, 20% above $100K |
| **Base + commission** | Fixed salary + variable commission | $3,000/month base + 8% of gross profit |
| **Draw against commission** | Monthly draw deducted from commissions | $4,000 monthly draw; if commission = $6,000, paid $2,000 extra |

**System must:**
- Link each order to the sales rep who owns it
- Calculate margin (sell price - buy price - freight - other costs)
- Apply the rep's commission plan rules
- Handle split commissions (multiple reps on one deal)
- Show projected commission (on quotes) and earned commission (on completed orders)
- Send commission totals to payroll provider each pay period

### Integration Implementation

**Option A: API Integration (Preferred)**
- If payroll provider has an API (Gusto, ADP, Deel), push data programmatically
- Monthly batch or per-pay-period sync
- Bidirectional: push hours/earnings, pull payslips

**Option B: File Export (Fallback for Local Providers)**
- Generate CSV/Excel with payroll data
- HR manager uploads to payroll provider
- Payroll provider returns payslips for upload to HyperQuote

**Option C: Hybrid**
- API for data push, manual for edge cases
- Common with Egyptian local providers that may not have robust APIs

---

## 10. EMPLOYEE SELF-SERVICE

### What Employees Should Be Able to Do

Employee self-service reduces HR administrative workload by 40-60% and is expected by modern employees.

| Capability | Priority | Notes |
|---|---|---|
| **View personal profile** | Essential | Name, title, department, hire date, manager |
| **Update personal info** | Essential | Phone, address, emergency contacts (changes go to HR for review) |
| **Request leave** | Essential | Select type, dates, submit to manager |
| **View leave balance** | Essential | By type, with history |
| **View attendance record** | Essential | Clock-in/out history, hours worked, overtime |
| **View payslips** | Essential | From payroll provider (embedded or linked) |
| **View company directory** | Essential | Search employees, see org chart |
| **Upload documents** | Important | Updated ID, new certification, medical certificate for sick leave |
| **View assigned schedule** | Important | For warehouse workers and drivers |
| **View commission statement** | Important (sales) | Projected and earned commissions |
| **View compliance status** | Important (drivers) | CDL expiry, medical card, next drug test, Moffett cert |
| **Update bank details** | Nice-to-have | With HR approval workflow |
| **View company policies** | Nice-to-have | Employee handbook, leave policy, expense policy |

### Where Does Self-Service Live?

**In the internal platform (app.hyperquote.net)** — not a separate portal.

Every employee already has an account in the internal app for their primary role (sales rep uses the sales module, warehouse worker uses the warehouse module, driver uses the driver app). The HR self-service is simply another section/tab in their existing app.

```
Internal App (app.hyperquote.net)
├── [Role-specific modules] — Sales, Warehouse, Dispatch, etc.
└── My Profile (HR Self-Service)
    ├── Personal Info
    ├── My Leave
    ├── My Attendance
    ├── My Payslips
    ├── My Documents
    ├── My Commissions (if sales)
    ├── My Compliance (if driver)
    └── Company Directory
```

---

## 11. ORGANIZATIONAL CHART

### Auto-Generated from Reporting Lines

Every employee record has a `reports_to` field. The org chart is automatically generated from this data. No manual maintenance required.

### Features

| Feature | Detail |
|---|---|
| **Tree view** | Traditional top-down org chart, expandable/collapsible |
| **Department filter** | Show only Sales, only Operations, etc. |
| **Search** | Find a person and highlight their position |
| **Click to profile** | Click any node to see employee profile |
| **Headcount overlay** | Show department headcount numbers |
| **Vacancy markers** | Mark positions that are open/planned but not filled |
| **Export** | PDF/PNG for presentations |

### Implementation

This is straightforward to build with a recursive query on the `employees` table:

```sql
WITH RECURSIVE org_tree AS (
  SELECT id, first_name, last_name, job_title, department, reports_to, 0 as level
  FROM employees
  WHERE reports_to IS NULL  -- CEO

  UNION ALL

  SELECT e.id, e.first_name, e.last_name, e.job_title, e.department, e.reports_to, ot.level + 1
  FROM employees e
  JOIN org_tree ot ON e.reports_to = ot.id
  WHERE e.employment_status = 'active'
)
SELECT * FROM org_tree ORDER BY level, department;
```

Render with a JavaScript tree/org chart library (e.g., react-organizational-chart, d3-org-chart, or a custom SVG/Canvas component).

---

## 12. HR REPORTING AND CEO DASHBOARD

### Key HR Metrics for the CEO

| Metric | Formula | Target | Frequency |
|---|---|---|---|
| **Total headcount** | Count of active employees | — | Real-time |
| **Headcount by department** | Group by department | — | Real-time |
| **Monthly turnover rate** | (Separations in month / Avg headcount) × 100 | < 5%/month | Monthly |
| **Annual turnover rate** | (Total separations in year / Avg headcount) × 100 | < 15%/year | Monthly |
| **Cost per employee** | Total labor cost / Headcount | Varies | Monthly |
| **Labor cost as % of revenue** | Total labor cost / Revenue × 100 | 10-20% for distribution | Monthly |
| **Revenue per employee** | Total revenue / Headcount | > $800K for building materials | Monthly |
| **Open positions** | Count of unfilled roles | — | Real-time |
| **Average tenure** | Avg(today - hire_date) for active employees | > 2 years | Monthly |
| **Attendance rate** | (Days present / Working days) × 100 | > 95% | Weekly |
| **Driver compliance rate** | Drivers with all certs current / Total drivers × 100 | 100% | Real-time |
| **Certifications expiring (30 days)** | Count of driver certs expiring within 30 days | 0 | Real-time |
| **Commission payout (total)** | Sum of all commissions this period | — | Monthly |
| **Overtime cost** | Total overtime pay / Total payroll × 100 | < 10% | Monthly |

### CEO HR Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HR OVERVIEW                                         March 2026 │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  Headcount   │  Turnover    │  Labor Cost  │  Revenue/Employee │
│     42       │    2.4%      │   18.5%      │    $920K          │
│  (+3 vs Q4)  │  (target <5%)│  (of revenue)│   (target >$800K) │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│                                                                 │
│  DEPARTMENT BREAKDOWN          │  DRIVER COMPLIANCE             │
│  ┌─────────┬────────┐         │  ┌──────────────────────┐      │
│  │ Sales   │   8    │         │  │ Fully Compliant: 9/12│      │
│  │ Ops     │  12    │         │  │ Expiring <30d:   2   │      │
│  │ Finance │   4    │         │  │ Non-Compliant:   1   │ !!   │
│  │ Warehouse│  10   │         │  │ Drug Tests Due:  1   │      │
│  │ Logistics│  5    │         │  └──────────────────────┘      │
│  │ Admin   │   3    │         │                                 │
│  └─────────┴────────┘         │  ALERTS                        │
│                                │  ⚠ Ahmed K. medical card       │
│  RECENT ACTIVITY               │    expired Mar 25              │
│  • Mar 15: Sara M. hired      │  ⚠ Annual raise due for 5      │
│  • Mar 10: Omar R. resigned   │    employees (Apr 1)           │
│  • Mar 1: 3 drivers certified │  ⚠ 2 contracts expiring May 1  │
│                                │                                 │
└────────────────────────────────┴────────────────────────────────┘
```

---

## 13. ONBOARDING AND OFFBOARDING

### Onboarding Checklist Engine

The system should support configurable checklists by employee type.

#### Office Employee Onboarding Checklist

| Step | Responsible | Deadline | Documents |
|---|---|---|---|
| Collect national ID copy | HR | Day 1 | National ID scan |
| Sign employment contract (4 copies) | HR + Employee | Day 1 | Contract PDF |
| Register with social insurance | HR | Within 30 days | Social insurance form |
| Register with Labour Office | HR | Within 30 days | Labour office form |
| Create platform account | IT | Day 1 | — |
| Assign department and manager | HR | Day 1 | — |
| Set up email and tools | IT | Day 1 | — |
| Orientation session | Manager | Week 1 | — |
| Assign initial training | Manager | Week 1 | — |
| Probation review scheduled | HR | At 2.5 months | — |

#### Driver Onboarding Checklist

| Step | Responsible | Deadline | Documents |
|---|---|---|---|
| Collect CDL copy | HR | Before hire | CDL scan |
| Verify CDL on state system | HR | Before hire | MVR report |
| Pre-employment drug test | HR | Before first dispatch | Drug test result |
| DOT physical / medical card | HR | Before first dispatch | Medical card scan |
| Background check | HR | Before hire | Background report |
| MVR check | HR | Before hire | MVR report |
| Sign employment contract (4 copies) | HR | Day 1 | Contract PDF |
| Register social insurance | HR | Within 30 days | Social insurance form |
| Safety orientation training | Fleet Manager | Week 1 | Training cert |
| Vehicle familiarization | Fleet Manager | Week 1 | — |
| Road test | Fleet Manager | Before solo dispatch | Road test form |
| Moffett training (if applicable) | Fleet Manager | Before Moffett routes | Moffett cert |
| Assign vehicle | Fleet Manager | Day 1 | Vehicle assignment |
| Create driver app account | IT | Day 1 | — |
| First accompanied ride | Senior Driver | Week 1 | — |

### Offboarding Checklist

| Step | Responsible | Notes |
|---|---|---|
| Process resignation / termination notice | HR | 3-month notice for resignation (Egyptian law) |
| Calculate final pay and unused leave | HR + Finance | Annual leave balance must be paid out |
| Calculate severance (if applicable) | HR + Finance | 2 months per year for unjust termination |
| Collect company property | Manager | Phone, tablet, keys, uniform, badge |
| Revoke platform access | IT | Immediately on last day |
| Remove from driver pool / dispatch | Fleet Manager | If driver |
| Remove from drug testing pool | HR | If driver |
| Exit interview (optional) | HR | Capture feedback |
| Update Labour Office | HR | Required by Egyptian law |
| Archive employee file | HR | Retain for 5 years |

---

## 14. DOCUMENT MANAGEMENT

### Documents to Store Per Employee

| Document | Format | Retention | Required By |
|---|---|---|---|
| Employment contract (signed) | PDF | 5 years post-termination | Egyptian law |
| National ID / SSN | PDF/Image | Duration of employment + 5 years | Identity verification |
| Passport (foreign employees) | PDF/Image | Duration of employment | Work permit compliance |
| CDL (drivers) | PDF/Image | Duration of employment | FMCSA |
| Medical card (drivers) | PDF/Image | Duration of employment | FMCSA/DOT |
| Drug test results | PDF | Duration of employment + 5 years | FMCSA |
| Moffett/forklift cert | PDF/Image | Duration of employment | OSHA |
| Safety training certificates | PDF | Duration of employment | Compliance |
| Social insurance registration | PDF | Duration of employment + 5 years | Egyptian law |
| Performance reviews | PDF | Duration of employment | Internal |
| Disciplinary actions | PDF | Duration of employment + 5 years | Legal |
| Salary change letters | PDF | Duration of employment + 5 years | Legal/audit |

### Storage Implementation

- Use **Supabase Storage** or **Cloudflare R2** (already in the HyperQuote stack)
- Files organized by: `hr-documents/{employee_id}/{document_type}/{filename}`
- Access controlled by RLS: employee sees own documents, HR sees all, manager sees direct reports
- Encrypted at rest
- Automatic expiry alerts for dated documents (CDL, medical card, passport, contract end)

---

## 15. PERFORMANCE MANAGEMENT

### Phase 3 Feature (100+ Employees)

At 10-50 employees, performance is managed through direct conversations between managers and the CEO. Formal performance reviews become necessary when:
- The CEO can no longer personally know every employee's performance
- Promotion and raise decisions need documented justification
- There are enough layers of management that information gets lost

### Simple Performance Review Model

When implemented, keep it simple:

| Component | Detail |
|---|---|
| **Frequency** | Quarterly check-ins + Annual review |
| **Format** | Manager rates employee on 3-5 competencies + free-text comments |
| **Self-assessment** | Employee fills the same form before the review meeting |
| **Rating scale** | 1-5 (Needs Improvement, Below Expectations, Meets Expectations, Exceeds Expectations, Exceptional) |
| **Goals** | 3-5 goals set each quarter, reviewed next quarter |
| **Output** | Performance score feeds into annual raise calculations |

---

## 16. IMPLEMENTATION PHASES

### Phase 1: Foundation (Build First — Needed for Launch)

**Timeline:** 2-3 weeks of development

| Module | Scope |
|---|---|
| **Employee profiles** | Full data model as defined in Section 4. CRUD operations. |
| **Departments & reporting lines** | Department table, `reports_to` field, basic org hierarchy. |
| **Document storage** | Upload/download files per employee. Metadata (type, expiry date, upload date). |
| **Basic attendance** | Clock in/out via web app and driver app. Manual corrections by manager. |
| **Driver compliance tracker** | CDL, medical card, drug test, Moffett cert fields. Expiry alerts. Dispatch blocking. |
| **Basic leave management** | Annual and sick leave tracking. Request → approve workflow. Balance calculation. |
| **Onboarding checklists** | Configurable per employee type. Checkbox completion. |

### Phase 2: Growth Features (Build at 30-50 Employees)

**Timeline:** 2-3 weeks of development

| Module | Scope |
|---|---|
| **Employee self-service** | View profile, request leave, view attendance, view payslips (from payroll provider). |
| **Commission calculator** | Linked to order system. Commission plan configuration. Projected and earned commissions. |
| **Org chart visualization** | Auto-generated, interactive, filterable by department. |
| **Advanced attendance** | Geofencing for warehouse. GPS verification for field. Overtime auto-calculation per Egyptian law. |
| **Payroll provider integration** | API sync with chosen payroll provider. Monthly data push. Payslip retrieval. |
| **HR dashboard** | Headcount, turnover, compliance rate, cost per employee, alerts. |
| **Advanced leave** | All 8 Egyptian leave types. Maternity usage tracking. Nursing break tracking. |

### Phase 3: Maturity Features (Build at 100+ Employees)

**Timeline:** Ongoing

| Module | Scope |
|---|---|
| **Performance reviews** | Quarterly check-ins, annual reviews, goal tracking. |
| **Training tracker** | Safety training, certifications, renewal scheduling. |
| **Recruitment pipeline** | Simple ATS or integration with external ATS. |
| **Employee surveys** | Engagement pulse surveys. |
| **Advanced reporting** | Turnover analysis, department cost comparison, headcount forecasting. |
| **Multi-location HR** | If HyperQuote expands to multiple countries/offices. |

---

## APPENDIX A: TECHNOLOGY NOTES

### Database Tables (Supabase/PostgreSQL)

Core HR tables needed:

```
employees              — Core employee record (see Section 4)
departments            — Department list (id, name, name_ar, head_id)
employee_documents     — Document metadata (employee_id, type, file_url, expiry_date, uploaded_at)
attendance_records     — Clock in/out events (employee_id, clock_in, clock_out, type, location, source)
leave_types            — Leave type configuration (code, name, default_days, paid_percentage)
leave_balances         — Per-employee per-year balances (employee_id, leave_type, year, entitlement, taken, remaining)
leave_requests         — Leave requests (employee_id, leave_type, start_date, end_date, status, approved_by)
driver_compliance      — Driver-specific compliance records (employee_id, item_type, issue_date, expiry_date, status, document_url)
drug_test_pool         — Random drug test pool management (employee_id, pool_year, selected_date, test_date, result)
onboarding_templates   — Checklist templates by employee type
onboarding_items       — Checklist items per employee (employee_id, template_item_id, completed, completed_at, completed_by)
commission_plans       — Commission plan definitions (name, type, tiers)
commission_records     — Commission calculations per order (employee_id, order_id, margin, commission_amount, status)
salary_history         — Track salary changes (employee_id, effective_date, old_salary, new_salary, reason)
```

### Row-Level Security (RLS)

```
- Employee: Can view/edit own profile, view own documents, view own attendance, view own leave
- Manager: Can view direct reports' profiles, approve leave, view attendance
- HR: Can view/edit all employee data, all documents, all compliance records
- CEO: Can view all HR data, dashboards, reports
- Driver: Additionally sees own compliance status
- Payroll: Can view compensation data, attendance summaries (limited role for payroll sync)
```

### API Endpoints (High-Level)

```
/api/hr/employees           — CRUD employee profiles
/api/hr/employees/:id       — Single employee
/api/hr/departments         — Department management
/api/hr/org-chart           — Org chart data (recursive query)
/api/hr/attendance          — Clock in/out, view records
/api/hr/leave/request       — Submit leave request
/api/hr/leave/balance       — View leave balances
/api/hr/leave/approve       — Approve/reject leave
/api/hr/compliance/drivers  — Driver compliance overview
/api/hr/compliance/alerts   — Expiring certifications
/api/hr/documents           — Upload/download documents
/api/hr/onboarding          — Onboarding checklist management
/api/hr/commissions         — Commission calculations and statements
/api/hr/reports             — HR metrics and dashboard data
/api/hr/payroll-sync        — Data export for payroll provider
```

---

## APPENDIX B: SOURCES

### HR Module Features & Best Practices
- [HR Module in ERP — Focus Softnet](https://www.focussoftnet.com/us/human-resource-module)
- [16 Most Common HRMS Modules — HRMS World](https://www.hrmsworld.com/16-most-common-hrms-modules.html)
- [ERP HR Module Guide — NetSuite](https://www.netsuite.com/portal/resource/articles/erp/erp-hr-module.shtml)
- [36 HRMS Software Features — People Managing People](https://peoplemanagingpeople.com/hr-operations/key-features-hrms-software/)

### Build vs Integrate
- [BambooHR vs Gusto vs Custom HR — Active Logic](https://activelogic.com/insights/bamboohr-vs-gusto-vs-custom-hr-platforms-streamlining-employee-management)
- [Top 9 HR Software Vendors 2025 — Zoho](https://www.zoho.com/people/hrknowledgehive/top-9-hr-software-vendors-for-2025.html)
- [BambooHR vs Gusto 2026 — tinyteam](https://www.tinyteam.io/blog/bamboohr-vs-gusto)

### Egyptian Labor Law
- [Egypt New Labor Law — EY Tax Alert](https://www.ey.com/en_gl/technical/tax-alerts/egypt-enacts-new-labor-law-with-changes-affecting-employers-beginning-1-september-2025)
- [Egypt Labor Law Complete Guide — Wuzzuf](https://wuzzuf.net/careers/egypts-new-labor-law/)
- [Egypt Employment Law 2025-2026 — ICLG](https://iclg.com/practice-areas/employment-and-labour-laws-and-regulations/egypt)
- [Egypt Labour Law 14 of 2025 — Andersen](https://eg.andersen.com/egypts-labour-law-14-2025/)
- [Egypt Labor Law No. 14 of 2025 — Shand & Partners](https://www.shandpartners.com/insights/firm-news/new-labour-law-no-14-of-2025/)
- [Egypt Labor Law Compliance — Fisher Phillips](https://www.fisherphillips.com/en/news-insights/egypt-labor-laws-are-about-to-change.html)
- [Egypt Working Hours & Overtime — Playroll](https://www.playroll.com/working-hours/egypt)
- [Egypt Employment Laws — Skuad](https://www.skuad.io/employment-laws/egypt)

### Egyptian Tax & Social Insurance
- [Egypt Individual Taxes — PwC](https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income)
- [Egypt Social Insurance — PwC](https://taxsummaries.pwc.com/egypt/individual/other-taxes)
- [Egypt Social Insurance Updates — Fragomen](https://www.fragomen.com/insights/egypt-new-social-insurance-contribution-amounts.html)
- [Egypt Payroll Tax Guide 2026 — Remote People](https://remotepeople.com/countries/egypt/hire-employees/payroll-tax/)
- [Egypt Social Insurance 2026 — Mercans](https://mercans.com/resources/statutory-alerts/egypt-minimum-and-maximum-insurable-wage-limits-increase-for-social-insurance-from-2026/)

### Driver Compliance & Fleet Management
- [2026 DOT Compliance Updates — DISA](https://disa.com/news/2026-dot-compliance-updates-for-motor-carriers/)
- [CDL Drug Testing 2025 — National Background Check](https://www.nationalbackgroundcheck.com/dot-drug-testing-requirements-for-cdl-drivers-2025-update/)
- [FMCSA Medical Certification Changes — Workforce QA](https://wfqa.com/upcoming-changes-to-dot-medical-certification-reporting-effective-june-23-2025/)
- [CDL Medical Certification Digital Shift — GoMotive](https://gomotive.com/blog/fmcsas-digital-shift-for-modernized-medical-certification/)
- [Real-Time Driver Monitoring 2026 — Compliance Safety Manager](https://compliancesafetymanager.com/why-real-time-driver-monitoring-matters-more-than-ever-in-2026/)
- [Fleet Compliance Software — FleetDrive360](https://www.fleetdrive360.com/)

### Attendance & Time Tracking
- [GPS Time Clock for Construction — Workyard](https://www.workyard.com/time-clock-app-with-gps)
- [GPS Time Tracking for Field Employees — TimeClock 365](https://timeclock365.com/tracking-field-employees-with-gps/)
- [Mobile GPS Time Clock — allGeo](https://www.allgeo.com/apps/mobile-employee-gps-time-clock)
- [GPS Time Clock Apps 2026 — Connecteam](https://connecteam.com/gps-time-clock-solutions/)

### Payroll Integration
- [Gusto vs ADP 2025 — FridayApp](https://fridayapp.com/gusto-vs-adp/)
- [ADP vs Paychex vs Gusto — LiftHCM](https://lifthcm.com/article/adp-vs-paychex-vs-gusto-comparison)

### Employee Self-Service
- [Employee Self-Service Portal 2025 — DSPayroll365](https://dynamicssolution.com/what-features-make-an-employee-self-service-portal-truly-effective-in-2025/)
- [Employee Self-Service HR 2025 — HR HUB](https://www.hrhub.app/blogs/employee-self-service-hr-2025)
- [Best Employee Portals 2025 — Five](https://five.co/blog/best-employee-portals/)

### HR Metrics & Dashboards
- [HR Metrics Dashboard 2025 — Happily.ai](https://happily.ai/blog/discover-the-power-of-an-hr-metrics-dashboard-in-2025/)
- [14 HR Metrics — ExtensisHR](https://extensishr.com/resource/blogs/14-hr-metrics-and-how-to-calculate-them/)
- [6 Essential HR Dashboards 2025 — SplashBI](https://splashbi.com/blog/6-essential-hr-metrics-dashboards-you-need-in-2025/)
- [Employee Turnover KPIs — NetSuite](https://www.netsuite.com/portal/resource/articles/human-resources/employee-turnover-kpis-metrics.shtml)
