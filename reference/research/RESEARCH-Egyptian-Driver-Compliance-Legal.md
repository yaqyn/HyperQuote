> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Egyptian Traffic Law and Driver Compliance for Commercial Building Materials Delivery
## Egyptian Regulations for B2B Logistics Operations (2025-2026)

> **IMPORTANT**: This document replaces the US-based FMCSA/DOT regulations in `RESEARCH-Driver-Onboarding-Compliance-Legal.md` with ACTUAL Egyptian law. Egypt operates under an entirely different legal framework — Law No. 66 of 1973 (Traffic Law) as amended, Labor Law No. 14 of 2025, and various ministerial decrees.

---

## TABLE OF CONTENTS

1. [Egyptian Commercial Driving License Categories](#1-egyptian-commercial-driving-license-categories)
2. [Traffic Law for Commercial Vehicles (Law 66/1973 as Amended)](#2-traffic-law-for-commercial-vehicles)
3. [Vehicle Technical Inspection Requirements](#3-vehicle-technical-inspection-requirements)
4. [Cargo Securement and Load Regulations](#4-cargo-securement-and-load-regulations)
5. [Working Hours and Labor Law for Drivers](#5-working-hours-and-labor-law-for-drivers)
6. [Drug and Alcohol Testing](#6-drug-and-alcohol-testing)
7. [GPS Tracking and Data Protection (Law 151/2020)](#7-gps-tracking-and-data-protection)
8. [Electronic Signatures and Digital POD (Law 15/2004)](#8-electronic-signatures-and-digital-pod)
9. [Commercial Vehicle Insurance](#9-commercial-vehicle-insurance)
10. [Penalties for Traffic Violations](#10-penalties-for-traffic-violations)
11. [Truck Movement Restrictions (Time and Route)](#11-truck-movement-restrictions)
12. [App Integration: What the Driver App Must Handle](#12-app-integration-requirements)

---

## 1. EGYPTIAN COMMERCIAL DRIVING LICENSE CATEGORIES

### Legal Basis: Traffic Law No. 66 of 1973 (as amended by Law 17 of 2024)

Egypt does NOT use the US CDL Class A/B/C system. Egypt uses a **three-tier professional license system** (رخصة قيادة مهنية):

| License Grade | Arabic Name | Vehicles Permitted | Minimum Prerequisites |
|---------------|-------------|-------------------|----------------------|
| **Third Degree** (درجة ثالثة) | رخصة مهنية ثالثة | Private cars, taxis, microbuses (up to 9 passengers), transport vehicles with load capacity up to 1.5 tons | Age 21+, valid national ID, medical fitness, drug test, union membership, social insurance subscription, pass theory + practical exam |
| **Second Degree** (درجة ثانية) | رخصة مهنية ثانية | All Third Degree vehicles PLUS heavy transport vehicles, tractors with trailers (non-agricultural) | All Third Degree requirements PLUS minimum 2 years holding Third Degree license |
| **First Degree** (درجة أولى) | رخصة مهنية أولى | ALL vehicle types without restriction | All Second Degree requirements PLUS minimum 2 years holding Second Degree license |

### What License Does Each Vehicle Type Need?

| Vehicle Type (Building Materials) | Required License | Notes |
|----------------------------------|-----------------|-------|
| Pickup truck (up to 1.5 tons) | **Third Degree** (مهنية ثالثة) | Sufficient for small deliveries |
| Flatbed truck (over 3.5 tons) | **Second Degree** (مهنية ثانية) | Heavy transport classification |
| Truck with trailer | **Second Degree** (مهنية ثانية) | Tractor-trailer combination |
| Cement mixer | **Second Degree** (مهنية ثانية) | Classified as heavy transport |
| Boom truck / crane truck | **Second Degree** (مهنية ثانية) | Heavy transport; separate crane operator certification may be required by employer |
| Semi-trailer (articulated) | **Second Degree** minimum, **First Degree** preferred | First Degree covers all vehicles without restriction |

### License Issuance Requirements

All professional license applicants must provide:
1. **National ID** (بطاقة الرقم القومي) — proof of age (21+) and residency
2. **Medical fitness certificate** — from authorized medical facility
3. **Drug screening test** — mandatory since Decision No. 1741/2025 (see Section 6)
4. **4 recent passport-size photos**
5. **Union membership** — membership in a relevant labor union (نقابة)
6. **Social insurance subscription** — enrollment with the National Organization for Social Insurance (التأمينات الاجتماعية)
7. **Pass theory exam** — traffic rules and road signs
8. **Pass practical driving test** — on the vehicle class being licensed

### License Validity and Renewal

- License validity: **3 years**
- Renewal requires updated medical fitness and drug test
- No "endorsement" system like US CDL — the license grade itself determines what you can drive

### Critical Difference from US System

There is NO equivalent of:
- US CDL endorsements (H, N, T, P, S)
- ELDT (Entry-Level Driver Training) from registered providers
- Training Provider Registry
- Medical Examiner's Certificate (separate from license)
- FMCSA Driver Qualification File

In Egypt, the traffic department (إدارة المرور) handles everything. The license itself IS the qualification.

---

## 2. TRAFFIC LAW FOR COMMERCIAL VEHICLES

### Legal Basis: Law No. 66 of 1973 as Amended (most recently by Law 17 of 2024 and December 2025 cabinet amendments)

### Speed Limits for Commercial Vehicles

Egypt applies a **Differential Speed Limit (DSL)** system — trucks are always slower than passenger cars on the same road:

| Road Type | Passenger Cars | Trucks | Trailers/Semi-trailers |
|-----------|---------------|--------|----------------------|
| Residential/Urban areas | 60 km/h | 50 km/h | 40 km/h |
| Rural/Regional roads | 80 km/h | 70 km/h | 60 km/h |
| Highways (intercity) | 90-100 km/h | 70 km/h | 60 km/h |
| Densely populated areas | 40 km/h | 40 km/h | 30 km/h |

**Speed limiters**: Any commercial, fleet, or public service vehicle must be equipped with a **certified speed limiting device**. This applies to all trucks used for logistics, industrial delivery, or cross-border transport.

### Weight Limits

**Ministry of Transport Decree No. 149 of 2024** — "Permitted Loads on Roads and Bridges" governs axle weight limits. Key provisions:

- Egypt has formal axle load limits enforced at weighbridges on major highways
- Specific limits per road and bridge type (details in the decree)
- Overweight vehicles are subject to fines and may be impounded until excess load is removed
- The General Authority for Roads, Bridges and Land Transport (الهيئة العامة للطرق والكباري والنقل البري) is the enforcement authority

**Vehicle dimension limits** (per Article 133 of the Executive Regulations):
- Maximum length: **12 meters** (two-axle vehicles)
- Maximum width: **2.6 meters**
- Maximum height: **3.5 meters** (within cities)

### Driving Hours

**CRITICAL GAP**: Egypt does NOT have an equivalent of the US FMCSA Hours of Service (HOS) regulations or the EU EC 561/2006 tachograph rules. There is:
- No legally mandated maximum continuous driving time for commercial drivers
- No mandatory electronic logging device (ELD) requirement
- No formal rest period rules specific to commercial drivers

**However**, the Labor Law (see Section 5) caps all workers at 8 hours/day and 48 hours/week, with overtime limits. This is the de facto driving hour limit.

**Practical implication for the platform**: Since there is no government-mandated HOS system, the company should implement its OWN driving hour limits as an internal safety policy, tracked through the driver app. This is a competitive safety advantage and reduces liability in accident litigation.

---

## 3. VEHICLE TECHNICAL INSPECTION REQUIREMENTS

### Legal Basis: Traffic Law 66/1973, Executive Regulations (Ministerial Decision 1613/2008)

### Annual Technical Inspection (الفحص الفني)

There is NO Egyptian equivalent of the US DVIR (Daily Vehicle Inspection Report). However, vehicles must pass an **annual technical inspection** for license renewal:

| Inspection Item | Requirement |
|----------------|------------|
| **Chassis** | Steel or compatible metal, matches manufacturer design, chassis number stamped and clearly visible |
| **Brakes** | Two independent systems required (service + parking). Service brakes operate equally on front/rear. Air-pressure systems need compressor tanks for minimum 5 emergency applications |
| **Tires** | Minimum 1.6mm tread depth in principal grooves. Must bear maximum weight safely |
| **Engine** | Minimum 5 HP per metric ton of maximum vehicle weight. No continuous heavy smoke emissions. Engine number stamped and verified |
| **Lights** | Headlamps illuminate minimum 150m. Side lights visible from 300m. Rear lights, brake lights, and reflectors (100m visibility at night) required |
| **Fire extinguishers** | Trucks up to 3 tons: one 3kg unit. Tank trucks / tractors with trailers: two 6kg units minimum |
| **Driver cabin** | Doors on both sides (minimum 50cm width) |
| **Mirrors** | Left wing mirror required for trucks/buses. Rear-view mirror required |
| **Windshield** | Functioning wipers for front glass |
| **Bumpers** | Front and rear, manufacturer-conforming |

### Inspection Costs (Approximate 2025)

- Registration fee: ~190 EGP
- Safety materials (triangle, first aid, reflective tape, stickers): ~570 EGP
- Fire extinguisher: ~420 EGP
- Total with additional supplies: ~1,200-1,500 EGP per vehicle

### Who Inspects?

- **Traffic Administration** (إدارة المرور) — the primary authority
- **Mobile technology centers** — available via phone number 15558 or Ministry of Interior website for on-site inspection at industrial facilities
- **Private inspection facilities** like INSPKT (https://www.inspkt.eg/) — authorized by the government

### Vehicle Age Restrictions

Vehicles manufactured more than **10 years prior** face restrictions on initial licensing for certain categories (buses, taxicabs, trailers).

### Pre-Trip Inspection: Internal Policy Recommendation

Since Egypt has NO daily pre-trip inspection law:
- Implement an **internal daily vehicle checklist** in the driver app
- Cover: brakes, tires, lights, mirrors, load securement, fire extinguisher
- This creates a paper trail for liability protection and is industry best practice
- The app should require completion before the driver can accept deliveries

---

## 4. CARGO SECUREMENT AND LOAD REGULATIONS

### Legal Framework

**Egypt does NOT have formal cargo securement standards equivalent to US FMCSA 49 CFR 393 or the EU EN 12195 series.** There is no:
- Minimum number of tie-downs per load length
- Working load limit (WLL) requirements for straps/chains
- Material-specific securement rules (lumber, steel, concrete, pipe)
- Mandatory cargo securement training curriculum

### What DOES Exist

**Traffic Law Article 74**: Trucks violating conditions of weight, height, width, and length of the load face fines of 50-200 EGP. This is the only specific cargo-related provision.

**Executive Regulations Article 133**: Cargo dimensions cannot exceed 12m length, 2.6m width, 3.5m height in cities. Cranes/equipment must be factory-fastened to base and must not affect vehicle balance.

**December 2025 Amendments**: Drivers who transport unsecured or hazardous loads face increased penalties including doubled fines and license suspension for repeat offenders. Fines range from EGP 5,000 to 15,000 for hazardous cargo violations (transporting flammable or harmful materials that leak or spill).

### Legal Liability for Unsecured Loads

When an unsecured load causes an accident:
- **Criminal liability** under the Penal Code for negligence causing death or injury
- **Civil liability** under Article 163 of the Civil Code (tort liability) — the driver AND the company can be held liable
- **Traffic law penalties** (fines + potential imprisonment)
- If death results from DUI combined with unsecured cargo: **3-7 years imprisonment + minimum EGP 20,000 fine**

### Practical Implication for the Platform

Since formal standards do not exist, the company should:
1. **Adopt international best practices** (e.g., EU EN 12195 or simplified versions) as internal policy
2. **Document load securement via photos** in the driver app before departure
3. **Train drivers** on material-specific securement (steel rebar, cement bags, lumber, tiles, pipes)
4. **Require load photos at pickup and delivery** — this becomes evidence in dispute resolution

---

## 5. WORKING HOURS AND LABOR LAW FOR DRIVERS

### Legal Basis: Labor Law No. 14 of 2025

The new Egyptian Labor Law applies to ALL employees including commercial drivers. Key provisions:

| Rule | Provision | Article |
|------|-----------|---------|
| **Maximum daily work** | 8 hours actual work, or 48 hours per week | Article 117 |
| **Maximum presence at workplace** | 12 hours per day (including rest periods) — NEVER to be exceeded | Article 117 |
| **Rest breaks** | Minimum 1 hour total rest per workday. No more than 5 consecutive hours without a break | Article 118 |
| **Maximum overtime** | 2 hours per day (10 hours total including overtime) | General provisions |
| **Overtime pay (daytime)** | Regular wage + 35% premium per hour | Article 121 |
| **Overtime pay (nighttime)** | Regular wage + 70% premium per hour | Article 121 |
| **Weekly rest day** | Minimum 1 full day off per week | Article 117 |
| **Rest day work compensation** | Additional day's wage + alternative rest day within following week | Article 121 |
| **Annual salary increase** | Minimum 3% annual raise on insurable salary | Article 12 |
| **Sick leave** | First 3 months: 100% pay. Next 6 months: 85%. Next 3 months: 75% | Article 131 |

### Drivers vs. Warehouse Workers

Under Egyptian law, there is **minimal legal distinction** between drivers and warehouse workers regarding labor protections. Both are covered by the same Labor Law. However:

- Drivers require **professional license** (رخصة مهنية) — warehouse workers do not
- Drivers must be **union members** — this is a license prerequisite
- Drivers must pass **drug screening** — warehouse workers generally do not unless company policy requires it
- Drivers face **criminal liability** for traffic accidents — warehouse workers face only workplace safety rules

### Employment Contracts

**Article 92** of Law 14/2025 permits **digital or paper** employment contracts, issued in **four copies**. This is significant for the platform — driver contracts can be managed digitally.

### Penalties for Employer Violations

**Article 297**: Fines from EGP 5,000 to 20,000, **doubled for repeat offenses**, for violating labor law provisions including working hours.

### Social Insurance

**Social Insurance and Pensions Law No. 148 of 2020** requires enrollment for all employees. Key rates:

| Contribution | Employee Share | Employer Share |
|-------------|---------------|----------------|
| Old age/disability/death | 11% of insurable salary | 18.75% of insurable salary |
| Work injury | — | 1.5% |
| Sickness | 1% | 3.25% |

**Important note**: Historically, land transportation workers were among those with gaps in social insurance coverage. Law 148/2020 expanded coverage to include 26 categories of workers, but compliance rates remain low in the transport sector. The platform should ensure ALL drivers (employees, not contractors) are properly enrolled.

### External Contractor Drivers

If using third-party transport companies or owner-operators:
- The transport company is responsible for their drivers' labor law compliance
- Your company's liability is limited to contractual obligations
- However, your company may still face civil liability if you knowingly engaged non-compliant contractors

---

## 6. DRUG AND ALCOHOL TESTING

### Legal Framework

**Decision No. 1741 of 2025** (published in the Official Gazette, September 2025): Drug testing is now **mandatory before issuing or renewing any driving license** in Egypt.

### Testing Requirements

| Requirement | Details |
|------------|---------|
| **Pre-license drug test** | Mandatory for all new license applications and renewals since September 2025 |
| **Roadside random testing** | Ministry of Interior conducts expanded campaigns across all governorates to detect drivers under the influence |
| **Blood Alcohol Concentration** | 0.00% BAC for ALL commercial vehicle drivers — zero tolerance |
| **Post-accident testing** | Standard police procedure after any accident involving commercial vehicles |

### Penalties for Driving Under Influence

| Scenario | Penalty | Legal Basis |
|----------|---------|-------------|
| DUI (no accident) | 3 months to 1 year imprisonment + fine of 500-1,000 EGP | Traffic Law Article 76 |
| DUI (repeat within 1 year) | **Double** the above penalties | Traffic Law Article 76 |
| DUI causing injury | Up to 2 years imprisonment + EGP 10,000 fine | Traffic Law Article 76 |
| DUI causing death or total disability | **3-7 years imprisonment** + minimum EGP 20,000 fine | Traffic Law Article 76 |
| Drug trafficking | 3 years hard labor to life imprisonment/death + fines 100,000-500,000 EGP | Penal Code Article 33 |

### Random Testing Campaigns

The Ministry of Interior (وزارة الداخلية) regularly conducts:
- Roadside drug testing checkpoints on major highways and ring roads
- Targeted campaigns in industrial zones and construction areas
- Testing of 100+ drivers per operation (documented cases on the Ring Road, Regional Highway)

### What This Means for the Platform

- **Pre-employment drug test**: Already required for license issuance, but verify at hiring
- **Periodic testing**: Implement company policy for annual or semi-annual screening
- **Post-accident testing**: Ensure the driver app workflow includes flagging for drug testing after any incident
- **Zero tolerance policy**: Codify the 0.00% BAC requirement in the driver handbook
- There is NO equivalent of the US DOT Clearinghouse or FMCSA drug testing consortium system — tracking is the company's responsibility

---

## 7. GPS TRACKING AND DATA PROTECTION

### Legal Basis: Personal Data Protection Law No. 151 of 2020 (PDPL)

### Is GPS Tracking Legal?

**Yes**, but with conditions. GPS tracking of employee-operated company vehicles is permitted under Egyptian law provided:

| Requirement | Details |
|------------|---------|
| **Legitimate purpose** | Must be linked to a legitimate business purpose: asset protection, route optimization, safety, delivery tracking |
| **Company-owned vehicles** | Tracking is limited to company-owned vehicles and systems |
| **Explicit consent** | Employees must provide explicit prior consent (Article 6 of PDPL) |
| **Purpose limitation** | Data can only be used for the stated operational/safety purpose |
| **Data minimization** | Collect only what is necessary |
| **Retention limits** | Data must be deleted when purpose is fulfilled or anonymized |
| **No personal device tracking** | Monitoring personal devices is discouraged due to constitutional privacy protections (Article 57 of the Constitution) |

### How to Obtain Consent

Consent should be documented through:
1. **Employment contract clauses** specifying GPS monitoring scope
2. **Internal company policy** clearly outlining surveillance practices
3. **Onboarding acknowledgment forms** with driver signature
4. **App-level consent** — the driver app should display tracking notice and require acceptance

### External Contractor GPS Tracking

For third-party drivers (not direct employees):
- Consent requirements are **even stricter** — they are not your employees
- Must be specified in the **service contract** with the transport company
- The transport company should provide consent on behalf of their drivers, OR
- Contractors must individually consent through the app

### Data Protection Officer (DPO)

All legal entities processing personal data must appoint a DPO responsible for:
- Monitoring data processing procedures
- Handling data subject access requests
- Notifying the Personal Data Protection Center (PDPC) of breaches within **72 hours**
- Notifying affected individuals within **3 working days**

### Penalties for Data Protection Violations

| Violation | Fine Range |
|-----------|-----------|
| Unlicensed processing | EGP 500,000 to 5,000,000 |
| Security breaches | EGP 300,000 to 3,000,000 |
| Non-compliance with DPO appointment | EGP 200,000 to 2,000,000 |
| Marketing violations | EGP 200,000 to 2,000,000 |
| Sensitive data violations | **Imprisonment (3-6 months)** possible |

### Cross-Border Data Transfer

If GPS or delivery data is stored outside Egypt (e.g., Supabase cloud servers):
- Receiving country must have **adequate protection standards**
- **PDPC license/permit mandatory** before transfer
- Transfer impact assessments may be required
- Exception: explicit consent from data subjects

### Status of Implementing Regulations

**As of early 2026, the executive regulations implementing the PDPL are not yet fully finalized.** This means some technical requirements (e.g., specific encryption standards, data localization rules) are still pending. The platform should follow the law's principles and be prepared to adapt when regulations are issued.

---

## 8. ELECTRONIC SIGNATURES AND DIGITAL POD

### Legal Basis: Law No. 15 of 2004 on Electronic Signatures (E-Signature Law) + Executive Regulations (Resolution 109/2005)

### Is a Digital Signature on a Delivery Note Legally Valid?

**Yes.** Article 14 of Law 15/2004 establishes that valid electronic signatures have **"the same legal effect as signatures under the provisions of the Evidence Law in civil and commercial matters."**

### Requirements for Valid E-Documents (Article 15)

For an electronic delivery note to be legally valid, it must meet three technical controls:

1. **Timestamp capability**: Technical ability to determine creation time/date through independent digital storage not controlled by the creator
2. **Source determination**: Technical ability to identify document origin and verify the creator's control over the creation source
3. **Authenticity verification**: Verification that creation details are accurate and documents remain unaltered

### Requirements for Valid E-Signatures

A valid electronic signature must be:
- **Linked** to the signatory in a unique way
- Under **sole control** of the signatory
- Capable of **detecting modifications** to the signed document
- Created using **ITIDA-licensed certification authorities** (for highest legal weight)

### Evidentiary Weight

Per the Law of Evidence (1968), once validity is established:
- E-documents serve as **conclusive evidence** "within the limits of its content"
- Cannot be challenged by lesser proof means
- Have the same determinative effect as official or unofficial written messages

### ITIDA (Information Technology Industry Development Agency)

ITIDA regulates and accredits e-certification authorities. For maximum legal protection:
- Use an ITIDA-licensed digital signature provider
- However, for routine POD (proof of delivery), a **simple electronic signature** (e.g., signature on screen + photo + GPS location + timestamp) is generally sufficient for commercial purposes

### Practical Implementation for POD

| POD Element | Legal Strength | Implementation |
|-------------|---------------|---------------|
| Customer signature on tablet/phone screen | Medium — valid as simple e-signature | Capture via driver app |
| Photograph of delivered goods at site | Strong — visual evidence with metadata | GPS-tagged, timestamped photo |
| GPS location + timestamp | Strong — corroborating evidence | Automatic in driver app |
| Customer confirmation via SMS/WhatsApp | Medium — traceable communication | Send confirmation link |
| Digital signature via ITIDA-certified provider | **Highest** — equal to handwritten signature | Overkill for routine deliveries, reserve for high-value orders |

### Recommendation for the Platform

For building materials delivery:
- **Standard deliveries**: App-based signature capture + GPS-tagged photos + timestamp = sufficient
- **High-value deliveries (EGP 500,000+)**: Consider ITIDA-certified digital signature or formal written receipt
- **Disputed deliveries**: The combination of GPS, photos, timestamps, and customer interaction logs creates a strong evidentiary package under Egyptian law

---

## 9. COMMERCIAL VEHICLE INSURANCE

### Legal Basis: Unified Insurance Law No. 155 of 2024 (replacing Law 72/2007)

### Compulsory Insurance

**All motor vehicles in Egypt must have compulsory third-party liability insurance** (تأمين إجباري). This is a legal prerequisite for vehicle registration and licensing.

| Coverage Type | Status | Details |
|--------------|--------|---------|
| **Third-party liability** (تأمين إجباري) | **MANDATORY** | Covers civil liability for death, injury, and property damage to third parties |
| **Comprehensive insurance** (تأمين شامل) | Optional but recommended | Covers own vehicle damage, theft, fire, natural disasters |
| **Cargo insurance** (تأمين البضائع) | Optional | Covers goods in transit — highly recommended for building materials |
| **Workers' compensation** | Required under labor law | Covers employees (including drivers) for work-related injuries |

### Compulsory Insurance Compensation Amounts (under previous Law 72/2007 — pending update under Law 155/2024)

| Event | Compensation Amount |
|-------|-------------------|
| Death or total permanent disability | **EGP 40,000** |
| Partial permanent disability | Proportional to disability percentage |
| Property damage to third parties | Maximum **EGP 10,000** |
| Payment deadline | Within **1 month** of notification |

**Note**: These amounts were set under Law 72/2007 and are widely considered inadequate. Law 155/2024 is expected to update compensation amounts, but the implementing regulations are still being issued.

### Insurance Pricing for Commercial Vehicles

Insurance premiums vary based on:
- Engine capacity and vehicle type
- Year of production (10% annual depreciation discount)
- Driver age and experience
- Driving history and violations
- Coverage type selected

Compulsory insurance for private vehicles starts at approximately 225-3,000 EGP/year depending on engine capacity. **Commercial vehicles (trucks) typically pay higher premiums** due to higher risk classification.

### Cargo Insurance Recommendation

For building materials delivery, cargo insurance is **not legally required but strongly recommended**:
- Building materials (steel, cement, tiles, lumber) have high per-load value
- Customer claims for damaged goods during transport are common
- Insurance provides protection against load shift, theft, weather damage
- Most major Egyptian insurers (Misr Insurance, AXA Egypt, Brokerage Insurance) offer commercial fleet + cargo packages

### The Egyptian Compulsory Motor Insurance Pool

The Financial Regulatory Authority (FRA) established a **Compulsory Motor Insurance Pool** where all insurers participate. This ensures coverage is available even for high-risk commercial fleets.

---

## 10. PENALTIES FOR TRAFFIC VIOLATIONS

### Legal Basis: Traffic Law 66/1973 as Amended (including December 2025 amendments)

### Penalty Schedule for Commercial Vehicle Violations

| Violation | Fine Range | Imprisonment | Article |
|-----------|-----------|-------------|---------|
| **Overweight/oversized load** | 50-200 EGP (pre-amendment) | — | Art. 74 |
| **Speeding** | 2,000-10,000 EGP | Up to 3 months | Art. 75 (amended) |
| **Driving without valid license** | Up to 5,000 EGP | Up to 1 year | Art. 75 (amended) |
| **Wrong license category** | 100-500 EGP | Up to 3 months | Art. 75 |
| **Expired vehicle registration** | Administrative fines + additional vehicle taxes | — | Amended provisions |
| **Tampering with license plates** | Up to 5,000 EGP | Up to 1 year | Amended provisions |
| **DUI (no accident)** | 500-1,000 EGP | 3 months to 1 year | Art. 76 |
| **DUI causing injury** | Up to 10,000 EGP | Up to 2 years | Art. 76 |
| **DUI causing death** | Minimum 20,000 EGP | **3-7 years** | Art. 76 |
| **No fire extinguisher** | 50-100 EGP | — | Art. 74 bis |
| **No seatbelt** | 50-100 EGP | — | Art. 74 bis |
| **Brakes non-functional** | 100-500 EGP | Up to 3 months | Art. 75 |
| **Hazardous cargo violation** | 5,000-15,000 EGP | — | Dec 2025 amendment |
| **Road pollution / dumping** | 5,000-15,000 EGP | — | Dec 2025 amendment |
| **Heavy smoke emissions** | 5,000-15,000 EGP | — | Dec 2025 amendment |
| **Truck speeding / causing traffic** | 4,000-8,000 EGP | Up to 3 months | Amended provisions |
| **Radar detector possession** | 500-1,000 EGP + confiscation | Up to 3 months | Art. 75 bis |
| **Violating truck movement ban** | 1,000-3,000 EGP | — | Art. 74 bis(5) |
| **Licensing violations (special categories)** | Up to 30,000 EGP | — | Dec 2025 amendment |

### Recidivism (Repeat Offenders)

The December 2025 amendments introduce a strict recidivism clause:
- **Same offense within 6 months**: Fine is **doubled**
- **Third-time offender**: **Mandatory imprisonment**
- License suspension applies to repeat offenders

### Points System

Egypt introduced a **points-based traffic system** where accumulated violations lead to automatic license suspension.

---

## 11. TRUCK MOVEMENT RESTRICTIONS

### Legal Basis: Prime Ministerial Decisions + Traffic Administration Orders

### Greater Cairo Restrictions

Heavy transport vehicles (over 5 tons load) face **time-based movement bans** in Greater Cairo:

| Zone | Restriction Period | Allowed Period |
|------|--------------------|---------------|
| Ring Road (most sections) | **6:00 AM to 12:00 midnight** — trucks BANNED | 12:00 midnight to 6:00 AM |
| Ring Road (Al-Marioutia to Saad El-Din axis) | 6:00 AM to 12:00 midnight — BANNED | 12:00 midnight to 6:00 AM |
| Ring Road (other sections) | No restriction | 24 hours |
| Central Cairo streets | **Daytime ban** — trucks banned during business hours | Night hours only |

### Why This Matters

62% of traffic deaths in Egypt occur in collisions with transport trucks, and truck collisions account for 40% of total traffic accidents. These restrictions are strictly enforced.

### Delivery Planning Implications

For building materials delivery in the Cairo metropolitan area:
- **Daytime deliveries within Greater Cairo**: Only possible with vehicles under 5 tons
- **Heavy loads (cement, steel, bulk materials)**: Must be scheduled for **midnight to 6:00 AM** delivery windows
- **Outside Greater Cairo**: No general time restrictions, but individual governorates may impose local restrictions
- **Construction sites**: Many accept only early morning deliveries to avoid disrupting neighbors

### The Driver App Must Handle

- **Route planning** that avoids restricted roads during banned hours
- **Delivery scheduling** that accounts for truck weight vs. allowed time windows
- **Alerts** when a driver approaches a restricted zone during banned hours
- **Night delivery mode** with enhanced safety features for midnight-6AM operations

---

## 12. APP INTEGRATION REQUIREMENTS

Based on Egyptian regulations, the driver app must handle the following compliance features:

### License Verification
- Store driver's professional license grade (أولى / ثانية / ثالثة)
- Verify license grade matches assigned vehicle type
- Track license expiration dates (3-year validity)
- Alert for upcoming renewal (including drug test requirement)

### Vehicle Compliance
- Annual inspection tracking per vehicle
- Fire extinguisher validity tracking
- Insurance policy expiration alerts
- Speed limiter compliance verification

### Daily Operations (Internal Policy — no legal requirement for daily inspection)
- Pre-trip checklist (brakes, tires, lights, mirrors, load security, fire extinguisher)
- Photo documentation of vehicle condition
- Load securement photos before departure
- GPS-tagged photos at pickup and delivery

### Working Hours Tracking
- 8-hour daily work limit enforcement (Labor Law Article 117)
- 5-hour maximum continuous work without break (Article 118)
- 48-hour weekly limit tracking
- Overtime calculation (35% day / 70% night premium)
- 12-hour maximum daily presence alert

### Drug/Alcohol Compliance
- Pre-employment drug test verification date
- Periodic testing reminders
- Post-accident protocol trigger
- License drug test expiration tracking

### GPS and Data Protection
- Consent capture at first app login
- Clear privacy notice about tracking scope
- Data retention policy enforcement
- Ability for driver to view their own tracking data (data subject rights)

### Electronic POD
- Customer signature capture on screen
- GPS-tagged delivery photos (mandatory)
- Timestamp recording (independent, not editable)
- Delivery confirmation SMS/WhatsApp to customer
- Digital delivery note generation

### Insurance
- Compulsory insurance policy number per vehicle
- Cargo insurance status per load (if applicable)
- Accident documentation workflow with photo/GPS evidence
- Insurance claim initiation from app

### Truck Movement Restrictions
- Real-time restriction zone awareness
- Time-based route planning (midnight-6AM for heavy loads in Cairo)
- Weight-based vehicle classification for restriction enforcement
- Alert system for approaching restricted zones

---

## SUMMARY: KEY DIFFERENCES FROM US REGULATIONS

| Area | US (FMCSA/DOT) | Egypt |
|------|----------------|-------|
| **License system** | CDL Class A/B/C with endorsements | Three-grade professional license (أولى/ثانية/ثالثة) |
| **Driving hours** | Strict HOS rules (11hr drive/14hr window) with ELD mandate | No commercial-specific driving hours law; general labor law (8hr/day) applies |
| **Daily inspection** | DVIR legally required pre-trip and post-trip | No legal requirement — internal policy only |
| **Cargo securement** | Detailed 49 CFR 393 with specific tie-down rules per material | No formal standards — only weight/dimension limits in traffic law |
| **Drug testing** | DOT 5-panel, random testing, Clearinghouse | Mandatory for license issuance/renewal; roadside random testing by police |
| **Speed limiters** | Not federally mandated | Mandatory for all commercial/fleet vehicles |
| **Electronic logging** | ELD mandate (49 CFR 395.8) | No ELD requirement |
| **Insurance** | Complex multi-layer (liability, cargo, general, umbrella) | Compulsory third-party only; cargo optional |
| **Truck movement restrictions** | Some local restrictions | Strict time-based bans in Greater Cairo (trucks banned 6AM-midnight) |
| **POD** | BOL (Bill of Lading) system | E-signature law supports digital POD |
| **Penalties** | CSA scores, FMCSA fines ($16,000+), carrier shutdown | Fines generally EGP 50-30,000; imprisonment for serious offenses |

---

## SOURCES

- [Egyptian Traffic Law Penalties - Daily News Egypt](https://www.dailynewsegypt.com/2025/12/24/egyptian-cabinet-approves-tougher-traffic-law-penalties-to-improve-road-safety/)
- [Traffic Law No. 17 of 2024 - Ellaithy Lawyers](https://ellaithylawyers.com/traffic-law-no-17-of-2024-as-amended-by-law-no-66-of-1973/)
- [Ministry of Interior - Traffic Violations and Penalties](https://traffic.moi.gov.eg/English/OurServices/InfoServices/TrafficGuide/Pages/traffic-violations-and-penalties.aspx)
- [Ministry of Interior - Vehicle Safety Conditions](https://traffic.moi.gov.eg/English/OurServices/InfoServices/InteriorMinisterDecision/Pages/Terms-of-durability-and-security.aspx)
- [Speed Limiters in Egypt - Resolute Dynamics](https://speed.resolute-dynamics.com/blog/are-speed-limiters-mandatory-in-egypt/)
- [Egypt Labor Law 2025 - Habib Al Mulla](https://habibalmulla.com/articles/a-landmark-reform-for-egypts-workforce/)
- [Egypt Labor Law No. 14 of 2025 - ID Law Firm](https://id.com.eg/egyptian-labor-law/)
- [Egypt Working Hours - Playroll](https://www.playroll.com/working-hours/egypt)
- [Egypt Data Protection Law - ICLG](https://iclg.com/practice-areas/data-protection-laws-and-regulations/egypt)
- [Egypt Data Protection - PwC](https://www.pwc.com/m1/en/services/consulting/technology/cyber-security/navigating-data-privacy-regulations/egypt-data-protection-law.html)
- [Egypt Data Protection Law 151/2020 - DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=EG)
- [Electronic Signatures in Egypt - Mondaq](https://www.mondaq.com/contracts-and-commercial-law/1737494/electronic-signatures-in-egypt-%7C-legal-validity-under-law-15-of-2004)
- [E-Signature Law - Docusign Egypt](https://www.docusign.com/products/electronic-signature/legality/egypt)
- [Compulsory Motor Insurance Pool - Atlas Magazine](https://www.atlas-mag.net/en/article/egyptian-pool-dedicated-to-compulsory-motor-insurance)
- [Types of Car Insurance Egypt - Tokio Marine](https://www.tokiomarine.com.eg/types-of-car-insurance-in-egypt/)
- [Compulsory Insurance Types and Prices - Brokerage Insurance](https://brokerage-insurance.com/en/blog/article/types-and-prices-of-compulsory-car-insurance)
- [Unified Insurance Law 155/2024 - Adsero](https://adsero.me/the-new-unified-insurance-law-a-major-advancement-in-the-egyptian-insurance-sector/)
- [EGL Circular - Ministry Decree 149/2024 on Permitted Loads](https://www.eglegypt.com/wp-content/uploads/2024/07/EGL-Circular-no-03-of-2024-about-Ministry-Decree-No-149-of-2024-Permitted-loads-on-Roads-and-Bridges-Final.pdf)
- [Professional License Requirements - Dostor](https://www.dostor.org/5223161)
- [Drug Testing for License Issuance - Awan Masr](https://www.awanmasr.com/%D8%B1%D8%B3%D9%85%D9%8A%D9%8B%D8%A7-%D8%A5%D8%AC%D8%B1%D8%A7%D8%A1-%D8%AA%D8%AD%D9%84%D9%8A%D9%84-%D9%85%D8%AE%D8%AF%D8%B1%D8%A7%D8%AA-%D9%82%D8%A8%D9%84-%D8%A7%D8%B3%D8%AA%D8%AE%D8%B1%D8%A7%D8%AC/)
- [Egyptian Cabinet - Traffic Law Amendments - Ahram Online](https://english.ahram.org.eg/News/559276.aspx)
- [Truck Rules on Highways - Youm7](https://www.youm7.com/story/2024/3/10/%D8%AA%D8%B9%D8%B1%D9%81-%D8%B9%D9%84%D9%89-%D9%82%D9%88%D8%A7%D8%B9%D8%AF-%D8%B3%D9%8A%D8%B1-%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA-%D8%A7%D9%84%D9%86%D9%82%D9%84-%D8%A7%D9%84%D8%AB%D9%82%D9%8A%D9%84-%D8%B9%D9%84%D9%89-%D8%A7%D9%84%D8%B7%D8%B1%D9%82-%D8%A7%D9%84%D8%B3%D8%B1%D9%8A%D8%B9%D8%A9/6505177)
- [E-Signature Law on WIPO Lex](https://www.wipo.int/wipolex/en/legislation/details/13546)
- [Egypt Social Insurance - SSA](https://www.ssa.gov/policy/docs/progdesc/ssptw/2018-2019/africa/egypt.html)
- [Truck Speed Limits Research - MDPI](https://www.mdpi.com/2076-3417/12/24/12702)
