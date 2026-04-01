> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Driver Onboarding, Compliance, and Legal Requirements
## Building Materials Distribution Company — US Regulations & International Best Practices (2025-2026)

---

## TABLE OF CONTENTS

1. [CDL Requirements by Vehicle Type](#1-cdl-requirements-by-vehicle-type)
2. [FMCSA Hours of Service & ELD Regulations](#2-fmcsa-hours-of-service--eld-regulations)
3. [Pre-Trip/Post-Trip Inspections (DVIR)](#3-pre-trip-and-post-trip-inspections-dvir)
4. [Cargo Securement for Building Materials](#4-cargo-securement-for-building-materials)
5. [Drug and Alcohol Testing](#5-drug-and-alcohol-testing)
6. [Driver Onboarding Checklist](#6-driver-onboarding-checklist)
7. [Insurance Requirements](#7-insurance-requirements)
8. [Moffett/Forklift Certification](#8-moffettforklift-certification)
9. [Safety Training Program](#9-safety-training-program)
10. [Penalties for Non-Compliance](#10-penalties-for-non-compliance)
11. [Record-Keeping Requirements](#11-record-keeping-requirements)
12. [International Considerations (UAE/Saudi Arabia)](#12-international-considerations-uaesaudi-arabia)
13. [App Integration Specifications](#13-app-integration-specifications)

---

## 1. CDL REQUIREMENTS BY VEHICLE TYPE

### Federal CDL Classification (49 CFR Part 383)

| CDL Class | Threshold | Building Materials Vehicles |
|-----------|-----------|---------------------------|
| **Class A** | GCWR 26,001+ lbs with towed unit GVWR > 10,000 lbs | Semi-tractor with flatbed trailer, tractor with Moffett trailer, any combination rig |
| **Class B** | Single vehicle GVWR 26,001+ lbs (towed unit <= 10,000 lbs) | Large straight truck, boom truck (crane truck), large dump truck, single-axle flatbed > 26K |
| **No CDL Required** | Single vehicle GVWR <= 26,000 lbs and no hazmat placards | Box truck under 26K lbs (e.g., Ford F-650, Hino 268), pickup with small trailer |

### Vehicle-Specific Requirements for Building Materials Fleet

| Vehicle Type | Typical GVWR | CDL Class | Common Endorsements |
|-------------|-------------|-----------|-------------------|
| Semi-tractor + flatbed trailer | 60,000-80,000 lbs | **Class A** | Air brakes (automatic with Class A) |
| Moffett-equipped truck + trailer | 50,000-80,000 lbs | **Class A** | Air brakes; forklift cert separate (OSHA, not CDL) |
| Boom truck (knuckle/crane) | 26,001-54,000 lbs | **Class B** (single unit) or **Class A** (with trailer) | Air brakes; may need crane operator cert per state |
| Straight flatbed (single unit) | 26,001-33,000 lbs | **Class B** | Air brakes |
| Box truck under 26,000 lbs | 14,500-25,999 lbs | **None** | None (still subject to FMCSA if interstate CMV) |
| Pickup + utility trailer | Under 26,000 GCWR | **None** | None |

### CDL Endorsements Relevant to Building Materials

| Code | Endorsement | When Required |
|------|------------|---------------|
| **H** | Hazardous Materials | Transporting placarded hazmat quantities (certain adhesives, solvents, sealants, chemicals) |
| **N** | Tank Vehicle | Liquid/gas tanks >= 1,000 gallons (rarely needed for building materials) |
| **T** | Double/Triple Trailers | Only if towing double trailers (state-dependent) |
| **X** | Combined Hazmat + Tank | Hazmat in tanker configuration |
| **P** | Passenger | Not applicable |
| **Air Brakes** | Not an endorsement per se | Restriction "L" placed on CDL if air brake test not passed; most Class A/B vehicles have air brakes |

### Hazmat Considerations for Building Materials

Materials that MAY require hazmat endorsement and placarding:
- **Construction adhesives** containing flammable solvents (Class 3 Flammable Liquid)
- **Spray foam chemicals** (isocyanates — Class 6.1 Toxic)
- **Roofing tar/asphalt** in bulk quantities when heated (Class 3 or Class 9)
- **Concrete curing compounds** with volatile organic compounds
- **Acetylene/propane** if carried for job-site use

**Rule of thumb:** If the material requires a Safety Data Sheet (SDS) with a DOT hazard class and is shipped in quantities requiring placards per 49 CFR 172, the driver needs an H endorsement.

### Entry-Level Driver Training (ELDT) — Mandatory Since Feb 7, 2022

All first-time CDL applicants and upgrade applicants must complete ELDT from an FMCSA-registered training provider (listed in the Training Provider Registry — TPR). Applies to:
- First-time Class A or Class B CDL
- Upgrading from Class B to Class A
- Adding H (hazmat), P (passenger), or S (school bus) endorsements

**Regulatory citation:** 49 CFR Part 380, Subpart F

---

## 2. FMCSA HOURS OF SERVICE & ELD REGULATIONS

### Hours of Service Rules (49 CFR Part 395)

| Rule | Limit | Details |
|------|-------|---------|
| **11-Hour Driving Limit** | 11 hours | Maximum driving time after 10 consecutive hours off duty |
| **14-Hour Duty Window** | 14 hours | Cannot drive beyond 14 hours after coming on duty, regardless of breaks taken |
| **30-Minute Break** | Required after 8 hours | Must take 30 minutes off duty or on sleeper berth after 8 cumulative hours of driving |
| **60/70-Hour Limit** | 60 hrs in 7 days OR 70 hrs in 8 days | Maximum on-duty time; carrier chooses 7- or 8-day cycle |
| **34-Hour Restart** | 34 consecutive hours off duty | Resets the 60/70-hour clock |
| **10-Hour Off-Duty** | 10 consecutive hours | Required between duty periods |
| **Sleeper Berth** | Split allowed: 7/3 or 8/2 | Two periods totaling 10 hours; neither counts against 14-hour window |

### Short-Haul Exemption (49 CFR 395.1(e)(1))

This is the MOST RELEVANT exemption for building materials delivery drivers operating from a warehouse/yard.

**Qualifying Criteria:**
- Operates within **150 air-mile radius** (~172.6 statute miles) of normal work reporting location
- Returns to the same work reporting location at end of each duty day
- Released from duty within **14 consecutive hours** of coming on duty
- Does not exceed **11 hours of driving** within the 14-hour window
- Complies with 60/70-hour weekly limits

**Benefits of Short-Haul Exemption:**
- **NO ELD required** for compliant days
- **NO Record of Duty Status (RODS/logs)** required
- Only need to maintain **time records** showing:
  - Time driver reports for duty each day
  - Time driver is released from duty each day
  - Total hours on duty each day
  - Total driving time for last 7 days
- Time records must be retained **6 months minimum**

**When Short-Haul Is Exceeded:**
- If a driver goes beyond 150 air miles or 14 hours on a given day, they must immediately begin keeping a RODS (paper log) for that day
- If the driver exceeds the exemption **more than 8 times in any 30-day period**, they lose the exemption entirely and must use an ELD going forward

### ELD Requirements (49 CFR Part 395, Subpart B)

| Scenario | ELD Required? |
|----------|--------------|
| Driver qualifies for short-haul exemption | **No** |
| Driver operates beyond 150 air miles | **Yes** |
| Driver uses paper logs for fewer than 8 days in 30-day period | **No** (but needs paper logs those days) |
| Driver exceeds short-haul 8+ times in 30 days | **Yes** |
| Non-CDL driver in vehicle under 26K lbs, intrastate only | **Depends on state** |
| Pre-2000 model year engine | **Exempt** |

### What Happens When a Driver Approaches HOS Limits Mid-Route

**This is a critical operational scenario for the app to handle:**

1. **Approaching 11-hour driving limit:** Driver must stop driving. May remain on duty (loading/unloading) but cannot drive.
2. **Approaching 14-hour window:** Driver cannot drive after 14 hours from start of duty, even if they took breaks. The 14-hour clock does NOT pause for off-duty time (except sleeper berth splits).
3. **8 hours of driving without break:** Must take 30-minute break before continuing to drive. This break can be taken as off-duty or sleeper berth time.
4. **Approaching 60/70-hour limit:** Must cease all on-duty activity until the weekly clock resets (via passage of time or 34-hour restart).

**App should:**
- Track driving time, on-duty time, and 14-hour window in real time
- Warn at 30 min, 1 hour, and 2 hours before limits
- Alert dispatcher when driver is within 2 hours of any limit so routes can be adjusted
- Automatically calculate whether a driver can complete the next stop before hitting a limit
- Block assignment of new stops when limits would be exceeded

---

## 3. PRE-TRIP AND POST-TRIP INSPECTIONS (DVIR)

### Legal Basis: 49 CFR 396.11 and 396.13

**DVIR = Driver Vehicle Inspection Report** — the formal documentation of a driver's pre-trip and post-trip vehicle inspection.

### What Must Be Inspected (Minimum 16 Items)

Per 49 CFR 396.11(a)(1), drivers must inspect and report defects/deficiencies in:

| # | Component | What to Check |
|---|-----------|--------------|
| 1 | **Service brakes** (including trailer brake connections) | Pedal feel, air pressure, brake adjustment |
| 2 | **Parking brake** | Engagement, holding power |
| 3 | **Steering mechanism** | Free play, binding, fluid level |
| 4 | **Lighting devices and reflectors** | Headlights, taillights, turn signals, marker lights, reflective tape |
| 5 | **Tires** | Inflation, tread depth (min 4/32" steer, 2/32" drive/trailer), cuts, bulges |
| 6 | **Horn** | Audible operation |
| 7 | **Windshield wipers** | Operation, blade condition |
| 8 | **Rear vision mirrors** | Both sides, proper adjustment, no cracks |
| 9 | **Coupling devices** | Fifth wheel, pintle hook, safety chains, glad hands |
| 10 | **Wheels and rims** | Cracks, missing lugs, rust streaks (indicates loose lug) |
| 11 | **Emergency equipment** | Fire extinguisher (charged), warning triangles/flares, spare fuses |
| 12 | **Frame and body** | Cracks, sagging, unsecured components |
| 13 | **Exhaust system** | Leaks, proper routing, secure mounting |
| 14 | **Fluid levels** | Oil, coolant, power steering, windshield washer |
| 15 | **Air brake system** (if equipped) | Governor cut-out/cut-in, air leak test, low-air warning |
| 16 | **Cargo securement** | Straps, chains, binders, blocking, edge protectors, load bars |

### Additional Items for Building Materials Vehicles

| Vehicle Type | Additional Inspection Items |
|-------------|---------------------------|
| **Flatbed** | Headboard/bulkhead condition, stake pockets, rub rails, winch operation |
| **Boom truck** | Boom condition, hydraulic lines, outrigger pads, load charts visible |
| **Moffett-equipped** | Moffett mounting brackets, hydraulic connections, forklift chain/forks, safety restraint |
| **Box truck** | Liftgate operation, roll-up door tracks, interior lighting, load bars |

### DVIR Signature Chain

Three signatures are required in the lifecycle of a DVIR:

1. **Driver completing the inspection** — Signs/certifies the report
2. **Mechanic or carrier official** — Signs that defects have been repaired OR that no repairs are needed
3. **Next driver** — Reviews the previous DVIR and repair certifications before operating the vehicle

### Electronic DVIR (eDVIR)

**As of March 23, 2026**, FMCSA has explicitly authorized electronic DVIRs through a final rule published February 19, 2026. This means:
- Digital creation, maintenance, and signature of DVIRs is fully compliant
- Must meet electronic record standards in 49 CFR 390.32
- Electronic signatures are acceptable
- Records must be accessible for inspection

### Record Retention

| Record Type | Retention Period |
|------------|----------------|
| DVIR (no defects) | **3 months (90 days)** |
| DVIR (with defects and repairs) | **3 months (90 days)** minimum |
| Vehicle maintenance records | **1 year + 6 months** after vehicle leaves service |

### App Integration for DVIR

The app should include:
- **Pre-trip inspection checklist** — Interactive checklist with all 16+ items, pass/fail/NA per item
- **Photo capture** — Ability to photograph defects with timestamp and GPS
- **Digital signature** — Driver signs on completion
- **Defect escalation** — Defects auto-flag to maintenance/dispatch
- **Out-of-service criteria** — App should know which defects are OOS-level and prevent departure
- **Post-trip workflow** — Same checklist completed at end of day
- **Next-driver acknowledgment** — If a different driver takes the vehicle, they must review and sign the previous DVIR

---

## 4. CARGO SECUREMENT FOR BUILDING MATERIALS

### Legal Framework: 49 CFR 393.100-136 (Subpart I)

### General Requirements (393.100-114)

**Performance criteria** — Cargo must be immobilized or secured to prevent:
- Forward movement (deceleration of 0.8g)
- Rearward movement (deceleration of 0.5g)
- Lateral movement (acceleration of 0.5g)
- Vertical upward movement (0.2g — applicable when driving over bumps)

**Working Load Limit (WLL) Aggregate Rule:**
The total WLL of all tiedowns must be >= **50% of the cargo weight**.

### Minimum Number of Tiedowns (393.106)

| Cargo Length | Cargo Weight | Minimum Tiedowns |
|-------------|-------------|-----------------|
| <= 5 feet | <= 1,100 lbs | **1** |
| <= 5 feet | > 1,100 lbs | **2** |
| 5 - 10 feet | Any weight | **2** |
| > 10 feet | Any weight | **2 + 1 per additional 10 feet** |

**Example:** A 30-foot bundle of lumber requires at least 2 + 2 = **4 tiedowns**.

### Common Tiedown Working Load Limits

| Device | Typical WLL |
|--------|------------|
| 4" flat webbing strap with ratchet | 5,400 lbs |
| 2" flat webbing strap with ratchet | 3,333 lbs |
| 3/8" Grade 70 chain with binder | 6,600 lbs |
| 1/2" Grade 70 chain with binder | 11,300 lbs |
| 3/8" wire rope | 2,400 lbs |

### Building Materials Specific Rules

#### Dressed Lumber and Packaged Building Products (393.118)

Applies to: **bundles of dressed lumber, packaged lumber, plywood, gypsum board, OSB, MDF, composite panels, and materials of similar shape**

Requirements:
- Bundles stacked on a flatbed must have **at least 2 tiedowns per tier** for bundles > 5 feet
- Bundles must be **prevented from shifting** toward the front, rear, and sides
- A **headerboard/bulkhead** rated at 50% of cargo weight (or equivalent tiedowns) prevents forward movement
- When unitized with banding, each unit acts as a single article for tiedown count purposes
- Edge protectors required where straps contact sharp edges

#### Concrete Products (393.124)

Applies to: **concrete pipe, concrete blocks, precast panels, concrete barrier sections**

Requirements for concrete pipe:
- Pipe must be **cradled, wedged, or chocked** to prevent rolling
- Each pipe must have individual tiedowns
- Pipe in stacks must have blocking between tiers
- Minimum 2 tiedowns for pipes <= 45 inches in length; minimum 4 for longer
- For uncontained concrete pipe, each pipe over 45 inches requires individual tiedowns

#### Metal/Steel Products (393.120, 393.126)

Applies to: **steel beams, rebar, steel studs, metal roofing, coils**

- Steel coils must be individually secured based on orientation (eyes vertical, crosswise, or lengthwise)
- Rebar bundles: minimum 2 tiedowns per bundle; must use friction mats or dunnage
- Structural steel: individual tiedowns per piece, plus blocking against forward movement

#### Pipes and Tubing (393.124)

Applies to: **PVC pipe, metal conduit, copper pipe, steel tube**

- Must be prevented from rolling — use pipe stakes, wedges, or cradles
- If in a sided vehicle, the sides must be rated for the lateral force
- On flatbeds, must have stakes/blocking on BOTH sides plus tiedowns

#### Roofing Materials

No specific FMCSA subsection for roofing materials, but they fall under **general securement rules** (393.100-114):
- Shingle bundles on pallets: secure the pallet load as a unit
- Rolled roofing: treat as cylindrical cargo — prevent rolling
- Metal roofing panels: treat as dressed lumber rules — tiedowns over each tier

#### Palletized Goods (General Rules Apply)

- Each pallet must be individually secured OR shrink-wrapped/banded into unitized loads
- Pallets in enclosed trailers: use load bars, void fillers, or airbags to prevent shifting
- Pallets on flatbeds: minimum 2 tiedowns per pallet row; blocking against forward movement

### In-Transit Cargo Inspection Requirements (393.104)

Drivers MUST inspect cargo securement:
1. **Within the first 50 miles** after loading
2. **After every change of duty status** (e.g., after a break)
3. **Every 3 hours or 150 miles**, whichever comes first

Make any necessary adjustments to securement during these checks.

### Driver Training Requirements for Cargo Securement

While FMCSA does not mandate a specific standalone cargo securement course, drivers must demonstrate knowledge through:
- **CDL skills test** includes pre-trip inspection of securement
- **Employer training** — Motor carriers must ensure drivers are trained on proper securement for the specific cargo they haul
- **North American Cargo Securement Standard** knowledge
- **Annual refresher** recommended (industry best practice, not regulatory mandate)

---

## 5. DRUG AND ALCOHOL TESTING

### Legal Framework: 49 CFR Part 382 and 49 CFR Part 40

### Who Must Be Tested

All drivers who operate a **Commercial Motor Vehicle (CMV)** as defined by FMCSA:
- Vehicle with GVWR > 26,000 lbs
- Vehicle designed to transport 16+ passengers
- Vehicle carrying hazmat requiring placards

**This includes CDL holders AND non-CDL drivers of CMVs.**

### Six Types of Required Tests

| Test Type | When | Drug | Alcohol | Notes |
|-----------|------|------|---------|-------|
| **Pre-Employment** | Before first safety-sensitive duty | **Required** | Optional (but must apply consistently if chosen) | Must receive negative result before driver can operate CMV |
| **Random** | Unannounced, throughout the year | **50%** of drivers/year | **10%** of drivers/year | Selection must be truly random (scientifically valid method) |
| **Post-Accident** | After qualifying accidents | **Required** | **Required** | Alcohol within 2 hrs (8 hr max); drug within 32 hrs |
| **Reasonable Suspicion** | When trained supervisor observes signs | **Required** | **Required** | Supervisor must document observations; 2 supervisors recommended |
| **Return-to-Duty** | Before returning after a violation | **Required** | **Required** | Must be under direct observation; must complete SAP process first |
| **Follow-Up** | After return-to-duty | **Required** | **Required** | Minimum 6 tests in first 12 months; up to 5 years |

### Post-Accident Testing Triggers

Testing is REQUIRED when the accident involves:
- **Any fatality** — regardless of who received the citation
- **Bodily injury requiring immediate medical transport** — AND driver received a citation
- **Vehicle towed from scene (disabling damage)** — AND driver received a citation

### DOT 5-Panel Drug Test

Tests for these five categories (14 specific substances):
1. **Marijuana** (THC)
2. **Cocaine**
3. **Amphetamines/Methamphetamines** (including MDMA)
4. **Opioids** (codeine, morphine, heroin, hydrocodone, hydromorphone, oxycodone, oxymorphone)
5. **Phencyclidine (PCP)**

**Alcohol testing:** BAC of 0.04% or higher = positive violation. BAC of 0.02%-0.039% = removed from duty for 24 hours (not a violation but documented).

### FMCSA Drug & Alcohol Clearinghouse

**Regulatory citation:** 49 CFR Part 382, Subpart G

**What it is:** A secure online database containing records of drug and alcohol program violations for CDL/CLP holders.

**Who must register:**
- **Employers** — Must register and conduct queries
- **Drivers** — Must register to respond to queries and manage their records
- **Medical Review Officers (MROs)** — Report positive tests and refusals
- **Substance Abuse Professionals (SAPs)** — Report evaluations and treatment compliance

**Required Queries:**

| Query Type | When | What It Shows |
|-----------|------|--------------|
| **Full Query** (requires driver consent) | Pre-employment | Complete violation history |
| **Limited Query** | Annually for current drivers | Whether any violations exist (yes/no) |

**If a driver has an unresolved violation in the Clearinghouse:**
- As of **November 18, 2024**, most states automatically suspend the CDL
- Driver cannot perform safety-sensitive functions
- Must complete SAP evaluation, treatment, and return-to-duty test
- Employer CANNOT allow driver to operate CMV

### Consequences of a Positive Test / Violation

1. **Immediate removal** from safety-sensitive functions
2. **Referral to SAP** (Substance Abuse Professional) — employer must provide list of SAPs
3. **Clearinghouse recording** — violation entered into federal database
4. **CDL suspension** in most states (automatic as of Nov 2024)
5. **Return-to-duty process:**
   - SAP initial evaluation
   - Complete prescribed treatment/education
   - SAP follow-up evaluation
   - Return-to-duty test (direct observation) — must be negative
   - Follow-up testing plan (min 6 tests in 12 months, up to 60 months)
6. **Employment impact** — Most carriers will terminate; hiring with a violation history is very difficult

---

## 6. DRIVER ONBOARDING CHECKLIST

### Pre-Hire Phase (Before First Delivery)

#### A. For Internal (W-2) Drivers

| Step | Document/Action | Regulatory Basis | Timeline |
|------|----------------|-----------------|----------|
| 1 | **Employment Application** (10-yr history, 3-yr accident history, 3-yr residence history) | 49 CFR 391.21 | At application |
| 2 | **Copy of CDL** (both sides) — verify class, endorsements, restrictions, expiration | 49 CFR 391.23 | At application |
| 3 | **Medical Examiner's Certificate** (DOT physical card) — verify physician is in NRCME | 49 CFR 391.43 | At hire |
| 4 | **Motor Vehicle Record (MVR)** from each state where licensed in past 3 years | 49 CFR 391.23 | Within 30 days of hire |
| 5 | **FMCSA Clearinghouse Full Query** (requires driver electronic consent) | 49 CFR 382.701 | Before first safety-sensitive duty |
| 6 | **Pre-Employment Drug Test** — negative result required | 49 CFR 382.301 | Before first safety-sensitive duty |
| 7 | **Previous Employer Safety Performance History** investigation (3 years) | 49 CFR 391.23(d)-(e) | Within 30 days of hire |
| 8 | **Previous Employer Drug/Alcohol Records** request (3 years) | 49 CFR 40.25 | Within 30 days of hire |
| 9 | **Road Test** OR valid CDL that covers vehicle type | 49 CFR 391.31 | Before first solo drive |
| 10 | **Background Check** (criminal history) — with signed disclosure/authorization | FCRA; state law | At hire |
| 11 | **Disclosure and Authorization Forms** (separate from application) | FCRA | At application |
| 12 | **Company Drug & Alcohol Policy** — signed acknowledgment | 49 CFR 382.601 | At hire |
| 13 | **Safety Training Documentation** — cargo securement, defensive driving, HOS | Best practice / 49 CFR 390.11 | Before first delivery |
| 14 | **PPE Issuance** — hard hat, safety vest, gloves, steel-toe boots (or verification) | OSHA 1926.95 | At hire |
| 15 | **Moffett/Forklift Certification** (if applicable) | OSHA 29 CFR 1910.178 | Before first forklift operation |
| 16 | **App Training** — ELD (if applicable), DVIR, delivery workflow, POD capture | Company policy | Before first delivery |
| 17 | **Route Familiarization** — ride-along with experienced driver | Best practice | First 1-3 days |
| 18 | **Vehicle Familiarization** — specific to assigned vehicle type | 49 CFR 391.31 | Before first solo drive |
| 19 | **W-4 and I-9 forms** | IRS / USCIS | At hire |
| 20 | **Workers' Compensation enrollment** | State law | At hire |

#### B. For External (1099) Independent Contractor Drivers

All items from the W-2 list PLUS:

| Step | Document/Action | Notes |
|------|----------------|-------|
| 21 | **Independent Contractor Agreement** | Define scope, insurance requirements, compliance obligations |
| 22 | **W-9 Form** (taxpayer identification) | IRS requirement for 1099 reporting |
| 23 | **Certificate of Insurance (COI)** — Commercial Auto Liability | Minimum $750K or company-specified amount |
| 24 | **Certificate of Insurance (COI)** — Cargo Insurance | Minimum $100K per occurrence recommended |
| 25 | **Certificate of Insurance (COI)** — General Liability | Minimum $1M per occurrence recommended |
| 26 | **Proof of Own Authority** (MC number) OR agreement to operate under company authority | 49 CFR 387 |
| 27 | **Vehicle Registration and Inspection** — current and valid | State law |
| 28 | **Annual Vehicle Inspection Certificate** (FMCSA periodic inspection) | 49 CFR 396.17 |
| 29 | **Proof of IFTA Registration** (if applicable) | Interstate fuel tax |
| 30 | **Hold Harmless/Indemnification Agreement** | Company policy |

**CRITICAL NOTE on 1099 vs W-2:** Under FMCSA regulations, the motor carrier (your company) is responsible for driver compliance regardless of W-2 or 1099 status. The distinction is for tax/employment purposes, but safety obligations remain with the carrier. Recent DOL and state-level enforcement has increased scrutiny of misclassification — ensure drivers classified as 1099 truly meet the legal test for independent contractors.

### 30/60/90-Day Post-Hire Requirements

| Timeline | Action |
|----------|--------|
| **30 days** | Complete all previous employer investigations; DQ file must be substantially complete |
| **60 days** | Verify all previous employer responses received; follow up on outstanding requests |
| **90 days** | All DQ file documents must be finalized; schedule first performance review |
| **365 days** | First annual MVR, annual review, annual Clearinghouse limited query |

---

## 7. INSURANCE REQUIREMENTS

### Company-Carried Insurance (Fleet Owner)

| Insurance Type | Minimum Required | Recommended | Regulatory Basis |
|---------------|-----------------|-------------|-----------------|
| **Commercial Auto Liability** | $750,000 (non-hazmat freight) | $1,000,000 - $5,000,000 | 49 CFR 387.9; FMCSA filing (BMC-91 or BMC-34) |
| **Cargo Insurance** | $5,000/vehicle, $10,000/occurrence (FMCSA minimum) | $100,000 - $250,000 per occurrence | 49 CFR 387.303 |
| **General Liability** | Varies by state | $1,000,000 per occurrence / $2,000,000 aggregate | State law; contract requirements |
| **Workers' Compensation** | State-mandated (required in nearly all states) | Statutory limits + employers liability $500K/$500K/$500K | State law |
| **Umbrella/Excess Liability** | Not required | $1,000,000 - $5,000,000 excess | Best practice for fleet operations |
| **Non-Owned Auto** | Not required but critical | Included in CGL or standalone | Covers liability when employees drive vehicles not owned by company |
| **Physical Damage (Comp/Collision)** | Not required by law | Full replacement value | Protects fleet assets |
| **Hired Auto** | Not required but recommended | Included in commercial auto | Covers rented/leased vehicles |

### FMCSA Liability Minimums by Cargo Type

| Cargo Type | Minimum Liability |
|-----------|------------------|
| Non-hazardous freight, GVWR > 10,001 lbs | **$750,000** |
| Non-hazardous freight, GVWR < 10,001 lbs | **$300,000** |
| Hazardous substances (as defined by EPA) | **$5,000,000** |
| Oil and non-hazmat substances | **$1,000,000** |
| Household goods | **$750,000** |

### Insurance Requirements for External (1099) Drivers

| Insurance Type | Company Should Require |
|---------------|----------------------|
| Commercial Auto Liability | Minimum $750,000 (match FMCSA); add company as **additional insured** |
| Cargo Insurance | Minimum $100,000 per occurrence |
| General Liability | Minimum $1,000,000 per occurrence |
| Workers' Comp or Occupational Accident | Required in some states even for 1099; protects against employer liability claims |
| Physical Damage | Driver's responsibility for their vehicle |

### Certificate of Insurance (COI) Management

**App should track:**
- COI expiration dates for all external drivers
- Auto-alerts at 60, 30, and 14 days before expiration
- Block driver from accepting loads if insurance has lapsed
- Require annual COI renewal and verification
- Verify additional insured endorsement naming the company

---

## 8. MOFFETT/FORKLIFT CERTIFICATION

### Legal Framework: OSHA 29 CFR 1910.178

A Moffett (truck-mounted forklift) is classified as a **Class VII powered industrial truck** under OSHA regulations. The same OSHA forklift certification requirements apply to Moffett operators as to warehouse forklift operators.

### Training Requirements

| Component | Requirement | Details |
|-----------|------------|---------|
| **Formal (Classroom) Instruction** | Required | Truck-related topics + workplace-related topics |
| **Practical Training** | Required | Demonstrations and supervised exercises on actual equipment |
| **Evaluation** | Required | Employer must evaluate operator in the workplace |

### Training Content Must Cover

**Truck-Related Topics:**
- Operating instructions, warnings, and precautions for the specific truck type
- Differences from automobile operation
- Truck controls and instrumentation
- Engine/motor operation, steering, maneuvering, visibility
- Fork and attachment adaptation, operation, and limitations
- Vehicle capacity and stability
- Vehicle inspection and maintenance
- Refueling/recharging procedures
- Operating limitations
- Any other operating instructions unique to the Moffett

**Workplace-Related Topics:**
- Surface conditions (gravel, mud, slopes at construction sites)
- Composition of loads (building materials — heavy, awkward, fragile)
- Load manipulation, stacking, unstacking
- Pedestrian traffic (workers on construction sites)
- Narrow aisles, restricted areas
- Ramps and sloped surfaces
- Hazardous locations and classified atmospheres
- Operating in closed environments and proximity to other vehicles
- **Unique to Moffett:** Mounting/dismounting from truck, operation on uneven terrain, job-site delivery protocols

### Certification Timeline

| Milestone | Timeline |
|-----------|----------|
| Initial classroom training | 4-8 hours typically |
| Practical/hands-on training | 4-8 hours typically |
| Evaluation and certification | Same day as practical |
| **Total initial certification** | **1-2 days** |
| Recertification/re-evaluation | **Every 3 years** minimum |

### Situations Requiring Earlier Refresher Training

Per OSHA 1910.178(l)(4), refresher training is required when:
- The operator is observed operating unsafely
- The operator is involved in an accident or near-miss
- The operator receives a performance evaluation indicating unsafe operation
- There are changes in workplace conditions (new delivery sites, new terrain)
- The operator is assigned a different type of truck
- The operator has not operated a truck for an extended period

### Can External (1099) Drivers Be Moffett Certified?

**Yes**, but with conditions:
- The **employing entity** (which under OSHA means whoever directs the work) is responsible for ensuring training
- If the 1099 driver operates a Moffett under your company's direction, your company likely has training obligations
- Best practice: Require proof of valid Moffett certification from an accredited training provider
- Company should maintain training records for all operators using company Moffetts
- Consider having your own certification program for consistency

### Documentation Requirements

The employer must certify that each operator has been trained and evaluated:
- **Operator name**
- **Date of training**
- **Date of evaluation**
- **Identity of trainer/evaluator**
- Keep records for duration of employment

---

## 9. SAFETY TRAINING PROGRAM

### Required and Recommended Training Modules

| Training Module | Regulatory Basis | Frequency | Duration |
|----------------|-----------------|-----------|----------|
| **Defensive Driving** | OSHA General Duty Clause 5(a)(1) | Initial + annual refresher | 4-8 hours |
| **Cargo Securement** | 49 CFR 393 Subpart I | Initial + annual refresher | 2-4 hours |
| **Moffett/Forklift Operation** | OSHA 29 CFR 1910.178 | Initial + every 3 years | 8-16 hours |
| **Hours of Service (HOS)** | 49 CFR Part 395 | Initial + annual refresher | 1-2 hours |
| **Pre-/Post-Trip Inspection (DVIR)** | 49 CFR 396.11-396.13 | Initial + annual refresher | 1-2 hours |
| **Drug & Alcohol Awareness** | 49 CFR 382.601 | Initial (at hire) | 1 hour |
| **Hazard Communication (HazCom)** | OSHA 29 CFR 1910.1200 | Initial + when new hazards | 1-2 hours |
| **PPE Usage** | OSHA 29 CFR 1910.132 / 1926.95 | Initial + annual | 1 hour |
| **Accident/Incident Reporting** | Company policy / 49 CFR 390.15 | Initial + annual | 1 hour |
| **Emergency Procedures** | Company policy | Initial + annual | 1 hour |
| **Workplace Violence / Harassment** | State law (varies) | Initial + annual | 1 hour |
| **Fatigue Management** | Best practice / FMCSA guidance | Initial + annual | 1 hour |
| **Distracted Driving (Cell Phone Policy)** | 49 CFR 392.82 | Initial + annual | 30 min |
| **Construction Site Safety** | OSHA 1926 | Initial + as needed | 2-4 hours |
| **Back Injury Prevention / Ergonomics** | OSHA General Duty Clause | Initial + annual | 1 hour |
| **Weather/Road Condition Driving** | Best practice | Initial + annual | 1 hour |

### PPE Requirements for Building Materials Delivery Drivers

| PPE Item | When Required | Standard |
|----------|--------------|---------|
| **Hard hat** | Any time on a construction site; when overhead hazards exist | ANSI Z89.1 |
| **High-visibility safety vest** (Class 2 or 3) | All delivery locations; required on construction sites and roadsides | ANSI/ISEA 107 |
| **Steel-toe/safety-toe boots** | All delivery operations; OSHA requires when crush/puncture hazard exists | ASTM F2413 |
| **Safety glasses** | When cutting, loading, or when debris hazard exists | ANSI Z87.1 |
| **Work gloves** | Handling lumber, steel, concrete, strapping materials | Cut-resistant preferred |
| **Hearing protection** | Operating Moffett, boom truck, or near heavy machinery | ANSI S3.19 |

**Employer obligation under OSHA:** PPE must be provided at no cost to the employee (29 CFR 1910.132(h)), EXCEPT for safety-toe footwear and prescription safety eyewear that the employer allows to be worn off-site.

### Construction Site Safety for Drivers

Drivers entering construction sites must know:
- **OSHA 10-Hour Construction** card may be required by general contractors (not federally mandated for drivers, but increasingly required by site owners)
- Spotters must be used when backing
- Speed limits on site (typically 5-15 mph)
- Designated delivery/unloading zones
- Overhead power line awareness (especially for boom trucks and Moffetts)
- Excavation/trench proximity rules
- Communication with site superintendent before delivery

### Training Documentation

All training must be documented with:
- Employee name and signature
- Training topic and content summary
- Date and duration
- Trainer name and qualifications
- Test/evaluation results (if applicable)
- Retain for duration of employment + 3 years

---

## 10. PENALTIES FOR NON-COMPLIANCE

### FMCSA Civil Penalties (2025 Adjusted Amounts)

| Violation | Maximum Fine | Notes |
|-----------|-------------|-------|
| **HOS Violation (carrier)** | **$19,246** per violation | Per occurrence |
| **HOS Violation (driver)** | **$5,209** per violation | Per occurrence |
| **Egregious HOS Violation** (3+ hours over limit) | Maximum penalty applied | FMCSA considers gravity sufficient for max fine |
| **Knowing Falsification of Logs** | **$15,846** per entry | Each false log entry is separate violation |
| **Operating Without ELD** (when required) | **Out-of-service** + fine | Driver placed OOS; cannot continue until compliant |
| **CDL Violation** | **$6,974** per offense | Operating without proper class/endorsements |
| **Expired/No Medical Card** | **$6,974** per offense | CDL downgraded; cannot operate CMV |
| **Violating Out-of-Service Order (Driver)** | **$2,364** | Per occurrence |
| **Violating Out-of-Service Order (Carrier)** | **$23,647** | Per occurrence |
| **Failed Drug/Alcohol Test** | Immediate removal + Clearinghouse | CDL suspended in most states since Nov 2024 |
| **Clearinghouse Non-Compliance** | **$5,000+** per offense | Failure to query or report |
| **Unsecured/Improperly Secured Cargo** | **OOS violation** + state fines | Varies by state; typically $500-$10,000+ |
| **Overweight Truck** | **$250 - $16,000** federal; varies by state | Some states charge per-pound over limit |
| **No/Incomplete DQ File** | Cited in audit | Can contribute to unsatisfactory safety rating |

### Out-of-Service (OOS) Violations

These are the most operationally disruptive — the vehicle and/or driver is IMMEDIATELY prohibited from operating:

**Driver OOS:**
- No valid CDL
- No medical card
- BAC >= 0.04%
- HOS violation (egregious)
- Positive drug test / refusal

**Vehicle OOS:**
- Brake defects (out of adjustment, air leaks)
- Tire defects (below minimum tread, flat)
- Lighting failures
- Frame cracks
- Unsecured cargo (imminent hazard)
- Missing/non-functional ELD (when required)

### Can Violations Shut Down Operations?

**Yes.** FMCSA can issue an **Unsatisfactory Safety Rating** after a compliance review (audit), which can lead to:
- **Operating authority revocation** — Cannot operate CMVs in interstate commerce
- **Imminent hazard out-of-service order** — Immediate cessation of all operations
- **Consent order** — Mandatory corrective actions with monitoring

**Common triggers for compliance reviews:**
- High CSA (Compliance, Safety, Accountability) scores
- Fatal or serious crashes
- Complaints to FMCSA
- New entrant safety audits (within 18 months of new authority)
- Roadside inspection OOS rates above national average

---

## 11. RECORD-KEEPING REQUIREMENTS

### Driver Qualification (DQ) File Contents and Retention

| Document | Retention Period | Regulatory Citation |
|----------|-----------------|-------------------|
| Employment application | Duration of employment + 3 years | 49 CFR 391.51 |
| MVR (initial) | Duration of employment + 3 years | 49 CFR 391.23 |
| MVR (annual) | Duration of employment + 3 years; can purge after 3 years for active drivers | 49 CFR 391.25 |
| Previous employer investigation | Duration of employment + 3 years | 49 CFR 391.23 |
| Road test certificate or CDL copy | Duration of employment + 3 years | 49 CFR 391.31/391.33 |
| Medical examiner's certificate | Duration of employment + 3 years; replace with current as renewed | 49 CFR 391.43 |
| Annual review of driving record | Duration of employment + 3 years | 49 CFR 391.25 |
| Clearinghouse query records | Duration of employment + 3 years | 49 CFR 382.701 |
| Drug & alcohol test results | Varies: 1-5 years depending on type | 49 CFR 382.401 |

### Drug & Alcohol Testing Records Retention

| Record Type | Retention |
|------------|-----------|
| Positive test results | **5 years** |
| Negative test results | **1 year** |
| Alcohol test results >= 0.02 | **5 years** |
| Refusals to test | **5 years** |
| SAP referrals and reports | **5 years** |
| Random selection records | **2 years** |
| Training records for supervisors (reasonable suspicion) | Indefinite (while designated) |

### Other Critical Records

| Record Type | Retention | Citation |
|------------|-----------|----------|
| DVIR (pre-trip/post-trip) | **90 days** | 49 CFR 396.11 |
| Hours of Service logs/RODS | **6 months** | 49 CFR 395.8 |
| Short-haul time records | **6 months** | 49 CFR 395.1(e)(5) |
| Vehicle maintenance records | **1 year + 6 months after vehicle disposed** | 49 CFR 396.3 |
| Annual vehicle inspection reports | **14 months** | 49 CFR 396.21 |
| Accident register | **3 years** from date of accident | 49 CFR 390.15 |
| Training records | **Duration of employment + 3 years** | Best practice / OSHA |
| Insurance documentation | **Duration of coverage + 3 years** | Company policy |

### Digital vs. Paper Records

**FMCSA accepts electronic records** provided they meet the requirements of 49 CFR 390.32:
- Records must be **legible and accessible** for inspection
- Must be producible within **48 hours** of request
- Must have **adequate backup and security** measures
- **Audit trail** functionality recommended
- Electronic signatures are acceptable per the 2026 eDVIR final rule
- System must prevent unauthorized alteration

### What DOT Auditors Look For

1. **Completeness** — Every required document present for every driver
2. **Timeliness** — MVRs within 30 days, annual reviews on schedule, medical cards current
3. **Accuracy** — Information matches across documents
4. **Signatures** — All required signatures present
5. **Current status** — No expired documents in active driver files
6. **Drug/alcohol compliance** — Clearinghouse queries, random testing rates met
7. **Previous employer responses** — Evidence of good-faith effort to obtain SPH
8. **Systematic process** — Evidence of a consistent compliance program

---

## 12. INTERNATIONAL CONSIDERATIONS (UAE/SAUDI ARABIA)

### United Arab Emirates (UAE)

#### License Categories

| UAE Category | Vehicle Type | Equivalent |
|-------------|-------------|------------|
| **Category 3** | Heavy Truck (GVWR > 2,500 kg / 5,500 lbs) | Roughly CDL Class B |
| **Category 4** | Heavy Bus | N/A |
| **Category 5** | Heavy equipment (crane, forklift) | Specialized |
| **Category 6** | Light vehicle (car) | Regular license |

**Key differences from US:**
- Minimum age **20** for heavy truck license
- **25 hours minimum** practical driving training required
- Training MUST be through an RTA-approved driving school
- No endorsement system — separate licenses for each vehicle category
- License issued by Roads and Transport Authority (RTA) in each emirate
- Foreign license conversion possible for some nationalities

#### UAE Safety and Compliance

- **Annual vehicle inspection** (Tasjeel) required for all commercial vehicles
- **Tachograph/speed limiter** required on heavy vehicles
- Maximum driving hours regulated by Ministry of Human Resources
- **Insurance:** Third-party liability is mandatory minimum; most fleet operators carry comprehensive
- **Salik (toll system)** compliance required in Dubai
- No equivalent to FMCSA or DOT — regulation is by emirate (RTA Dubai, ITC Abu Dhabi, etc.)
- **UAE Federal Traffic Law** governs nationwide standards

#### UAE Insurance Requirements

- **Third-party liability** — Mandatory for all vehicles
- **Comprehensive coverage** — Recommended for commercial fleets
- **GCC cross-border insurance** — Required when vehicles cross into other Gulf states
- Workers' compensation — Mandatory under UAE labor law for employees
- **Shory Aber for Business** — Commercial vehicle insurance for cross-border operations

### Kingdom of Saudi Arabia (KSA)

#### License Categories

| KSA Category | Vehicle Type |
|-------------|-------------|
| **Private Vehicle License** | Light vehicles |
| **Public Transport License** | Taxis, buses |
| **Commercial Vehicle License** | Delivery vans, trucks, trailers, cargo vehicles |

**Key differences from US:**
- Commercial vehicle license required for ALL drivers handling goods
- **Theoretical and practical tests** required for each class
- License issued through Muroor (General Directorate of Traffic)
- **Nitaqat compliance** — Saudization requirements may affect driver hiring quotas
- Recent reforms allow international license holders to convert licenses

#### KSA Safety and Compliance

- **Saudi Standards Organization (SASO)** sets vehicle standards
- **SFDA** (Saudi Food and Drug Authority) may apply for certain chemical building materials
- **Absher platform** used for license and vehicle registration management
- Vehicle inspection (Fahas) required periodically
- **Insurance:** Compulsory third-party insurance under SAMA (Saudi Central Bank) regulations — the "Unified Compulsory Motor Insurance Policy"
- Speed limiters required on commercial vehicles
- Working hour limits under Saudi Labor Law (8 hours/day, 48 hours/week)

#### KSA Insurance Requirements

- **Compulsory third-party insurance** — Required by law (SAMA regulated)
- **Comprehensive insurance** — Optional but recommended for fleets
- **Manafith insurance** — Required for all foreign vehicles entering/transiting Saudi Arabia
- Coverage must be from a SAMA-licensed insurer

### Key International Differences Summary

| Aspect | United States | UAE | Saudi Arabia |
|--------|--------------|-----|-------------|
| Regulatory body | FMCSA/DOT | RTA (per emirate) | Muroor / Ministry of Transport |
| CDL equivalent | CDL Class A/B/C | Category 3-5 | Commercial Vehicle License |
| Endorsement system | H, N, T, P, S, X | Separate licenses per category | Separate licenses per category |
| ELD requirement | Yes (with exemptions) | Tachograph/speed limiter | Speed limiter; GPS tracking emerging |
| Drug testing | Mandatory DOT program | Pre-employment medical (may include) | Pre-employment medical |
| HOS rules | 11 driving / 14 window | Not as codified; labor law hours | 8 hours/day, 48 hours/week |
| Medical card | DOT medical certificate (every 2 years) | Medical fitness certificate | Medical fitness certificate |
| Minimum liability insurance | $750,000 (non-hazmat) | Third-party mandatory | Third-party mandatory (SAMA) |
| DVIR equivalent | DVIR (49 CFR 396.11) | Pre-use check (varies) | Vehicle condition report |
| Forklift certification | OSHA 1910.178 (3-year renewal) | OSHAD/municipality certification | Saudi OSHA equivalent |
| Cargo securement | 49 CFR 393 Subpart I | Federal Traffic Law + emirate rules | Saudi Standards (SASO) |

---

## 13. APP INTEGRATION SPECIFICATIONS

### Compliance Features to Build Into Driver Management Module

#### A. Driver Profile & Qualification Tracking

```
DRIVER PROFILE ENTITY:
- Personal info (name, DOB, SSN/EID, contact)
- CDL details (number, class, endorsements, restrictions, state, expiration)
- Medical card (certificate number, examiner, issue date, expiration)
- Drug/alcohol clearinghouse status (last full query, last limited query, status)
- Moffett/forklift certification (date, expiration, trainer)
- Vehicle types qualified to operate
- Training records (list of completed modules with dates)
- Insurance certificates (for 1099 drivers)
- Employment status (W-2 / 1099)
- DQ file completeness percentage
```

#### B. Automated Compliance Alerts

| Alert | Trigger | Lead Time |
|-------|---------|-----------|
| CDL Expiration | Approaching expiration | 90, 60, 30, 14, 7 days |
| Medical Card Expiration | Approaching expiration | 90, 60, 30, 14 days |
| Annual MVR Due | 365 days from last MVR | 30, 14, 7 days |
| Annual Clearinghouse Query Due | 365 days from last limited query | 30, 14, 7 days |
| Moffett Certification Expiration | 3 years from certification | 90, 60, 30 days |
| Insurance COI Expiration (1099) | Approaching expiration | 60, 30, 14 days |
| Random Drug Test Selection | System-generated random selection | Immediate |
| Training Refresher Due | Annual from last completion | 30, 14 days |

**Auto-block:** Driver is automatically blocked from dispatch when ANY critical document is expired (CDL, medical card, insurance, Clearinghouse prohibition).

#### C. HOS Tracking Dashboard

```
REAL-TIME HOS STATUS:
- Current driving time used / 11-hour limit
- Current duty window elapsed / 14-hour window
- Time since last 30-minute break / 8-hour break trigger
- Weekly hours used / 60 or 70-hour limit
- Available driving time remaining
- Available duty time remaining
- Short-haul exemption status (in/out of 150 air-mile radius)
- Projected HOS status at next delivery stop
- Warning indicators (green/yellow/red)
```

#### D. DVIR Digital Workflow

```
PRE-TRIP INSPECTION FLOW:
1. Driver selects vehicle from assigned fleet
2. System loads vehicle-specific checklist (flatbed vs box vs boom vs Moffett)
3. Driver marks each item: PASS / FAIL / N/A
4. For FAIL items:
   a. Required: Description of defect
   b. Required: Photo of defect
   c. System determines if OOS-level defect
   d. If OOS: Block departure, alert maintenance
   e. If non-OOS: Flag for repair, allow departure
5. Driver signs digitally
6. System timestamps and GPS-stamps the inspection
7. If vehicle was previously flagged with defects:
   a. Show previous DVIR with repair certifications
   b. Driver must acknowledge repairs before proceeding
8. Generate PDF record, store for 90+ days

POST-TRIP INSPECTION FLOW:
- Same checklist, completed at end of shift
- Includes cargo area cleared / clean check
- Sign off and submit
```

#### E. Cargo Securement Checklist (Per Delivery)

```
LOAD VERIFICATION CHECKLIST:
1. Load type selection (lumber, steel, concrete, palletized, mixed)
2. Total load weight
3. System calculates minimum tiedowns and WLL required
4. Driver confirms:
   - Number of tiedowns applied
   - Type of tiedowns used
   - Edge protection in place (yes/no/na)
   - Blocking/bracing in place (yes/no/na)
   - Headerboard/bulkhead condition
   - Tarping (if required)
5. Photo of secured load (required)
6. In-transit inspection reminder at:
   - 50 miles from origin
   - Every 3 hours or 150 miles
   - After every break/stop
```

#### F. Training Management Module

```
TRAINING TRACKER:
- Required modules by role (driver, Moffett operator, hazmat handler)
- Completion status per driver
- Expiration/renewal dates
- In-app training content delivery (video, quiz)
- Certification generation
- Supervisor sign-off workflow
- Auto-assignment of refresher training on schedule
```

#### G. Drug & Alcohol Compliance Module

```
D&A MANAGEMENT:
- Random selection pool management (50% drug, 10% alcohol annually)
- Random selection generator (quarterly distribution recommended)
- Notification to selected drivers (immediate, confidential)
- Pre-employment test tracking
- Post-accident test trigger logic:
  - Fatality? -> Mandatory test
  - Injury + citation? -> Mandatory test
  - Tow-away + citation? -> Mandatory test
  - None of above? -> No test required
- Clearinghouse query scheduler and status tracker
- SAP process tracking for violations
- Annual Clearinghouse limited query automation
```

#### H. DQ File Completeness Dashboard

```
DQ FILE STATUS:
For each driver, show:
- [ ] Application (complete/incomplete)
- [ ] CDL copy (current/expired/missing)
- [ ] Medical card (current/expired/missing)
- [ ] MVR (current/expired/missing)
- [ ] Previous employer verification (complete/pending/overdue)
- [ ] Drug/alcohol clearinghouse (clear/violation/pending)
- [ ] Pre-employment drug test (negative/pending/missing)
- [ ] Road test or CDL equivalence (documented/missing)
- [ ] Safety training (complete/incomplete)
- [ ] Moffett cert (current/expired/na)
- [ ] Insurance COIs - 1099 only (current/expired/missing)

Overall compliance score: X/Y items complete
Status: COMPLIANT / NON-COMPLIANT / PENDING
```

---

## SOURCES

### CDL Requirements
- [CDL Types Explained: Class A vs B vs C](https://driving-tests.org/cdl-classification-licenses/)
- [FMCSA Drivers Page](https://www.fmcsa.dot.gov/registration/commercial-drivers-license/drivers)
- [Class A vs Class B CDL](https://www.midwesttech.edu/resources/careers/what-is-the-main-difference-between-cdl-a-and-cdl-b/)

### Hours of Service and ELD
- [FMCSA Summary of HOS Regulations](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations)
- [Short-Haul Exemption Guide](https://www.mysafetymanager.com/short-haul-exemption/)
- [DOT Short-Haul Exemption Explained](https://trucksafe.com/post/dot-short-haul-exemption-explained)
- [ELD HOS and Agriculture Exemptions](https://www.fmcsa.dot.gov/hours-service/elds/eld-hours-service-hos-and-agriculture-exemptions)

### DVIR / Vehicle Inspections
- [FMCSA DVIR Regulations](https://www.fmcsa.dot.gov/regulations/inspection-repair-and-maintenance-driver-vehicle-inspection-report-dvir)
- [49 CFR 396.11 — eCFR](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396/section-396.11)
- [DVIR Guide 2026](https://heavyvehicleinspection.com/article/dvir-guide-driver-vehicle-inspection-report)
- [Federal Register: Electronic DVIRs](https://www.federalregister.gov/documents/2025/05/30/2025-09717/electronic-driver-vehicle-inspection-reports)

### Cargo Securement
- [FMCSA Cargo Securement Rules](https://www.fmcsa.dot.gov/regulations/cargo-securement/cargo-securement-rules)
- [49 CFR Part 393 Subpart I — eCFR](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-I)
- [FMCSA Load Securement Regulations Guide](https://www.mysafetymanager.com/fmcsa-load-securement-regulations/)
- [FMCSA Cargo Securement Quick Guide](https://www.mysafetymanager.com/cargo-securement/)

### Drug and Alcohol Testing
- [FMCSA Drug & Alcohol Testing Program](https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing-program)
- [FMCSA Testing Requirements](https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing/what-tests-are-required-and-when-does-testing-occur)
- [CDL Drug Testing Requirements 2025](https://americanriverwellnessrecovery.com/cdl-drug-testing-requirements/)
- [Drug & Alcohol Clearinghouse](https://clearinghouse.fmcsa.dot.gov/FAQ/Topics/CDL_Drivers,Employers)
- [49 CFR Part 382 — eCFR](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-382)

### Driver Onboarding / DQ Files
- [FMCSA DQ File Checklist](https://csa.fmcsa.dot.gov/safetyplanner/documents/Forms/Driver%20Qualification%20Checklist_508.pdf)
- [DQ File Checklist for DOT Audit 2026](https://www.avatarfleet.com/blog/driver-qualification-file-checklist-to-pass-dot-audit)
- [Driver Qualification File Requirements](https://www.mysafetymanager.com/driver-qualification-file/)
- [New Driver Onboarding Checklist (CDL Edition)](https://driving-tests.org/cdl-driver-onboarding-checklist/)
- [DOT Requirements for Non-CDL Drivers](https://checkr.com/resources/articles/dot-requirements-for-non-cdl-drivers)

### Insurance
- [FMCSA Insurance Filing Requirements](https://www.fmcsa.dot.gov/registration/insurance-filing-requirements)
- [Trucking & FMCSA Insurance Requirements 2026](https://www.freightwaves.com/checkpoint/commercial-truck-insurance-requirements/)
- [Commercial Truck Insurance Requirements Guide](https://www.logrock.com/commercial-insurance-explained/commercial-truck-insurance-requirements-explained/)
- [FMCSA Insurance Requirements — Progressive](https://www.progressivecommercial.com/business-resources/fmcsa-insurance-requirements/)

### Moffett/Forklift
- [OSHA Powered Industrial Trucks Training](https://www.osha.gov/etools/powered-industrial-trucks/training)
- [OSHA Forklift Certification Requirements 2025](https://www.certifyme.net/forklift-certification-requirements/)
- [OSHA Forklift Training FAQs — J.J. Keller](https://www.jjkeller.com/faq/osha-forklift-training-faqs)

### Safety Training
- [OSHA 1926.95 — Construction PPE](https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.95)
- [OSHA 1910.132 — General PPE Requirements](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.132)
- [NSC Professional Truck and Van Driver Course](https://www.nsc.org/safety-training/defensive-driving/nsc-defensive-driving-courses/ddc-professional-truck-and-van-driver-courses)

### Penalties
- [FMCSA Civil Penalties](https://www.fmcsa.dot.gov/regulations/enforcement/civil-penalties)
- [2025 FMCSA HOS Fines & Penalties](https://aguiarinjurylawyers.com/dot-fines-for-hours-of-service-hos-violations-in-2025/)
- [FMCSA Fines Increased for 2025](https://www.foley.io/articles/fmcsa-fines-have-increased-again)

### Record-Keeping
- [DQ File Record Retention — J.J. Keller](https://jjkellercompliancenetwork.com/regsense/dq-file-record-retention)
- [Driver Qualification Files 2025 Guide](https://dotdriverfiles.com/driver-qualification-files-in-2025-the-ultimate-guide-to-fmcsa-compliance/)

### International (UAE/Saudi Arabia)
- [UAE Driving Licence Categories 2026](https://www.shory.com/car-insurance/blog/categories-of-driving-licenses-in-the-uae)
- [Saudi Arabia Driving Licence Categories](https://motaded.com.sa/driving-licence-categories)
- [UAE Commercial Vehicle Insurance](https://www.shory.com/car-insurance/blog/comprehensive-guide-to-commercial-car-insurance-in-the-uae)
- [SAMA Unified Compulsory Motor Insurance Policy](https://rulebook.sama.gov.sa/en/unified-compulsory-motor-insurance-policy)

### 1099 vs W-2 Drivers
- [Understanding New DOL Rules: W-2 vs 1099](https://www.motorcarrierhq.com/blog/understanding-the-new-dol-rules-w-2-employees-vs-1099/)
- [1099 or W-2: Which Driver Type for Fleet Growth](https://www.ccjdigital.com/workforce/pay-and-benefits/article/15306412/1099-or-w2-which-type-of-driver-is-best-to-grow-your-fleet)
- [Trucking Workforce: Pros & Cons of 1099 vs Employees](https://www.risk-strategies.com/blog/trucking-workforce-the-pros-cons-of-1099-contractors-vs.-employees)
