> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# COMPLETE DRIVER OPERATIONS MODEL
## B2B Building Materials Distribution (HyperQuote)
### Operational Blueprint -- 2025/2026

**Research Date:** March 2026
**Scope:** Three driver types (Internal W2, Contracted Recurring, On-Demand Gig) delivering heavy building materials (cement, steel, lumber, aggregates, roofing, drywall, windows) to construction sites.

---

## Table of Contents

1. [Driver Recruitment and Hiring](#1-driver-recruitment-and-hiring)
2. [Driver Types and When to Use Each](#2-driver-types-and-when-to-use-each)
3. [Vehicle Types for Building Materials](#3-vehicle-types-for-building-materials)
4. [Driver App -- Complete Feature List](#4-driver-app----complete-feature-list)
5. [Driver Daily Workflow -- Hour by Hour](#5-driver-daily-workflow----hour-by-hour)
6. [Dispatch Assignment Logic](#6-dispatch-assignment-logic)
7. [Loading and Departure Workflow](#7-loading-and-departure-workflow)
8. [On-Site Delivery Workflow](#8-on-site-delivery-workflow)
9. [Proof of Delivery -- Legal Requirements](#9-proof-of-delivery----legal-requirements)
10. [Driver Safety and Compliance](#10-driver-safety-and-compliance)
11. [Driver Communication Flow](#11-driver-communication-flow)
12. [Driver Pay Models](#12-driver-pay-models)
13. [External/Contracted Driver Management](#13-externalcontracted-driver-management)
14. [Returns and Failed Deliveries](#14-returns-and-failed-deliveries)
15. [Vehicle Maintenance and Fleet Health](#15-vehicle-maintenance-and-fleet-health)
16. [Real Driver Apps in Building Materials](#16-real-driver-apps-in-building-materials)

---

## 1. Driver Recruitment and Hiring

### 1.1 The 2025-2026 Driver Shortage Landscape

The American Trucking Associations projects a deficit of over **80,000 drivers** in 2025, with the industry needing nearly 100,000 new drivers annually to keep pace with retirements and growth. The trucking industry overall is short approximately 78,000 drivers as of 2024, and the situation has worsened through 2025-2026. Aging drivers are retiring faster than new talent enters the field, compounded by lingering post-pandemic supply chain disruptions.

**Building materials delivery is especially hard-hit** because:
- Requires CDL holders (smaller applicant pool than non-CDL delivery)
- Requires specialized equipment operation skills (boom, Moffett, crane)
- Physical demands are high (outdoor work, heavy materials, construction site hazards)
- Local/regional routes are less attractive to long-haul CDL holders used to higher mileage pay
- Competition from other trucking sectors offering sign-on bonuses of $5,000-$15,000

### 1.2 CDL vs Non-CDL Requirements

**CDL Required For:**
- Any vehicle with a Gross Vehicle Weight Rating (GVWR) over 26,001 lbs (Class 7 and Class 8 trucks)
- Any combination vehicle where the towed unit exceeds 10,001 lbs GVWR
- Most flatbed tractor-trailers, boom trucks, large Moffett-equipped trucks
- CDL Class A: Tractor-trailer combinations (semi + flatbed trailer)
- CDL Class B: Single vehicles over 26,001 lbs (straight trucks, boom trucks, concrete mixers)

**Non-CDL Drivers Can Operate:**
- Vehicles under 26,001 lbs GVWR (Class 3-6 trucks)
- Box trucks, smaller flatbeds, pickup trucks with trailers (if combination stays under 26,001 lbs)
- Cargo vans, sprinter vans

**DOT Medical Card Required For All CMV Drivers:**
- Any driver operating a vehicle over 10,001 lbs GVWR must have a valid DOT medical certificate
- Physical exam every 24 months by a certified medical examiner on the FMCSA National Registry
- Starting June 23, 2025: Medical examiners must electronically transmit CDL exam results directly to FMCSA (integration rule). Non-CDL drivers continue carrying a physical medical card.
- Vision: at least 20/40 in each eye (with or without correction), 70-degree field of vision in each eye
- Hearing: ability to perceive a forced whisper at 5 feet
- Blood pressure: under 140/90 preferred, up to 180/110 with annual recertification
- Disqualifying conditions: uncontrolled epilepsy, insulin-dependent diabetes (waiver available), certain cardiovascular conditions

### 1.3 Where to Find Drivers

**Job Boards and Platforms:**
| Source | Best For | Notes |
|--------|----------|-------|
| Indeed | CDL and non-CDL drivers | Largest volume; building materials companies like Foundation Building Materials and Mobile Lumber actively post here |
| CDLjobs.com | CDL-specific | Targeted audience, higher quality CDL applicants |
| Drivers360 | CDL recruiting | Specialized platform with driver-matching algorithms |
| TruckingTruth | New CDL graduates | Community of student/new drivers seeking first jobs |
| Craigslist | Local non-CDL drivers | Good for pickup/box truck drivers; low cost to post |
| Facebook Groups | Local driver communities | "CDL Drivers Looking for Work [City]" groups |
| Zip Recruiter | Volume recruiting | AI matching, wide distribution |

**Trucking Schools and Training Programs:**
- Partner directly with local CDL training schools for a pipeline of new graduates
- Offer **employer-sponsored CDL training** (tuition reimbursement in exchange for 12-24 month commitment)
- 2025-2026 trend: Companies investing heavily in paid training pathways -- new CDL holders get mentorship programs, ride-along training, and graduated responsibility
- Contact state workforce development agencies for DOT-funded CDL training programs

**Referral Programs:**
- Internal driver referral bonuses: $500-$2,500 per successful hire (industry standard)
- Referrals consistently produce the highest-quality, longest-retention drivers
- Some companies (ABC Supply, Builders FirstSource) operate branch-level referral programs

**Temp-to-Hire and Staffing Agencies:**
- CDR General Services, TQL, Randstad, PeopleReady/TrueBlue specialize in CDL temp-to-hire
- Useful for evaluating drivers before full-time commitment
- Typical markup: 30-50% above the driver's hourly rate
- Good strategy for seasonal ramps (spring/summer construction peak)

### 1.4 Qualification and Screening Process

**For Internal W2 Drivers:**

| Step | Requirement | Details |
|------|-------------|---------|
| 1. Application | Employment application | Standard application plus CDL info, driving history |
| 2. CDL Verification | Verify CDL class and endorsements | Use FMCSA Pre-Employment Screening Program (PSP) to pull 5-year crash data and 3-year inspection history |
| 3. Clearinghouse Query | FMCSA Drug & Alcohol Clearinghouse | **Mandatory** -- cannot hire without full pre-employment query; requires driver's electronic consent; checks for prior drug/alcohol violations |
| 4. MVR Pull | Motor Vehicle Record | Pull from state DMV; look for moving violations, DUIs, license suspensions |
| 5. Background Check | Criminal background | Standard practice; check for felonies, theft, violent offenses |
| 6. DOT Physical | Medical Examiner's Certificate | Must pass DOT physical; valid for up to 24 months |
| 7. Pre-Employment Drug Test | DOT 5-panel drug test | Mandatory under 49 CFR Part 382; must receive negative result before any safety-sensitive functions |
| 8. Road Test / Skills Assessment | Practical driving evaluation | Test CDL skills plus building-materials-specific: cargo securement, Moffett/boom operation, backing at construction sites |
| 9. Safety Training | Company orientation | HOS rules, cargo securement, construction site safety, PPE, app training |

**Drug and Alcohol Testing Program (Ongoing):**
- **Pre-employment**: DOT 5-panel drug test required before hire
- **Random testing**: FMCSA mandates 50% random drug testing rate and 10% random alcohol testing rate annually for the driver pool
- **Post-accident**: Required when driver is involved in an accident with fatality, bodily injury requiring transport, or vehicle tow-away
- **Reasonable suspicion**: When a trained supervisor observes signs of impairment
- **Return-to-duty**: After any positive test; requires evaluation by a Substance Abuse Professional (SAP)
- **Follow-up**: Minimum 6 unannounced tests in first year after return-to-duty
- **Clearinghouse**: As of November 2024, a "prohibited" Clearinghouse status results in CDL revocation/denial

**For Contracted/External Drivers:**
- All of the above, PLUS:
- Verify carrier operating authority (USDOT number, MC number)
- Verify insurance: minimum $750,000 liability (most shippers require $1,000,000), cargo insurance of $100,000-$500,000
- Check FMCSA Safety Measurement System (SMS) scores (CSA BASIC percentiles)
- Carrier411 or CarrierAssure for safety ratings, insurance history, authority monitoring
- Verify vehicle registration and inspection records
- Signed carrier agreement with indemnification and insurance requirements

**For On-Demand/Gig Drivers (Curri/GoShare model):**
- Vehicle photo verification (platform matches vehicle size to delivery requirements)
- Valid driver's license (CDL not typically required for light loads)
- Insurance verification (personal auto + platform supplemental)
- Background check (platform-administered)
- No DOT drug testing requirement for non-CDL under 10,001 lbs GVWR
- Rating/review system acts as ongoing performance screen

### 1.5 Recruitment Strategy by Driver Type

**Internal (W2) -- Invest in Retention:**
- Competitive hourly wages ($22-$36/hour depending on region and skills)
- Health insurance, 401k, PTO
- Predictable local routes (home every night)
- Equipment training and career advancement (driver to lead driver to dispatcher)
- Modern equipment (newer trucks, working A/C, good maintenance)
- Signing bonuses ($1,000-$5,000) for experienced CDL holders with boom/Moffett skills

**Contracted -- Formalize Relationships:**
- Preferred carrier agreements with volume commitments
- Consistent lane assignments for reliability
- Quick pay terms (net-15 or faster)
- Equipment requirements written into contract
- Regular performance reviews

**On-Demand -- Leverage Platforms:**
- Use Curri, GoShare, or similar platforms
- No recruitment needed -- platform provides the driver pool
- Focus on clear delivery instructions and good pickup experience
- Rate and review drivers for future matching

---

## 2. Driver Types and When to Use Each

### 2.1 Internal Drivers (W2 Employees)

**Profile:**
- Full-time employees on company payroll
- CDL Class A or B holders (for heavy equipment)
- Trained on specialized equipment (boom, Moffett, conveyor, crane)
- Know the local delivery area, customer sites, and company procedures
- Wear company uniforms, drive company trucks

**Best Used For:**
- Core daily delivery volume (the predictable 70-85% of deliveries)
- Specialized equipment deliveries (boom-to-roof, Moffett unloading)
- High-value customers with service level commitments
- Deliveries requiring construction site expertise
- Any delivery needing company-branded customer interaction

**When Internal Fleet Makes Sense:**
- You have **5+ trucks needed daily** from a single location
- You do **20-30+ deliveries per day** from a location
- Deliveries require **specialized equipment** (boom, Moffett, crane, conveyor)
- **Customer service differentiation** is critical (guaranteed time windows)
- Consistent, predictable delivery volume year-round

**Cost Per Truck Per Year (All-In):**
| Cost Component | Annual Cost |
|----------------|-------------|
| Driver wages + benefits | $77,512 |
| Truck payment/lease | $28,857 |
| Fuel | $44,327 |
| Insurance | $7,936 |
| Maintenance and repair | $16,192 (~$0.15/mile) |
| **Total per truck** | **~$174,824/year** |
| **Cost per mile (all-in)** | **$1.77-$2.90/mile** |

### 2.2 Contracted Drivers (Recurring External)

**Profile:**
- Independent owner-operators or small carrier companies
- Operate under their own USDOT/MC authority (or leased onto yours)
- Own or lease their own trucks and equipment
- Have verified insurance ($1M liability, $100K-$500K cargo)
- Recurring relationship: assigned regular lanes or overflow work
- Classified as 1099 contractors or paid through their carrier entity

**Best Used For:**
- **Overflow capacity** during peak season (spring/summer construction boom)
- **Geographic coverage** in areas without a branch or enough volume for owned fleet
- **Specialty loads** requiring equipment you do not own (oversized steel, heavy precast)
- **Long-haul transfers** between distribution centers (not last-mile)
- **Predictable supplemental capacity**: e.g., "We need 3 extra flatbeds every Monday-Thursday April through September"

**When Contracted Makes Sense:**
- You have **seasonal demand swings** exceeding internal fleet capacity by 15-30%
- You need to serve areas **outside your core geography**
- You have predictable overflow but not enough to justify another truck/driver hire
- You need specific **equipment you don't own** (dump trailer, lowboy, step deck)

**Cost:**
- Flatbed spot rate: $2.53-$3.07/mile (includes driver, truck, fuel, insurance)
- Contract rate (committed volume): typically 10-15% below spot rate
- Per-delivery pricing also common for local: $150-$500 per delivery depending on distance, weight, equipment

### 2.3 On-Demand Drivers (One-Off Gig)

**Profile:**
- Gig workers on platforms like Curri or GoShare
- Operate personal vehicles (pickup trucks, cargo vans, box trucks, sprinter vans)
- No CDL typically required (light loads only)
- 1099 independent contractors of the platform
- No recurring relationship -- each delivery is a one-off assignment
- Platform handles matching, payment, insurance, and basic vetting

**Best Used For:**
- **Light, urgent loads**: hot shots, small part orders, tool/supply runs
- **Same-day emergency deliveries**: contractor needs 10 bags of cement NOW
- **Will-call pickups**: customer orders at branch, needs delivery to site
- **Low-weight materials**: fasteners, adhesives, small hardware, fixtures
- **Markets where you have no fleet presence**

**When On-Demand Makes Sense:**
- Load is under 2,000-3,000 lbs (pickup truck / cargo van capacity)
- No specialized equipment needed (no boom, no Moffett, no crane)
- Same-day or within-hours urgency
- One-off or infrequent delivery to a location
- Testing a new market before committing to fleet

**On-Demand Platforms for Building Materials:**

| Platform | Vehicle Types | Coverage | Pricing Model |
|----------|--------------|----------|---------------|
| **Curri** | Cars, SUVs, pickups, vans, box trucks, flatbeds, Moffett | Nationwide (US) | Per-delivery, pay-as-you-go, no subscription |
| **GoShare** | Pickup trucks, cargo vans, box trucks | Nationwide (US) | Per-delivery, distance + time + weight |
| **Frayt** | Cars, SUVs, vans, box trucks | Regional | Per-delivery |
| **Bungii** | Pickup trucks, large vehicles | Regional | Per-delivery, distance-based |

**Curri Specifics (Market Leader for Building Materials):**
- Driver pool includes flatbed and Moffett-equipped vehicles
- Same-day delivery in as fast as 2 hours
- GPS tracking and ETA updates
- Pay-as-you-go, no subscription or minimum volume commitment
- Drivers are gig workers (1099); Curri handles vetting, insurance, payment
- Route drivers available for guaranteed daily routes ($28/hr + overtime at $37.50/hr for route drivers)
- Per-delivery drivers get instant payout within 15 minutes of completion

**Cost Comparison:**
| Driver Type | Cost Per Delivery (local 20-mile) | Cost Per Delivery (50-mile) | Equipment Available | Reliability |
|-------------|-----------------------------------|------------------------------|---------------------|-------------|
| Internal | $80-$150 (allocated) | $150-$250 (allocated) | Full (boom, Moffett, crane) | Highest |
| Contracted | $150-$300 | $250-$500 | Varies (per agreement) | High |
| On-Demand | $75-$200 | $150-$400 | Limited (mostly flatbed/pickup) | Variable |

### 2.4 The Hybrid Model (What Major Companies Do)

Most mid-to-large building materials distributors (5-20 branches) use a hybrid approach:

- **Core fleet (owned/leased):** Handles 70-85% of regular daily volume with internal W2 drivers
- **Contracted carriers:** Handles 10-20% (predictable overflow, specialty, long-haul)
- **On-demand platforms:** Handles 5-10% (hot shots, urgent same-day, light loads)

**How Major Companies Handle It:**

| Company | Fleet Size | Approach |
|---------|-----------|----------|
| **Builders FirstSource** | ~4,500 company trucks | Primarily internal fleet with company drivers; GPS-tracked; real-time notifications; delivery photos via myBLDR platform |
| **ABC Supply** | 900+ locations, own fleet | Boom trucks, flatbeds, box trucks, cranes, conveyors, knuckle-boom trucks, semis across 450+ branches; guarantees delivery within 30 minutes of scheduled time |
| **SRS Distribution** | Acquired by Home Depot | Own fleet at branch level; supplemented by contracted carriers for overflow |
| **Carter Lumber** | Regional fleet | Own fleet for reliability, cost control, flexibility |

**Key Insight:** In building materials, most companies lean heavily toward owned fleet because:
1. Specialized equipment (boom, Moffett, crane) is rarely available from third parties
2. Driver skill requirements for construction site delivery exceed standard freight
3. The delivery driver IS the customer relationship -- contractors judge suppliers by delivery reliability
4. Same-day/urgent response requires fleet control

---

## 3. Vehicle Types for Building Materials

### 3.1 Complete Vehicle Guide

**1. Flatbed Truck (Standard)**

| Attribute | Details |
|-----------|---------|
| Description | Open flat platform truck, no sides or roof |
| Classes | Class 5 (16,001-19,500 lbs), Class 6 (19,501-26,000 lbs), Class 7 (26,001-33,000 lbs), Class 8 (33,001-80,000+ lbs) |
| Payload | 10,000-48,000 lbs depending on class |
| Best for | Lumber bundles, steel beams, drywall pallets, roofing bundles, precast concrete, engineered wood |
| Unloading | Requires site equipment (forklift, crane) OR must be paired with Moffett |
| License | Non-CDL for Class 5-6 single units; CDL Class B for Class 7; CDL Class A for tractor-trailer |
| New purchase price | $50,000-$85,000 (Class 6 straight truck); $120,000-$180,000 (Class 8 tractor) |
| Lease cost | $1,500-$2,500/month (Class 6); $2,500-$4,000/month (Class 8) |

**2. Flatbed with Moffett (Piggyback Forklift)**

| Attribute | Details |
|-----------|---------|
| Description | Flatbed truck with a truck-mounted forklift (HIAB Moffett brand) riding on a rear bracket |
| Moffett capacity | 5,000-8,000 lbs lift capacity; some models up to 10,000 lbs |
| Best for | ANY palletized material -- lumber bundles, bagged cement, brick pallets, packaged drywall, shingle bundles |
| Key advantage | Driver is completely self-sufficient; no site equipment needed; 4-way steering for tight spaces |
| Limitation | Cannot lift to roof height; needs firm, level ground; reduces payload by ~5,000-6,000 lbs; takes 4-6 feet of trailer length |
| License | CDL Class A or B (depending on truck size) + forklift certification |
| Moffett purchase price | $40,000-$80,000 new; used $15,000-$40,000 |
| Moffett rental | Available daily, weekly, or monthly from dealers like Eliftruck, GoLoadMac |
| Truck + Moffett total | $160,000-$260,000 new (truck + Moffett combined) |

**3. Boom Truck / Knuckle-Boom Crane**

| Attribute | Details |
|-----------|---------|
| Description | Hydraulic crane mounted on truck chassis; can lift materials to elevated positions |
| Lift capacity | 3-28 tons depending on class and boom length |
| Best for | Roofing materials (shingles, underlayment) delivered DIRECTLY to the roof; trusses, wall panels, heavy items to upper floors |
| Key advantage | Eliminates site crew carrying materials up ladders/scaffolding; huge time saver for roofing jobs |
| Limitation | Requires outrigger setup (needs space); cannot operate in winds above 20-30 mph; needs overhead clearance (no power lines above); requires NCCCO-certified operator |
| License | CDL Class B minimum; NCCCO crane certification |
| New purchase price | $200,000-$450,000 (Class 7); $437,000-$820,000 (Class 8 with large crane) |
| Typical stops per day | 3-6 (each stop takes 30-60 minutes due to setup) |

**4. Conveyor Truck**

| Attribute | Details |
|-----------|---------|
| Description | Truck with belt conveyor that angles up from the truck bed to roof or upper floor |
| Best for | Shingles, bagged materials, smaller items that can ride a belt conveyor |
| Key advantage | Faster than crane for high-volume roofing material delivery; lower skill requirement than boom operation |
| Limitation | Limited to materials that can ride a belt; cannot handle large/heavy individual pieces |
| License | CDL Class B; basic conveyor operation training |
| New purchase price | $150,000-$300,000 |

**5. Box Truck**

| Attribute | Details |
|-----------|---------|
| Description | Enclosed cargo area on truck chassis |
| Classes | Class 3-6 (10,001-26,000 lbs GVWR) |
| Best for | Weather-sensitive materials (drywall, insulation, adhesives, paint); small hardware orders; will-call deliveries |
| Key advantage | Weather protection for cargo; secure storage; liftgate option for ground-level unloading |
| Limitation | Cannot carry oversized items (lumber lengths); limited to smaller volumes; no specialized unloading |
| License | Non-CDL for most (under 26,001 lbs); CDL Class B if over 26,001 lbs |
| New purchase price | $40,000-$70,000 (Class 4-5); $60,000-$100,000 (Class 6) |
| Lease cost | $1,200-$2,000/month |

**6. Pickup Truck with Trailer**

| Attribute | Details |
|-----------|---------|
| Description | Standard pickup (F-250/350, Ram 2500/3500, Silverado 2500/3500) with flatbed or utility trailer |
| Best for | Light loads, hot shots, small orders, will-call pickups, urgent deliveries |
| Payload | 2,000-5,000 lbs (truck bed); 7,000-14,000 lbs (with trailer, depending on configuration) |
| Key advantage | Most flexible; can navigate residential streets; fast deployment; lowest cost |
| Limitation | Limited capacity; manual unloading; weather exposure for cargo |
| License | Non-CDL (if combination under 26,001 lbs and towed unit under 10,001 lbs) |
| Purchase price | $45,000-$75,000 (new pickup); $3,000-$15,000 (trailer) |

**7. Semi-Trailer (Tractor + Flatbed Trailer)**

| Attribute | Details |
|-----------|---------|
| Description | Class 8 tractor pulling a full-size flatbed trailer (48-53 feet) |
| Best for | Full truckloads of lumber, steel, aggregate; branch-to-branch transfers; long-haul from mill/manufacturer |
| Payload | 40,000-48,000 lbs |
| Limitation | Cannot navigate tight residential construction sites; requires site crane/forklift for unloading |
| License | CDL Class A mandatory |
| New purchase price | $150,000-$200,000 (tractor) + $20,000-$40,000 (flatbed trailer) |

**8. Concrete Mixer Truck**

| Attribute | Details |
|-----------|---------|
| Description | Truck with rotating drum for transporting and mixing concrete |
| Capacity | 8-12 cubic yards (approximately 32,000-48,000 lbs of concrete) |
| Best for | Ready-mix concrete delivery |
| Special requirement | Concrete has a pour window (60-90 minutes from batching); tight scheduling critical |
| License | CDL Class B; specialized training on drum operation and pour techniques |
| New purchase price | $150,000-$250,000 |

### 3.2 Vehicle Selection Matrix by Material Type

| Material | Primary Vehicle | Secondary Vehicle | CDL Required? |
|----------|----------------|-------------------|---------------|
| Lumber (bundles) | Flatbed + Moffett | Semi-trailer | Yes (Class A/B) |
| Steel beams/rebar | Flatbed (standard) | Semi-trailer | Yes (Class A) |
| Roofing (shingles) | Boom truck, conveyor | Flatbed + Moffett | Yes (Class B) |
| Cement (bagged) | Flatbed + Moffett | Box truck w/ liftgate | Depends on size |
| Drywall/gypsum | Boom truck, flatbed | Box truck | Depends on size |
| Concrete (ready-mix) | Concrete mixer | N/A | Yes (Class B) |
| Aggregates (sand, gravel) | Dump truck | Semi + dump trailer | Yes (Class A/B) |
| Bricks/pavers (pallets) | Flatbed + Moffett | Flatbed (site forklift) | Depends on size |
| Windows/doors | Box truck | Pickup + trailer | Usually no |
| Insulation | Box truck | Cargo van | Usually no |
| Fasteners/hardware | Pickup truck, cargo van | Box truck | No |
| Trusses/engineered wood | Semi-trailer (oversized) | Flatbed | Yes (Class A) |

---

## 4. Driver App -- Complete Feature List

### 4.1 App Screen Flow (Login to End of Day)

**SCREEN 1: LOGIN / AUTHENTICATION**
- Biometric login (fingerprint / face ID) -- one tap, no passwords in the field
- PIN code fallback for when biometric fails (gloves, dirty fingers)
- Session persistence: stay logged in for the shift unless explicitly logged out
- Device binding: app tied to company-issued device or BYOD with MDM

**SCREEN 2: SHIFT START / DASHBOARD**
- Toggle: "Start Shift" / "Go Available" (for external: "I'm Available")
- Today's route summary card:
  - Number of stops remaining
  - Estimated total drive time
  - Estimated finish time
  - Total weight on truck
  - Special notes from dispatch (weather alerts, site closures)
- Quick-access buttons:
  - "Pre-Trip Inspection" (DVIR)
  - "View Full Route"
  - "Messages" (unread count badge)
  - "Contact Dispatch" (one-tap call)
- Vehicle selection (if driver uses different trucks day-to-day)
- Status indicator: On Duty / Driving / On Break / Off Duty (syncs with ELD if applicable)

**SCREEN 3: PRE-TRIP INSPECTION (DVIR)**
- Digital checklist organized by vehicle area:
  - Exterior (tires, lights, mirrors, body, fluid leaks, coupling devices)
  - Under hood (engine oil, coolant, belts, hoses)
  - Cab (steering, brakes, horn, wipers, gauges, seatbelt, mirrors)
  - Specialized equipment (boom: hydraulic lines, control functions, outriggers; Moffett: fork condition, tilt, mast, fuel, tires)
  - Cargo area (deck condition, tie-down points, stakes, tarps)
- Each item: Pass / Fail / N/A toggle
- Photo capture for any defects found
- Notes field per section
- Defect severity: Minor (can still drive) / Major (truck cannot leave until repaired)
- Digital signature to certify inspection
- Auto-submit to fleet manager / maintenance queue
- Previous day's post-trip inspection visible for reference (any open defects)
- Timestamp and GPS location of inspection

**SCREEN 4: LOAD VERIFICATION**
- Order manifest display:
  - Order number(s) on this truck
  - Customer name and delivery address per order
  - Line items with SKU, description, quantity, weight
  - Loading sequence guidance: "Load Order #789 FIRST (last delivery), Order #456 LAST (first delivery)"
- Scan mode:
  - Barcode/QR scan per item or per pallet (camera-based, <0.2 seconds per scan)
  - Count verification: scanned quantity vs. manifest quantity
  - Mismatch alert: "Expected 47 pieces of 2x4x8, scanned 45 -- SHORT 2"
- Manual check mode:
  - Tap-to-confirm per line item (for items without barcodes)
  - Quantity input field
- Photo capture:
  - "Take photo of loaded truck" (timestamped, GPS-tagged)
  - "Take photo of cargo securement" (documentation for compliance)
- Weight verification:
  - Manual weight entry (from scale ticket)
  - Running total vs. truck capacity limit
  - Overweight alert if approaching GVWR
- Damage check:
  - "Any damage visible before departure?" Yes/No
  - If Yes: photo capture, damage category (crushed, wet, broken, missing), affected items
- Sign-off: "I confirm this load is correct and secured" (digital signature)
- Departure button: "Ready to Depart"

**SCREEN 5: ROUTE VIEW (Main Navigation Screen)**
- Full route map showing all stops as numbered pins
- Optimal route path highlighted
- Traffic overlay (real-time)
- Stop list (swipeable bottom sheet):
  - Stop number, customer name, address, delivery window
  - Material summary (e.g., "8 pallets lumber, 2 pallets cement")
  - Unloading method icon (boom, Moffett, manual, site equipment)
  - Status: Pending / En Route / Arrived / Completed / Failed
- Current location and progress indicator
- ETA to next stop (dynamically updated with traffic)
- "Navigate to Next Stop" button (launches turn-by-turn)
- Route stats bar: "4 of 7 stops complete | Est. finish 2:30 PM"
- Drag-and-drop stop reordering (with dispatch approval required)

**SCREEN 6: TURN-BY-TURN NAVIGATION**
- Integrated navigation (Mapbox or HERE Maps)
- Truck-specific routing:
  - Weight-restricted bridges avoided
  - Low clearance tunnels/overpasses avoided
  - Truck-prohibited roads avoided
  - Construction site approach from best direction
- Voice guidance (hands-free)
- Upcoming delivery info bar at bottom:
  - Customer name, delivery window
  - Site access notes preview
- "Call Customer" button (one-tap, during approach)
- Offline map tiles cached for areas with poor connectivity

**SCREEN 7: STOP DETAILS (Pre-Arrival, triggered by geofence at ~500m)**
- Auto-expand when approaching delivery:
  - Customer name, company, phone number
  - Site contact person and phone
  - Delivery address with plus code / what3words pin if GPS-poor area
  - Delivery window (e.g., "9:00-11:00 AM")
  - Access instructions:
    - Gate code
    - Entry point ("Use south entrance off Main St")
    - Photos of previous successful access route
    - Pin drop of exact unloading location
  - PPE requirements: hard hat, safety vest, steel toes (with acknowledgment checkbox)
  - Unloading method: Boom / Moffett / Manual / Site Equipment
  - Special instructions from customer ("Stack lumber on east side of foundation")
  - Historical notes from previous deliveries ("Ground soft on north side -- avoid")
- "Arrived" button (marks arrival time, notifies dispatch and customer)
- "Call Site Contact" button
- "Report Issue" button (access blocked, site not ready, etc.)

**SCREEN 8: DELIVERY EXECUTION**
- Item checklist per order:
  - Each line item with checkbox
  - Scan or tap to verify each item delivered
  - Quantity adjustment (for partial delivery)
  - Damage flag per item
- Unloading checklist (equipment-specific):
  - Boom: outrigger setup confirmed, overhead clearance verified, wind speed acceptable
  - Moffett: area clear, ground firm, path to placement location clear
  - Manual: crew available, pathway clear
- Timer: delivery duration tracking (for performance metrics)
- "Mark Item Delivered" per line
- "Partial Delivery" option:
  - Select which items delivered
  - Reason code for items NOT delivered (backordered, damaged, not on truck, customer request)
  - Remaining items auto-scheduled for follow-up

**SCREEN 9: PROOF OF DELIVERY (POD)**
- Photo capture (required, minimum 1):
  - Materials at placement location
  - Wide shot showing site context
  - Close-up of material condition
  - All photos auto-tagged with GPS coordinates + timestamp
- Signature capture:
  - Full-screen signature pad
  - "Print name" text field
  - "Title/role" dropdown (Foreman, PM, Superintendent, Owner, Other)
  - Legally valid under E-SIGN Act and UETA
- Weight ticket upload (for bulk materials):
  - Camera capture of scale ticket
  - Manual weight entry field
- Tally sheet confirmation (for lumber/steel):
  - Item-by-item count confirmation
  - Receiver's count vs. shipped count
- Notes field:
  - Pre-defined quick notes: "All items delivered as ordered," "See damage photos," "Placed per customer instructions"
  - Free-text for additional notes
- Condition statement: "Materials delivered in good condition" / "Damage noted (see photos)"
- GPS coordinates of delivery captured automatically
- "Complete Delivery" swipe-to-confirm (prevents accidental completion)

**SCREEN 10: DAMAGE REPORTING (if applicable)**
- Damage discovery workflow:
  - When discovered: "At loading," "In transit," "At delivery," "Customer reported after delivery"
  - Damage type: Crushed, Wet/Water damage, Broken/Cracked, Scratched/Dented, Missing pieces, Other
  - Affected items (select from manifest)
  - Severity: Minor (cosmetic), Moderate (partial loss of function), Severe (unusable)
  - Photo documentation (minimum 2 photos)
  - Notes field
  - "Who noticed?" Driver / Customer / Warehouse
- Automatic notification to dispatch and claims team
- Link to specific order and delivery for tracking

**SCREEN 11: ISSUE / EXCEPTION REPORTING**
- Exception types with guided workflows:
  - **Site not ready**: Photo + notes, reschedule options
  - **No one to receive**: Attempts made (calls, wait time), leave materials or return
  - **Access blocked**: Photo of obstruction, alternate access attempted
  - **Customer refuses**: Reason code, customer signature on refusal document, photo of refused items
  - **Wrong address**: Correct address entry, reroute request
  - **Weather delay**: Condition type, estimated delay, safety assessment
  - **Equipment failure**: Type of failure, photos, can complete remaining stops? Yes/No
  - **Accident/incident**: Safety first prompt, emergency contacts, photo documentation, incident report workflow
- Each exception auto-notifies dispatch
- Resolution options presented based on exception type

**SCREEN 12: BREAK / STATUS MANAGEMENT**
- Status toggles:
  - Driving (auto-detected via motion)
  - On Duty (not driving) -- loading, unloading, paperwork
  - Break (30-minute HOS break timer with countdown)
  - Off Duty
  - Sleeper Berth (if applicable)
- HOS countdown timers:
  - "Drive time remaining: 8h 23m"
  - "Duty window remaining: 11h 02m"
  - "Weekly hours remaining: 32h 15m"
- Break reminder: automatic alert at 7.5 hours driving
- Mandatory break enforcement: cannot start navigation to next stop if break is overdue
- For external/on-demand: simple "Available" / "Unavailable" / "On Delivery" toggles

**SCREEN 13: MESSAGING / COMMUNICATION**
- In-app messaging threads:
  - With dispatch (primary)
  - With warehouse
  - With customer (per delivery)
- Pre-defined quick messages:
  - "On my way to stop #X"
  - "Running approximately [15/30/45/60] minutes late"
  - "Need help at site -- please call"
  - "Delivery complete"
  - "Cannot access site -- gate locked"
- Photo/voice message support
- Read receipts
- One-tap call buttons for dispatch, warehouse, customer, emergency

**SCREEN 14: EXPENSE REPORTING (for drivers who incur expenses)**
- Fuel receipt capture (photo)
- Tolls (photo or manual entry)
- Parking fees
- Equipment/supplies (straps, edge protectors, etc.)
- Meal allowance tracking
- Mileage tracking (for contracted/on-demand)
- Submit for reimbursement workflow

**SCREEN 15: END OF DAY**
- Post-trip inspection (DVIR):
  - Same checklist as pre-trip
  - Note any NEW defects discovered during the day
  - Flag defects requiring immediate maintenance attention
  - Digital signature
- Day summary:
  - Stops completed / stops attempted / stops failed
  - Total miles driven
  - Total drive time / on-duty time
  - On-time delivery percentage
  - Exceptions logged
  - Pending items (returns brought back, unresolved issues)
- Return-to-yard confirmation:
  - Returns: log items returned to warehouse with reason codes
  - Fuel: fuel level or fuel receipt
  - Vehicle parked location
  - Keys returned (if applicable)
- "End Shift" button (triggers clock-out)

### 4.2 App Platform Capabilities

**Offline-First Architecture (Critical for construction sites):**
- All delivery data cached locally before departure
- POD photos, signatures, scans queued for upload when connectivity returns
- Local SQLite database for instant reads/writes
- Recommended stack: PowerSync + Supabase for sync, or WatermelonDB for open-source
- Photos compressed on-device before sync
- Map tiles pre-cached for delivery areas

**Background GPS Tracking:**
- Motion-activated GPS (only tracks when moving -- saves 80%+ battery)
- Adaptive refresh rates: 5-15 seconds while driving, 60 seconds when stationary
- Transistor Software react-native-background-geolocation (industry standard)
- Geofence triggers for approaching delivery, arriving at site, departing site

**Push Notifications:**
- New delivery assigned
- Route changed by dispatch
- Customer message received
- Break reminder (HOS)
- Delivery cancelled while en route
- Weather/safety alerts
- Distinct sound per notification type
- Critical alerts override Do Not Disturb

**Hardware Integration:**
- Camera (photos, barcode scanning, document capture)
- GPS (location tracking, geofencing)
- Accelerometer (motion detection, driving behavior)
- Bluetooth (ELD device pairing, printer for receipts)
- NFC (badge tap for clock-in/out at facilities)
- Signature pad (touchscreen signature capture)

---

## 5. Driver Daily Workflow -- Hour by Hour

### 5.1 Internal Driver (W2 Employee) -- Typical 10-Hour Day

**5:00-5:30 AM -- Clock In and Pre-Trip**
1. Arrive at yard/branch. Clock in via app or timeclock.
2. Check app for today's route assignment: stop sequence, special instructions, delivery windows.
3. Review any messages from dispatch (overnight changes, customer notes).
4. Walk to assigned vehicle.
5. **Complete FMCSA-required pre-trip DVIR:**
   - Walk-around: tires (tread, pressure, damage), all lights operational, mirrors clean and adjusted, body/frame damage, fluid leaks underneath
   - Under hood: engine oil level, coolant level, belts/hoses condition, power steering fluid
   - Cab: steering play, brake pedal feel, parking brake, horn, wipers/washers, gauges functional, seatbelt
   - Coupling (if tractor-trailer): fifth wheel locked, kingpin engaged, glad hands connected, no air leaks, safety chains
   - Specialized equipment: boom crane function test (all movements), Moffett startup and controls check, hydraulic line inspection for leaks, outrigger operation test
   - Document inspection on app (digital DVIR): mark each item pass/fail, photograph defects, sign off
6. If defects found: report to maintenance via app. Truck may be red-tagged. Dispatcher reassigns driver to another vehicle.

**5:30-6:30 AM -- Loading**
1. Drive truck to loading dock or yard staging area.
2. Meet with warehouse team. Review load plan showing which orders go on truck and in what sequence.
3. Warehouse team loads truck using forklift, dock crane, or manual. **Loading sequence: LIFO (last delivery loaded first, first delivery loaded last).**
4. Driver verifies load against order paperwork/app manifest:
   - Correct products (SKU, grade, size, color match)
   - Correct quantities (count bundles, pieces, pallets)
   - No visible damage (check edges, corners, packaging integrity)
5. **Cargo securement** per FMCSA 49 CFR Part 393, Subpart I:
   - Chains and binders for heavy loads (steel beams, heavy lumber)
   - Ratchet straps for lighter loads (drywall, shingle bundles)
   - Edge protectors at every point where strap contacts cargo edge
   - Dunnage (spacers) between layers
   - Minimum tiedown count:
     - Under 5 feet, under 1,100 lbs: 1 tiedown
     - Under 5 feet, over 1,100 lbs: 2 tiedowns
     - 5-10 feet: 2 tiedowns
     - Over 10 feet: 2 + 1 additional per 10 feet
   - Aggregate Working Load Limit of all tiedowns must equal at least 50% of cargo weight
6. Take departure photo of loaded and secured truck via app.
7. Sign off on load verification in app. Tap "Ready to Depart."

**6:30 AM -- Depart Yard**
1. Tap "Navigate to First Stop" in app.
2. Turn-by-turn navigation with truck-specific routing begins.
3. Within first 50 miles: **FMCSA requires first cargo securement re-inspection.** Pull over at safe location, walk the load, re-tighten all straps/chains, confirm nothing has shifted.

**7:00 AM-2:30 PM -- Route Execution (typically 4-8 stops)**

*At each delivery stop (30-90 minutes per stop depending on equipment and material):*

**Arrival Phase (5-10 minutes):**
1. App triggers arrival via geofence. Timestamp recorded.
2. Call site contact: "I'm here with your delivery from [Company]. Where should I set up?"
3. Confirm safe unloading location with site contact.
4. Perform site assessment:
   - Overhead power lines? (must be 3+ meters clear for boom)
   - Soft ground? (Moffett may get stuck)
   - Adequate space for truck positioning and equipment operation?
   - Pedestrian/worker traffic nearby?
   - Other vehicles/equipment operating in area?
5. Don PPE as required: hard hat, safety vest, steel-toed boots (app reminds based on site profile).
6. For first-time sites: may need to complete site induction/orientation.

**Unloading Phase (15-60 minutes depending on equipment):**

*If Moffett:*
1. Position truck at unloading area.
2. Dismount Moffett from rear bracket.
3. Start Moffett, perform quick operational check.
4. Unload pallets one at a time, place at designated location.
5. Customer/site contact verifies each pallet placement.

*If Boom/Crane:*
1. Position truck in optimal crane reach location.
2. Deploy outriggers (need level, firm ground + adequate clearance).
3. Connect/rig materials for lifting.
4. Operate boom to lift materials to roof/upper floor.
5. Site crew receives materials at placement point.
6. Retract boom, stow outriggers.

*If Manual:*
1. Park as close to unloading point as possible.
2. Unload by hand with help from site crew.
3. For heavy items (80+ lb bags): use hand truck, dolly, or request customer assistance.

**POD Phase (5-10 minutes):**
1. Customer/site contact counts and inspects delivered materials.
2. Note any discrepancies on delivery ticket (short, damaged, wrong item).
3. Capture POD in app:
   - Photo(s) of materials at placement location (GPS-stamped)
   - Electronic signature from authorized receiver
   - Name and title of signer
   - Notes on condition
4. For bulk materials: attach weight/scale ticket photo.
5. For lumber/steel: confirm tally count.

**Departure Phase (5-10 minutes):**
1. Re-secure remaining cargo on truck for next stop.
2. FMCSA re-inspection required: every 3 hours of driving or 150 miles, whichever comes first, plus after any duty status change.
3. Tap "Delivery Complete" in app. Auto-navigates to next stop.
4. Update dispatch on any issues encountered.

**12:00-12:30 PM -- Lunch / Required Break**
- 30-minute break (HOS requirement after 8 hours of driving time)
- Mark status as "Break" in app
- Find safe parking location
- Cannot drive during break period

**2:30-3:30 PM -- End of Day**
1. Return to yard with empty truck (or with returns/refused materials).
2. Log any returned items in app with reason codes.
3. Unload returns at warehouse receiving dock.
4. Fuel truck if fuel level is below company threshold.
5. **Complete post-trip DVIR:**
   - Document vehicle condition
   - Note any NEW defects found during the day
   - Flag urgent maintenance needs
   - Digital signature
6. Turn in any paper delivery tickets/weight tickets if not fully digital.
7. Review day summary in app: stops completed, miles, on-time %, exceptions.
8. Park truck in designated spot.
9. Tap "End Shift" in app. Clock out.

**Total: ~10 hours on duty, ~8-9 hours driving + on-duty not driving**

### 5.2 Contracted/External Driver -- Day Variant

The contracted driver's day differs in several ways:
- **Morning**: Checks their own app/system for assigned loads. May receive load tender the day before via email, TMS, or dedicated carrier portal.
- **Vehicle**: Uses their own truck. Pre-trip inspection is their own regulatory responsibility (but must be documented).
- **Loading**: Arrives at HyperQuote warehouse at assigned pickup time. Warehouse loads per the plan; driver verifies and secures.
- **Route**: Follows the assigned stop sequence. Communicates with HyperQuote dispatch via the carrier/driver app (not the internal driver app -- a separate portal or integration).
- **POD**: Captures POD using HyperQuote's driver app or their own system that integrates. POD data must flow back to HyperQuote.
- **End of day**: Returns to their own base. Submits BOL/POD documentation. Invoice follows per payment terms.
- **HOS/ELD**: Uses their own ELD system. HyperQuote may request ELD data for compliance verification.

### 5.3 On-Demand/Gig Driver -- Delivery Variant

Much simpler workflow:
1. **Availability**: Driver marks themselves as "Active" on platform (e.g., Curri app).
2. **Offer**: Receives push notification of available delivery near their location.
3. **Claim**: Opens app, reviews offer (pickup location, drop-off area, vehicle requirement, pay).
4. **Assignment**: Platform selects from claiming drivers (not guaranteed even if claimed).
5. **Pickup**: Navigates to HyperQuote warehouse/branch. Loads materials (for light loads, may self-load; for heavier, warehouse assists).
6. **Delivery**: Drives to site. Unloads (manual/tailgate). Takes photos, gets signature if possible.
7. **Completion**: Marks delivery complete in platform app. Payment credited immediately (within 15 minutes on Curri).
8. **No return**: Goes back to waiting for next offer or continues other gig work.

---

## 6. Dispatch Assignment Logic

### 6.1 Assignment Decision Framework

When an order is ready for delivery, the dispatcher (or automated dispatch system) evaluates the following factors in priority order:

**Tier 1 -- Hard Constraints (Must Match):**
| Factor | Logic |
|--------|-------|
| Vehicle type | Load requires flatbed? Boom? Moffett? Only assign drivers with that equipment. |
| CDL status | Load over 26,001 lbs? Driver must have CDL Class A or B as appropriate. |
| Equipment certification | Boom delivery requires NCCCO-certified operator. Moffett requires forklift certification. |
| Load weight | Does the load fit within the vehicle's remaining capacity? |
| HOS availability | Does the driver have enough drive time and duty time remaining to complete this delivery? |
| Vehicle capacity | Will the order physically fit on the truck (volume, dimensions, weight)? |
| Delivery window | Can the driver reach the site within the customer's requested time window? |

**Tier 2 -- Optimization Factors (Weighted Scoring):**
| Factor | Weight | Logic |
|--------|--------|-------|
| Proximity to pickup | High | Closer driver = faster loading = earlier departure |
| Route efficiency | High | How well does this delivery fit into the driver's existing route? (Minimize deadhead miles) |
| Customer preference | Medium | Some customers request specific drivers who know their sites |
| Driver familiarity with area | Medium | Drivers who know the route/site are faster and less error-prone |
| Driver skill level | Medium | Experienced drivers for complex sites; newer drivers for straightforward deliveries |
| Vehicle age/condition | Low | Newer/better-maintained trucks for high-value customers |
| Driver performance rating | Medium | Higher-rated drivers for priority customers |
| Fairness/rotation | Low | Distribute work equitably among the driver pool over time |

**Tier 3 -- Business Rules:**
| Rule | Logic |
|------|-------|
| Same-truck loading | Orders going to nearby sites should be on the same truck (multi-stop optimization) |
| Loading sequence | Last delivery loaded first (LIFO). Route must be planned before loading begins. |
| Time window clustering | Group deliveries with similar time windows in the same area |
| Return-to-base time | Route must allow driver to return to yard within their shift |
| Material compatibility | Some materials cannot share a truck (e.g., finished cabinets and dusty concrete bags) |

### 6.2 Assignment Logic by Driver Type

**For Internal Drivers:**
- Dispatch has full control: assigns driver, route, sequence
- Optimized for maximum stops per truck per day
- Driver can see the route but cannot reject assignments (may flag issues)
- Route changes require dispatch approval (or are pushed by dispatch)
- Assignment happens the afternoon before (during day-before planning) with morning adjustments

**For Contracted Drivers:**
- Load tender sent to carrier (electronically via TMS, email, or carrier portal)
- Carrier confirms acceptance (or declines within a timeframe)
- Price pre-negotiated per contract rate
- Dispatch has less control over HOW the delivery happens, more control over WHEN and WHERE
- Backup plan needed if carrier declines or cancels

**For On-Demand Drivers:**
- Delivery posted to platform (Curri, GoShare)
- Platform's algorithm matches available drivers based on proximity, vehicle type, rating
- HyperQuote has no control over which specific driver is assigned
- Platform provides tracking and POD
- Used when no internal or contracted capacity is available, or for light/urgent loads

### 6.3 Automated Dispatch Logic (How Software Should Work)

```
INPUT: Orders ready for delivery (with: items, weight, dimensions, destination, time window, unloading method)
INPUT: Available drivers (with: CDL class, certifications, current location, remaining HOS, vehicle type, capacity)
INPUT: Available vehicles (with: type, capacity, current load, maintenance status)

STEP 1 -- FEASIBILITY FILTERING:
  For each order:
    Eliminate drivers who CANNOT serve this order (wrong vehicle type, no CDL, HOS exhausted, vehicle at capacity)
    Result: set of FEASIBLE driver-order pairs

STEP 2 -- ROUTE BUILDING (VRP SOLVER):
  Using VROOM + OSRM (or equivalent):
    Group orders into routes that minimize total distance/time
    Constraints: vehicle capacity (weight AND volume), delivery windows, driver shift hours, equipment skills
    Output: optimal assignment of orders to drivers with stop sequence

STEP 3 -- HUMAN REVIEW:
  Dispatcher reviews proposed routes on dashboard
  Can override: reassign orders, change sequence, add/remove stops
  System warns if override violates constraints (overweight, late delivery, HOS violation)

STEP 4 -- DRIVER NOTIFICATION:
  Push route to driver app
  Driver acknowledges receipt
  Loading team receives load plan per truck

STEP 5 -- REAL-TIME ADJUSTMENT:
  Throughout the day: monitor progress vs. plan
  Auto-reoptimize when: driver ahead/behind schedule, new urgent order comes in, stop cancelled, driver calls in sick
  Dispatcher approves or manually adjusts
```

---

## 7. Loading and Departure Workflow

### 7.1 What Happens at the Warehouse Before Departure

**T-1 (Afternoon Before):**
1. Dispatch finalizes next-day routes and load plans by 4:00-5:00 PM.
2. Load plans sent to warehouse: which orders go on which truck, in what sequence.
3. Warehouse team begins picking and staging orders in the yard or on loading docks.
4. Heavy/oversized items staged with appropriate material handling equipment (overhead crane for steel, forklift for pallets).

**Morning Of (5:00-6:30 AM):**
1. Dispatcher verifies product availability (no overnight stockouts).
2. Warehouse team stages loads by truck assignment.
3. Driver arrives, completes pre-trip inspection.
4. Driver drives truck to assigned loading position.

### 7.2 Who Loads the Truck?

**Warehouse team loads the truck in nearly all building materials operations.** The driver typically does NOT do the physical loading. This is because:
- Loading requires warehouse forklifts, overhead cranes, or specialized dock equipment
- Warehouse workers are trained on specific material handling procedures
- Loading sequence (LIFO) must be planned and executed carefully
- Driver's time loading is wasted time -- they should be driving

**Driver's role during loading:**
- Present at the truck to observe loading
- Verify correct items are being loaded (check SKUs, counts, condition)
- Direct placement for weight distribution (heavy items over axles, balanced side-to-side)
- Flag any visible damage to items
- Perform cargo securement once loading is complete (straps, chains, binders, edge protectors, tarps)

**Exception:** For small will-call orders at branch counters, the driver may self-load (hand-load small items from the will-call staging area).

### 7.3 Weight Verification

**Methods:**
- **Scale ticket**: Truck weighed on certified platform scale before and after loading. Net weight = loaded weight minus empty weight. Required for bulk materials (aggregate, sand, concrete). Scale tickets serve as legal documentation.
- **Calculated weight**: Items weighed per unit at receiving. Total weight calculated from manifest quantities. Used for standard palletized goods (lumber, drywall, cement bags).
- **Onboard scales**: Some trucks (particularly dump trucks and concrete mixers) have onboard weighing systems. Real-time weight display for driver.

**Critical Checks:**
- Total weight must not exceed truck's GVWR (Gross Vehicle Weight Rating)
- Axle weights must not exceed individual axle ratings
- Total weight must comply with state/local bridge and road weight limits
- Overweight vehicles face fines of $1,000-$10,000+ and are placed Out of Service

### 7.4 Load Securing (DOT/FMCSA Requirements)

**49 CFR Part 393, Subpart I -- Protection Against Shifting and Falling Cargo**

**General Performance Criteria -- The securement system must withstand:**
- **0.8g deceleration** in the forward direction (emergency braking)
- **0.5g acceleration** in the rearward direction
- **0.5g acceleration** laterally (side-to-side)

**Tiedown Minimums by Size:**
| Cargo Dimensions | Minimum Tiedowns |
|-----------------|------------------|
| 5 feet or shorter, under 1,100 lbs | 1 tiedown |
| 5 feet or shorter, over 1,100 lbs | 2 tiedowns |
| Over 5 feet, up to 10 feet | 2 tiedowns |
| Over 10 feet | 2 tiedowns + 1 additional per each additional 10 feet (or fraction) |

**Working Load Limit (WLL):**
- Aggregate WLL of all securement devices must equal at least **50% of cargo weight**
- Direct tiedowns: count full WLL value
- Indirect tiedowns (over-the-top): count only 50% of WLL value

**Common Tiedown Specifications:**
| Device | Working Load Limit | Common Use |
|--------|-------------------|------------|
| 4" ratchet strap | 5,400 lbs | Lumber bundles, drywall, lighter materials |
| 3/8" Grade 70 chain | 6,600 lbs | Steel, heavy equipment, concrete products |
| 1/2" Grade 70 chain | 11,300 lbs | Very heavy loads |
| 2" ratchet strap | 3,300 lbs | Lighter, smaller items |
| Wire rope (3/8") | 4,200 lbs | Logs, pipe bundles |

**Edge Protection Required:**
- Whenever a tiedown contacts the edge of cargo where it could be cut or abraded
- Must resist abrasion, cutting, and crushing
- Rubber, leather, or plastic edge guards placed at contact points

**Commodity-Specific Rules:**

*Dressed Lumber and Building Products (49 CFR 393.118):*
- Applies to bundles of dressed lumber, packaged lumber, plywood, gypsum board, similar materials
- Two tiedowns for bundles stacked one layer high
- Add two additional tiedowns for each additional tier of stacked bundles
- Lumber in sided vehicles must be blocked/braced to prevent forward movement

*Metal Coils (if transporting rebar coils):*
- Specific requirements based on coil orientation (eye to sky, eye forward, eye to side)
- Heavier coils require 4+ tiedowns with specific placement

*Concrete Pipe:*
- Must be cradled and blocked against forward and sideways movement
- Wedges or chocks between pipes in each layer

*Large Boulders/Landscape Stone:*
- Each boulder must be individually secured
- Minimum of two tiedowns per boulder if over certain weight

### 7.5 Pre-Departure Checklist (Digital)

Before the driver taps "Ready to Depart" in the app, these items must be confirmed:

- [ ] Pre-trip DVIR completed and submitted
- [ ] All orders verified against manifest (scan or manual check)
- [ ] Load secured per FMCSA requirements
- [ ] Weight within GVWR limits
- [ ] Cargo securement photo taken
- [ ] Departure photo of loaded truck taken
- [ ] All delivery tickets/BOLs accounted for (if paper)
- [ ] Route reviewed -- delivery windows, access instructions, special notes
- [ ] Communication devices charged and functional (phone/tablet)
- [ ] PPE in cab (hard hat, safety vest, steel-toed boots, gloves, safety glasses)
- [ ] Securement equipment adequate for remaining stops (extra straps, binders, edge protectors)
- [ ] Scale ticket attached (for bulk materials)
- [ ] ELD connected and logging (if required)

---

## 8. On-Site Delivery Workflow

### 8.1 Arrival Protocol

1. **Approach**: Navigation guides driver to site. App displays site access instructions at 500m geofence trigger.
2. **Contact**: Call site contact person: "This is [Driver Name] from [Company]. I'm arriving with your delivery. Where should I come in?"
3. **Entry**: Follow site-specific entry instructions (gate code, specific entrance, sign-in at security checkpoint).
4. **Check-in**: At some larger commercial sites, driver must:
   - Sign in at the site office
   - Complete a site safety orientation (first visit only)
   - Receive a visitor badge
   - Be escorted to the unloading area
5. **PPE**: Don required PPE before exiting the cab at the construction site:
   - Hard hat (ANSI Z89.1 compliant) -- required at most active construction sites
   - High-visibility safety vest (ANSI/ISEA 107 Class 2 or 3)
   - Steel-toed boots (ASTM F2413)
   - Safety glasses (as required)
   - Gloves (for handling materials)
   - As of January 13, 2025: OSHA requires PPE to properly fit each individual worker

### 8.2 Site Safety Assessment

Before unloading, the driver must visually assess:

| Hazard | Action |
|--------|--------|
| Overhead power lines | Must maintain 10+ feet clearance for boom operations. If lines are within boom reach, DO NOT operate boom -- contact dispatch. |
| Soft/unstable ground | Test ground firmness before deploying Moffett or outriggers. Mud season in spring is a major concern. Use stabilizer pads under outriggers. |
| Open excavations | Stay clear of trench edges. Position truck on solid ground. |
| Other equipment operating | Coordinate with site foreman to ensure clear working area. |
| Overhead loads from cranes | Never position under an active crane lift. |
| Pedestrian traffic | Ensure clear zone around unloading area. Use traffic cones/spotters as needed. |
| Slope/grade | Set parking brake, chock wheels on slopes. Moffett and boom operations require level ground. |
| Vehicle traffic pattern | Understand the site traffic flow. Back in (do not back over area you did not visually confirm). |

### 8.3 Unloading by Material Type

**Lumber (Bundles, Engineered Wood):**
- Vehicle: Flatbed + Moffett (most common)
- Process: Moffett lifts each bundle, places at designated location. Stack no higher than customer requests. Place dunnage between layers for moisture protection.
- Typical unload time: 20-40 minutes for a full truck
- Hazards: Shifting bundles, band breakage, splinters, heavy weight

**Roofing (Shingles, Underlayment):**
- Vehicle: Boom truck or conveyor
- Process: Boom lifts bundles directly to roof. Site crew guides placement. Shingles distributed evenly across roof surface per load capacity.
- Typical unload time: 30-60 minutes
- Hazards: Wind (max 20-30 mph for boom), falling materials, power lines

**Steel (Beams, Rebar, Studs):**
- Vehicle: Flatbed with site crane or Moffett
- Process: Crane lifts steel from truck, places at stockpile location. Rebar bundles placed with Moffett.
- Typical unload time: 20-40 minutes
- Hazards: Sharp edges (cut-resistant gloves), heavy weight, pinch points

**Cement/Concrete Products (Bagged):**
- Vehicle: Flatbed + Moffett (palletized) or box truck + liftgate
- Process: Moffett places pallets. For hand-unloading, 80-lb bags require two-person lift or mechanical assistance.
- Typical unload time: 15-30 minutes (palletized), longer for hand-unload

**Drywall/Gypsum Board:**
- Vehicle: Boom truck (for multi-story) or Flatbed + Moffett (ground floor)
- Process: Boom lifts drywall stacks through windows or to upper floors. Careful handling -- drywall is fragile.
- Typical unload time: 30-60 minutes
- Hazards: Breakage (damaged edges), heavy weight per sheet

**Aggregate (Sand, Gravel, Crushed Stone):**
- Vehicle: Dump truck or semi + dump trailer
- Process: Driver operates hydraulic dump bed to pour material at designated location.
- Typical unload time: 5-15 minutes
- Hazards: Truck tipping on uneven ground, material slide-back

### 8.4 What If No One Is There to Receive?

**Standard Protocol:**
1. Call the site contact number (provided in the order/app).
2. If no answer, call a second contact if available.
3. Call dispatch to notify of the situation.
4. Wait 15-20 minutes (company policy dictates exact wait time).
5. If still no one:
   - **Option A (with pre-authorization)**: Customer has authorized unattended delivery. Driver unloads materials at the designated location, takes photos of placement, and marks POD as "unattended delivery -- pre-authorized."
   - **Option B (without pre-authorization)**: Driver cannot leave materials without a signature. Mark delivery as "Failed -- No Receiver." Return materials to warehouse or proceed to next stop and return later.
6. Document everything: photos of the empty/locked site, call logs, wait time.

### 8.5 What If the Site Is Not Ready?

- Concrete slab not poured, framing not complete, previous trade still in the way.
- Extremely common -- construction schedules shift constantly.
- Driver contacts dispatch. Dispatch contacts customer.
- Options:
  1. Place materials elsewhere on site (if space available and customer agrees)
  2. Come back later today (if route allows)
  3. Reschedule for another day
- Cost of a failed delivery: **$150-$400+** (driver time, fuel, lost route capacity)

### 8.6 What If Site Access Is Blocked?

- Gate locked (no code or wrong code), road too narrow, bridge weight limit, mud/flooding blocking entrance.
- Driver takes photos of the obstruction.
- Calls site contact and dispatch.
- If resolvable (e.g., customer sends someone to open gate): wait a reasonable time.
- If not resolvable: mark as failed, document, move to next stop.

---

## 9. Proof of Delivery -- Legal Requirements

### 9.1 What Constitutes Legally Valid POD

Building materials POD is more complex than parcel delivery due to bulk, weight, high value, and precise placement requirements.

**Essential Components (Minimum for Legal Standing):**

| Component | Legal Basis | How Captured |
|-----------|------------|-------------|
| **Signature** | UCC Article 2, contract law | Electronic signature on driver's device |
| **Name and title of signer** | Establishes authority to receive | Printed name + role (Foreman, PM, etc.) |
| **Date and time of delivery** | Establishes when risk transferred | Auto-recorded by app (GPS timestamp) |
| **Itemized delivery receipt** | Proves WHAT was delivered | Digital manifest with quantities confirmed |
| **Condition notes** | Establishes condition at delivery | Notes field + photos before/during delivery |

**Increasingly Standard (ePOD, Strongly Recommended):**

| Component | Value | How Captured |
|-----------|-------|-------------|
| **GPS coordinates** | Proves truck was at the correct site | Auto-recorded by device GPS |
| **Geo-stamped photos** | Shows materials at placement location | Camera with GPS + timestamp metadata |
| **Barcode/QR scan** | Links physical delivery to digital order | Camera-based scanning |
| **Weight ticket** | Proves weight delivered (bulk materials) | Scale ticket photo or manual entry |
| **Tally sheet** | Proves piece count (lumber, steel) | Digital count confirmation |
| **Placement confirmation** | Proves WHERE materials were placed on site | Photos + notes ("Lumber stacked at SE corner of lot") |

### 9.2 Legal Framework

**E-SIGN Act (Federal):**
- Electronic signatures are legally valid for commercial transactions in the United States
- Electronic POD has the same legal standing as paper POD
- No requirement for wet-ink signatures

**UETA (Uniform Electronic Transactions Act, State Level):**
- Adopted by 47 states + DC + US Virgin Islands
- Reinforces validity of electronic records and signatures

**UCC Article 2 (Uniform Commercial Code):**
- Risk of loss transfers from seller to buyer upon delivery (unless otherwise agreed in the sales contract)
- POD documents this transfer of risk
- If the buyer accepted the goods (signed the POD), they own the risk unless damage was noted at delivery

**Carmack Amendment (Interstate Shipments):**
- For shipments moving between states, the Bill of Lading (BOL) is the primary legal document
- Carrier liability is governed by the BOL terms
- POD supplements the BOL as evidence of delivery

**Mechanic's Lien Rights:**
- In many states, building materials suppliers have mechanic's lien rights on the property where materials were delivered
- POD (proving delivery to the specific job site) is **essential evidence** for enforcing a lien
- A geo-stamped photo proving the materials arrived at THAT specific address is powerful lien evidence
- Lien filing typically requires proof of delivery within a specific timeframe

### 9.3 POD for Partial Deliveries

- Each partial delivery must have its own complete POD
- POD must clearly itemize WHAT was delivered (and what was NOT)
- Remaining items tracked with expected dates
- Customer acknowledgment of partial delivery (signature)
- Each partial delivery is typically invoiced separately

### 9.4 POD for Disputed Deliveries

**"We Never Received This Delivery"**
- Counter with: GPS data (truck was at the site), electronic signature, geo-tagged photos of materials at site
- This is why GPS + photos + signature are all critical

**"Wrong Quantity Delivered"**
- Counter with: tally sheet signed by receiver, warehouse load-out records, barcode scans
- Driver and receiver should count together at delivery

**"Materials Were Damaged on Arrival"**
- If NOT noted on POD at delivery: presumption is goods were delivered in good condition
- If noted: damage documented with photos, noted on POD before signature
- This is why the driver must photograph condition BEFORE the receiver signs

**"Materials Placed in Wrong Location"**
- Counter with: GPS-tagged placement photos, notes confirming placement direction from site contact

### 9.5 Retention Requirements

- Delivery records should be retained for **3-7 years** minimum
- Depends on state statutes of limitation for contract disputes (typically 4-6 years)
- Mechanic's lien statutes vary by state but typically require proof of delivery within 60-90 days of last delivery
- Best practice: retain indefinitely in digital storage (costs nearly nothing)

---

## 10. Driver Safety and Compliance

### 10.1 Hours of Service (HOS) Rules

**Property-Carrying CMV Drivers (Building Materials):**

| Rule | Limit | Details |
|------|-------|---------|
| **11-Hour Driving Limit** | 11 hours | Maximum driving time after 10 consecutive hours off-duty |
| **14-Hour Duty Window** | 14 hours | Cannot drive beyond the 14th consecutive hour after coming on duty. **This clock does NOT stop** -- breaks do not pause it. |
| **30-Minute Break** | After 8 hours driving | Must take a 30-minute break (off-duty or sleeper berth) before driving again after accumulating 8 hours of driving time |
| **60/70-Hour Weekly Limit** | 60 hours in 7 days OR 70 hours in 8 days | Cannot drive after reaching the weekly limit. Choice depends on whether carrier operates 7 days/week. |
| **34-Hour Restart** | 34 consecutive hours off | Resets the weekly clock. Must include two periods between 1:00 AM and 5:00 AM. |
| **10-Hour Off-Duty** | 10 consecutive hours | Required before starting a new driving period |

**Short-Haul Exemption (150 Air-Mile Radius) -- Critical for Building Materials:**
Most building materials delivery drivers qualify for this exemption:
- Must operate within **150 air-miles** (approximately 172 road miles) of work reporting location
- Must start and end shift at the same location
- Must complete duty within 14 consecutive hours
- **No ELD required** under this exemption
- **No 30-minute break required** under this exemption
- Employer must maintain time records (start time, end time, total hours) for 6 months
- If driver exceeds exemption more than **8 days in any 30-day period**, ELD IS required

**HOS Violation Penalties:**
- A single HOS violation can cost a carrier up to **$19,246** (2025)
- Over 100,000 HOS violations are issued annually across the US
- Driver placed Out of Service (cannot drive) until compliant
- Repeated violations affect carrier's CSA score and insurance rates

### 10.2 ELD Requirements

**Who Must Use an ELD:**
- All CMV drivers required to keep Records of Duty Status (RODS) -- generally anyone operating a vehicle over 10,001 lbs GVWR in interstate commerce
- EXCEPT: drivers qualifying for the short-haul exemption (see above)
- EXCEPT: drivers using paper logs for 8 or fewer days in any 30-day period
- EXCEPT: vehicles with engine model year 1999 or older

**ELD Functionality Required:**
- Automatically records driving time when vehicle is in motion
- Connects to vehicle's Engine Control Module (ECM)
- Records: date, time, location, engine hours, vehicle miles, driver identification
- Allows driver to edit/annotate records (with reason noted)
- Supports data transfer to enforcement officers (via Bluetooth, USB, or email)

**Leading ELD Providers for Building Materials:**
| Provider | Cost | Notes |
|----------|------|-------|
| Samsara | $25-$40/vehicle/month | Integrated ELD + GPS + dashcam + maintenance |
| Motive (KeepTruckin) | $25-$35/vehicle/month | Clean interface, AI dashcams |
| Geotab | $25-$35/vehicle/month | Deep analytics, open API |
| FleetUp | $20-$30/vehicle/month | Compliance-focused |

### 10.3 Pre-Trip and Post-Trip Inspections (DVIR)

**FMCSA Requirement (49 CFR 396.11 and 396.13):**
- Drivers of CMVs over 10,000 lbs GVWR must complete a DVIR at the end of each driving day
- Pre-trip inspection before driving is best practice and company policy (even if not explicitly mandated in the same way, the driver is responsible for operating a safe vehicle)
- As of 2025: FMCSA proposed rule (docket FMCSA-2025-0115) explicitly authorizing electronic DVIRs (eDVIRs)

**What Must Be Inspected:**
- Service brakes, parking brake, steering mechanism
- Lighting devices and reflectors
- Tires
- Horn
- Windshield wipers
- Rear vision mirrors
- Coupling devices
- Wheels and rims
- Emergency equipment (fire extinguisher, reflective triangles)
- For tractor-trailers: fifth wheel, kingpin, air lines, landing gear

**Penalties for Non-Compliance:**
- Missing or incomplete DVIR: up to **$1,270 per day** fine
- Falsifying, destroying, or altering a DVIR: up to **$12,695** fine
- Vehicle with critical safety defects placed Out of Service

### 10.4 Cargo Securement Standards (FMCSA 393.100-136)

*Detailed in Section 7.4 above.*

**Inspection Frequency:**
- Initial inspection: **within first 50 miles** after loading
- Subsequent inspections: every **3 hours of driving** or **150 miles**, whichever comes first
- After any change in duty status
- After the vehicle has been unloaded (for remaining cargo)

**Violations:**
- Improper cargo securement is one of the most common roadside inspection violations
- Can result in Out of Service order (vehicle cannot move until corrected)
- Fines range from $500-$16,000+ depending on severity
- Cargo spill incidents can result in civil liability for injuries/damage

### 10.5 Drug and Alcohol Testing

**FMCSA Drug & Alcohol Testing Program (49 CFR Part 382):**

| Test Type | When | Who |
|-----------|------|-----|
| Pre-employment | Before first safety-sensitive duty | All CDL driver applicants |
| Random | Unannounced throughout the year | 50% of CDL driver pool (drug), 10% (alcohol) |
| Post-accident | After qualifying accident | Driver involved |
| Reasonable suspicion | When supervisor observes signs | Any CDL driver |
| Return-to-duty | After positive test + SAP evaluation | Driver returning to duty |
| Follow-up | Minimum 6 tests in first year after RTD | Returning driver |

**Drug Panel (DOT 5-Panel):**
- Marijuana (THC)
- Cocaine
- Opiates (codeine, morphine, heroin, hydrocodone, hydromorphone, oxycodone, oxymorphone)
- Amphetamines (amphetamine, methamphetamine, MDMA, MDA)
- Phencyclidine (PCP)

**FMCSA Drug & Alcohol Clearinghouse:**
- Central database of CDL drivers with drug/alcohol violations
- **Mandatory** pre-employment full query before hiring any CDL driver
- Must obtain driver's electronic consent
- As of November 2024: "Prohibited" Clearinghouse status = CDL revocation/denial
- Annual limited query required for all current CDL employees
- Employers must report positive tests, refusals, and RTD results to the Clearinghouse

### 10.6 Construction Site Safety

**OSHA Requirements for Drivers at Construction Sites:**
- Drivers entering active construction sites are subject to site safety rules
- PPE requirements (OSHA 1926 Subpart E): hard hat, safety vest, steel-toed boots, safety glasses
- January 13, 2025 update: OSHA now explicitly requires PPE to properly fit each individual worker
- Drivers must be briefed on site-specific hazards
- Forklift/Moffett operation must comply with OSHA 1910.178 (powered industrial trucks)
- Boom/crane operation must comply with OSHA 1926 Subpart CC (cranes and derricks)

---

## 11. Driver Communication Flow

### 11.1 Communication Matrix

| Who Communicates | With Whom | Channel | When |
|-----------------|-----------|---------|------|
| Driver | Dispatch | In-app messaging (primary), phone call (urgent) | Route changes, exceptions, delays, ETAs, issues |
| Driver | Warehouse | In-app messaging, phone | Loading issues, return items, product questions |
| Driver | Customer/Site Contact | Phone call, in-app messaging | Arrival notification, access issues, placement questions |
| Dispatch | Driver | In-app push notification, messaging, phone | New assignments, route changes, cancellations, urgent messages |
| Dispatch | Customer | Automated SMS/email, phone | ETA notifications, delay alerts, delivery confirmation |
| System (automated) | Customer | SMS, email | "Driver assigned," "Driver en route," "X minutes away," "Delivered" |
| System (automated) | Driver | Push notification | Break reminder, HOS warning, new assignment, route change |

### 11.2 Communication Triggers

**Outbound from Driver:**
- Departing warehouse (auto or manual)
- Running late to a stop (manual)
- Arrived at delivery (auto via geofence)
- Cannot access site (manual)
- No one to receive (manual)
- Delivery complete (auto)
- Damage discovered (manual)
- Equipment malfunction (manual)
- Accident/safety incident (manual)
- Returning with undelivered items (manual)

**Inbound to Driver:**
- New delivery added to route (push)
- Delivery cancelled (push)
- Route resequenced (push)
- Customer message (push)
- Weather/safety alert (push)
- Break reminder at 7.5 hours driving (push)
- HOS approaching limit (push)
- Dispatch call request (push + ring)

### 11.3 Emergency Communication

**Accident Protocol:**
1. Ensure safety of all involved parties
2. Call 911 if injuries
3. Contact dispatch IMMEDIATELY via phone (not app)
4. Document scene with photos
5. Exchange information with other parties
6. Do NOT admit fault
7. Complete incident report in app when safe to do so
8. Dispatch notifies safety department, insurance, management

**Vehicle Breakdown:**
1. Move to safe location if possible
2. Activate hazard lights, set reflective triangles (100-500 feet behind vehicle per FMCSA)
3. Call dispatch
4. Dispatch coordinates: roadside assistance, replacement vehicle, customer notifications for affected deliveries

**Severe Weather:**
1. Driver uses judgment on safety
2. Contact dispatch for guidance
3. Pull over and wait if conditions are unsafe (high winds for boom operation, flooding, ice)
4. Dispatch notifies affected customers

### 11.4 Communication Best Practices

- **In-app messaging for routine updates** (keeps a record, doesn't interrupt)
- **Phone call for urgent/time-sensitive issues** (customer can't be reached, accident, safety)
- **Automated notifications for standard events** (departure, ETA, delivery complete)
- **Minimize phone use while driving** (use voice commands, pull over for extended communication)
- **Pre-defined quick messages** to reduce typing:
  - "On my way to stop #X"
  - "Running ~30 min late"
  - "Gate locked, cannot access"
  - "Delivery complete"
  - "Need dispatcher callback"

---

## 12. Driver Pay Models

### 12.1 Internal Driver (W2) Pay

**Pay Structures Used in Building Materials:**

| Pay Model | Range (2025-2026) | Best For | How It Works |
|-----------|-------------------|----------|-------------|
| **Hourly** | $22-$36/hour | Local delivery drivers, most common | Paid for all hours on duty (driving + loading + unloading + waiting) |
| **Hourly + Overtime** | Base + 1.5x after 40 hrs/week | Standard W2 | FLSA-compliant. Most building materials drivers work 45-55 hours/week so OT is significant. |
| **Daily/Shift Rate** | $180-$350/day | Some flatbed operations | Fixed per-shift rate regardless of hours (must still comply with minimum wage for hours worked) |

**Market Rates by Position (2025-2026):**

| Position | Hourly Rate | Annual (50 weeks) | Notes |
|----------|-------------|-------------------|-------|
| Non-CDL delivery driver (box truck, pickup) | $18-$25/hour | $37,000-$52,000 | Entry level; lighter loads |
| CDL Class B driver (straight truck, boom) | $24-$32/hour | $50,000-$67,000 | Mid-level; standard building materials |
| CDL Class A driver (tractor-trailer) | $26-$36/hour | $54,000-$75,000 | Senior; heavy/long-haul |
| Boom truck operator (CDL + crane cert) | $28-$38/hour | $58,000-$79,000 | Specialized; NCCCO certification premium |
| Moffett-certified driver | $25-$34/hour | $52,000-$71,000 | Forklift certification premium |
| Lead driver / trainer | $30-$40/hour | $62,000-$83,000 | Experienced; mentors new drivers |

*Note: Foundation Building Materials pays an average of ~$22.17/hour for truck drivers (below national average). Mobile Lumber & Building Materials pays ~$16.74/hour for delivery drivers. Top-tier distributors like ABC Supply and Builders FirstSource pay above market to attract specialized talent.*

**Benefits Package (Typical for W2 Drivers):**
- Health insurance (medical, dental, vision): company pays 50-80% of premiums
- 401(k) with 3-6% company match
- Paid time off: 10-15 days/year
- Paid holidays: 6-8 days
- Life insurance and disability
- Signing bonus: $1,000-$5,000 for experienced CDL holders
- CDL training reimbursement (if company-sponsored)
- Uniform/boot allowance: $200-$500/year
- Total compensation premium over base wages: 25-35%

**With Full Benefits, All-In Cost Per Driver:**
- Base wages (50 weeks x 50 hours avg x $28/hour avg including OT): ~$70,000
- Benefits (health, retirement, PTO, taxes, workers comp): ~$18,000-$25,000
- **Total cost per driver: $88,000-$95,000/year**

### 12.2 Contracted Driver Pay

**Pay Structures:**

| Model | Rate | When Used |
|-------|------|-----------|
| **Per mile** | $2.50-$3.50/mile (all-in, including truck) | Long-haul transfers, branch-to-branch |
| **Per delivery** | $150-$500 per stop | Local delivery assignments |
| **Per ton** | $5-$15/ton | Bulk materials (aggregate, sand) |
| **Hourly (with truck)** | $65-$120/hour | Dedicated daily assignments |
| **Daily rate (with truck)** | $500-$1,200/day | Full-day dedicated service |

**Payment Terms:**
- Net-15 to Net-30 (standard carrier payment terms)
- Quick pay option: Net-7 or same-week for 1-3% fee (important for retaining carriers)
- Factor/broker pay: some small carriers use factoring companies for same-day payment

**Contracted vs. Internal Cost Comparison:**
- Contracted flatbed: $2.53-$3.07/mile (spot) or $2.20-$2.80/mile (contract)
- Internal flatbed: $1.77-$2.90/mile (all-in including driver, truck, fuel, insurance, maintenance)
- **Internal is cheaper per mile BUT has fixed costs** (you pay even when truck sits idle)
- **Contracted is more expensive per mile BUT fully variable** (you only pay when you use it)
- Breakeven: typically when a truck runs 200+ miles/day, 5 days/week, internal fleet is cheaper

### 12.3 On-Demand/Gig Driver Pay

**Curri:**
- Per-delivery payment based on distance, load size, vehicle type, and urgency
- Route drivers (dedicated routes): $28/hour base + $37.50/hour overtime, with $224/day guarantee
- Per-delivery drivers: paid within 15 minutes of delivery completion
- No tip model -- base pay is the full pay
- Average offer: ~$66 per delivery (but actual hourly rate after expenses may be lower at ~$9-$15/hour net for drivers)

**GoShare:**
- Per-delivery pricing based on time, distance, and vehicle type
- Pickup truck: lower rate
- Cargo van: mid-rate
- Box truck: higher rate
- Drivers paid via platform after delivery completion

**What HyperQuote Pays the Platform (Not the Driver):**
- Platform pricing is a markup over driver pay
- Typical: 30-50% markup over driver earnings
- Example: Driver earns $66, HyperQuote may pay $90-$130 for the delivery
- No minimum volume or subscription (pay-as-you-go)

---

## 13. External/Contracted Driver Management

### 13.1 Onboarding External Carriers

**Required Documentation:**

| Document | Purpose | Verification |
|----------|---------|-------------|
| USDOT Number | Federal operating authority | Verify on FMCSA SAFER website |
| MC/MX Number | Motor carrier authority | Verify active status |
| Certificate of Insurance (COI) | Liability and cargo coverage | Verify limits ($1M liability, $100K+ cargo), verify policy is active with insurance company |
| W-9 | Tax identification | For 1099 reporting |
| Carrier agreement | Legal terms, rates, indemnification | Signed by authorized representative |
| Equipment list | Vehicles available for use | Verify adequate equipment for load types |
| Driver list | Drivers who will operate | Verify CDL, medical cards, Clearinghouse status |
| Safety rating | FMCSA Satisfactory/Conditional/Unsatisfactory | Do not use carriers with "Unsatisfactory" rating |
| CSA BASIC scores | Safety performance percentiles | Review all 7 BASICs; avoid carriers with high percentiles |

### 13.2 Ongoing Insurance Monitoring

**Insurance expires. Safety ratings change. This requires continuous monitoring.**

- Use automated insurance monitoring platforms:
  - **Carrier411**: Safety ratings, insurance status, authority monitoring
  - **CarrierAssure**: Predictive A-F safety scores, real-time data
  - **Truckstop Carrier Monitoring**: Continuous monitoring of insurance, authority, and safety changes
  - **Evident (by EverView)**: Automated COI collection and verification, continuous insurance monitoring
  - **Descartes**: Carrier compliance and verification platform

- Set automated alerts for:
  - Insurance policy expiration (30-day warning)
  - Insurance policy cancellation
  - Change in safety rating (conditional/unsatisfactory)
  - Change in operating authority status
  - CSA BASIC score increase above threshold
  - New Out of Service violations

- **Quarterly review** of all contracted carriers' compliance status
- **Annual re-certification** with updated COI, driver lists, equipment lists

### 13.3 Performance Rating System

**Key Performance Indicators (KPIs) for Contracted Drivers:**

| KPI | Target | Measurement |
|-----|--------|-------------|
| On-Time Delivery Rate | 95%+ | Delivery within promised window |
| POD Completion Rate | 100% | All required POD elements captured |
| Damage Rate | <1% of deliveries | Claims filed per deliveries made |
| Customer Satisfaction Score | 4.5+/5.0 | Customer rating after delivery |
| Acceptance Rate | 90%+ | Loads accepted vs. loads tendered |
| Cancellation Rate | <2% | Load cancellations after acceptance |
| Communication Responsiveness | <15 min response | Time to respond to dispatch messages |
| Safety Compliance | 100% | No safety violations, proper PPE, proper securement |

**Rating Tiers:**
| Tier | Score | Privileges |
|------|-------|-----------|
| Preferred | 4.5+/5.0 | First access to loads, best rates, long-term contracts |
| Standard | 3.5-4.4 | Regular load access, standard rates |
| Probationary | 2.5-3.4 | Reduced load access, performance improvement plan |
| Suspended | <2.5 | No loads until review and remediation |

### 13.4 Damage and Liability

**When an External Driver Damages Goods:**

1. **Discovery**: Damage discovered at delivery by receiver, or in transit by driver.
2. **Documentation**: Photos, notes, condition report in the system. Both driver and receiver document.
3. **Notification**: Dispatch, carrier, and claims team notified immediately.
4. **Claim Process**:
   - File freight claim with the carrier (or their insurance)
   - Under the Carmack Amendment (interstate): carrier is liable for full value of damaged goods unless they can prove one of 5 common-law defenses (act of God, public enemy, shipper's fault, public authority, inherent nature of goods)
   - Carrier's cargo insurance covers the claim (typically $100,000-$500,000 per occurrence)
   - If claim exceeds cargo insurance: carrier is personally liable for the balance
5. **Resolution Timeline**: 30 days to acknowledge claim, 120 days to resolve (per FMCSA guidelines)
6. **Impact on Rating**: Damage incidents reduce the carrier's performance score

**Liability Chain:**
- **Carrier (the contracted entity)** is primarily liable for goods in their possession
- **Driver (if owner-operator)** may be personally liable if operating under their own authority
- **HyperQuote (as shipper/broker)** may have secondary liability depending on contractual terms
- **Insurance coverage flows**: Carrier's cargo insurance -> Carrier's assets -> HyperQuote's contingent cargo policy (if applicable)

### 13.5 Managing On-Demand Platform Drivers

On-demand drivers (Curri, GoShare) are managed through the platform, not directly:

| Aspect | How It Works |
|--------|-------------|
| Assignment | Platform algorithm matches driver to delivery |
| Tracking | Platform provides real-time GPS tracking |
| POD | Captured through platform app (photos, basic signature) |
| Communication | Through platform messaging/calling |
| Performance | Platform maintains driver rating; you rate after each delivery |
| Insurance | Platform provides coverage (supplemental to driver's personal insurance) |
| Damage claims | Filed through the platform; platform mediates |
| Quality control | Limited -- you cannot train or instruct platform drivers |
| Branding | Driver does NOT represent your company brand |

---

## 14. Returns and Failed Deliveries

### 14.1 Types of Failed Deliveries

| Failure Type | Frequency | Cause | Driver Action |
|-------------|-----------|-------|---------------|
| Site not ready | Very common | Construction schedule shifted | Contact dispatch; reschedule or find alternate placement |
| No one to receive | Common | Miscommunication, schedule change | Wait 15-20 min, call contacts, mark failed if unresolved |
| Customer refuses | Occasional | Wrong product, quality dispute, order change | Document refusal with reason code and photos; return to warehouse |
| Access blocked | Occasional | Gate locked, road impassable, permit issue | Photo document, attempt alternate access, mark failed |
| Wrong address | Rare | Data entry error at order entry | Contact dispatch for correct address; redirect if feasible |
| Weather | Seasonal | Rain (mud), wind (boom), snow/ice (roads) | Safety first; dispatcher bulk-reschedules affected routes |
| Overweight/access restriction | Rare | Bridge weight limit, low clearance | Dispatch reroutes or reschedules with smaller vehicle |

### 14.2 Failed Delivery Protocol

```
STEP 1: DOCUMENT
  - Reason code (select from predefined list in app)
  - Photos of the situation (locked gate, empty site, blocked road)
  - Notes (who was called, what was said, how long waited)
  - GPS timestamp proving driver was at the location

STEP 2: COMMUNICATE
  - Notify dispatch immediately via app + phone call if urgent
  - Dispatch contacts customer to discuss resolution
  - Dispatch logs the exception in the order management system

STEP 3: DECIDE (Dispatch + Customer)
  - Option A: Attempt later today (if route allows, driver reroutes)
  - Option B: Reschedule for specific date/time
  - Option C: Customer cancels delivery entirely

STEP 4: HANDLE MATERIALS
  - If materials can stay on truck for a later attempt: continue route
  - If materials must return to warehouse: driver returns them at end of route
  - Returned materials logged at warehouse receiving dock with reason codes

STEP 5: COST ALLOCATION
  - Supplier-caused failure (wrong product, damage): supplier absorbs cost
  - Customer-caused failure (not ready, refused, wrong address given by customer): customer may be charged a re-delivery fee
  - Driver/carrier-caused failure (late, wrong site): carrier absorbs cost
  - Typical re-delivery fee: $75-$250 depending on distance and load size
```

### 14.3 Return-to-Warehouse Process

1. Driver marks items as "Returned" in app with reason code per item.
2. Driver brings materials back to yard (at end of route or immediately if perishable/time-sensitive).
3. At warehouse: receiving team inspects returned materials for damage.
4. Materials either:
   - Returned to inventory (if undamaged and repackaged)
   - Flagged for damage/quality review
   - Placed in returns holding area for customer dispute resolution
5. Order management system updated: delivery status = "Failed/Returned," reason recorded.
6. Customer service contacts customer for rescheduling.
7. Financial reconciliation: delivery charge reversed or re-delivery fee applied.

### 14.4 Reducing Failed Deliveries

**Prevention Strategies:**
| Strategy | Implementation |
|----------|---------------|
| Day-before confirmation | Automated text/email: "Your delivery is scheduled for tomorrow between [window]. Reply to confirm or call to reschedule." |
| Accurate site data | Collect gate codes, access instructions, GPS pins, site contact phones at order entry |
| Real-time ETA notifications | Automated "Driver is X minutes away" alerts give the site time to prepare |
| Site readiness verification | Sales rep or customer service confirms site is ready the day before |
| Weather monitoring | Proactive route adjustments when weather threatens (especially for boom deliveries) |
| Address verification | Geocode all addresses at order entry; flag anomalies |
| Historical site data | Use past delivery experience to flag sites with access issues |

**Industry Benchmark:**
- First-attempt delivery success rate target: **93-97%**
- Failed deliveries typically cost **$150-$400+ each** (driver time, fuel, lost capacity, re-delivery costs, customer dissatisfaction)
- A 5% failure rate on 50 daily deliveries = 2.5 failures = **$375-$1,000/day in waste**

---

## 15. Vehicle Maintenance and Fleet Health

### 15.1 Pre-Trip Inspections (Covered in Sections 5 and 10.3)

### 15.2 Scheduled Preventive Maintenance (PM)

**PM Schedule for Building Materials Fleet:**

| PM Level | Frequency | What's Done | Cost Estimate |
|----------|-----------|-------------|---------------|
| PM-A (Basic) | Every 10,000 miles or 90 days | Oil change, fluid check/top, filter check, tire inspection, brake check, lights, all fluid levels | $200-$400 |
| PM-B (Intermediate) | Every 25,000 miles or 6 months | All PM-A items + transmission fluid, coolant test, battery test, belt/hose inspection, steering/suspension, brake measurement | $500-$1,000 |
| PM-C (Major) | Every 50,000 miles or annually | All PM-B items + DPF regen/clean, fuel system service, complete brake service, wheel bearing service, hydraulic system service (boom/Moffett) | $1,000-$3,000 |
| Annual DOT Inspection | Annually | FMCSA-required comprehensive inspection of all safety systems; must be performed by qualified inspector; inspection sticker/decal issued | $150-$300 |

**Specialized Equipment Maintenance:**

| Equipment | Maintenance Item | Frequency |
|-----------|-----------------|-----------|
| Boom/Crane | Hydraulic fluid change, cylinder inspection, wire rope inspection, load test | Every 500 hours or per manufacturer schedule |
| Moffett | Hydraulic fluid, mast chain lubrication, fork condition, tire replacement, hose inspection | Every 250 hours or per manufacturer schedule |
| Conveyor | Belt tension/alignment, roller inspection, motor service | Every 200 hours |

### 15.3 Breakdown Procedures

**When a Vehicle Breaks Down on the Road:**

1. **Safety first**: Move vehicle to shoulder/safe location if possible. Activate hazard lights.
2. **Reflective triangles**: Place at 10 feet, 100 feet, and 200 feet behind vehicle (FMCSA requirement).
3. **Contact dispatch**: Phone call (not app -- urgency requires voice).
4. **Dispatch initiates**:
   - Roadside assistance (fleet maintenance provider or national service like FleetNet, Cummins Quickserve)
   - If driveable to a repair shop: route driver to nearest approved facility
   - If not driveable: tow to nearest approved facility
   - For remaining deliveries: dispatch a replacement vehicle/driver to transfer the load, or reschedule
5. **Notify affected customers** of delays
6. **Driver stays with vehicle** until assistance arrives (unless safety concern)
7. **Document**: Photos of breakdown, tow receipt, repair invoice, all communication logged

### 15.4 Fleet Health Dashboard (What a Fleet Manager Needs to See)

**Real-Time View:**
- Vehicle locations on map (all trucks)
- Vehicle status: In Service / Available / In Maintenance / Out of Service
- Active fault codes (check engine, ABS, DEF, etc.)
- Current driver assignment per vehicle
- Fuel levels

**Maintenance View:**
- Upcoming PM schedule (which vehicles are due this week/month)
- Open work orders and status
- Overdue maintenance items (red flags)
- Parts inventory status
- Maintenance cost per vehicle (MTD, YTD)
- Mean Time Between Failures (MTBF) per vehicle

**Compliance View:**
- DVIR completion rates (all drivers completing pre/post-trip?)
- Open defects not yet resolved
- DOT annual inspection status per vehicle
- Registration and permit expiration dates
- Insurance coverage status

**Cost View:**
- Total fleet maintenance cost per month
- Cost per mile breakdown (fuel, maintenance, tires, insurance)
- Vehicle lifecycle cost tracking
- Comparison: repair cost vs. replacement threshold

**Leading Fleet Maintenance Platforms:**
| Platform | Focus | Cost |
|----------|-------|------|
| Fleetio | Maintenance scheduling, fuel, inspections | $5-$10/vehicle/month |
| Samsara | Integrated telematics + maintenance | $25-$40/vehicle/month (bundled) |
| Whip Around | DVIR and inspections | $5-$8/vehicle/month |
| Driveroo | Digital DVIR | $3-$7/vehicle/month |
| Simply Fleet | DVIR and fleet management | Varies |

### 15.5 Tire Management

**Critical for Building Materials (Heavy Loads):**
- Tires are the #1 maintenance cost for heavy trucks (up to 30% of total maintenance spend)
- Check tire pressure before every trip (TPMS systems recommended)
- Tire rotation schedule: every 5,000-8,000 miles for steering tires
- Tread depth minimum: 4/32" for steering tires, 2/32" for other positions (FMCSA)
- Tire replacement cost: $300-$800 per tire for Class 7-8 trucks
- Full set replacement: $2,400-$12,800 per truck
- Retread programs can save 30-50% vs. new tires for drive/trailer positions

### 15.6 Fuel Management

**Strategies:**
- Company fuel cards (Comdata, WEX, EFS) with per-gallon discounts at network stations
- Idle reduction policies: shut off engine after 5 minutes of idling (saves $2,000-$4,000/year per truck)
- Route optimization reduces total miles driven
- Tire pressure maintenance improves MPG by 3-5%
- Driver training on fuel-efficient driving (smooth acceleration, anticipatory braking)
- Fuel cost per truck: ~$44,000/year (at current diesel prices and typical building materials routes)

---

## 16. Real Driver Apps in Building Materials

### 16.1 Builders FirstSource (myBLDR Platform)

**Overview:** Builders FirstSource operates approximately 4,500 company trucks with company drivers. The myBLDR digital platform serves as both a customer portal and integrates with their delivery operations.

**Driver-Facing Features:**
- GPS-tracked fleet using Teletrac Navman telematics
- Drivers trained to photograph all deliveries showing: jobsite verification, jobsite phase, product type, and quantity
- Photos accessible to customers through the myBLDR platform
- Real-time delivery notifications and tracking

**Customer-Facing Features:**
- Submit purchase orders digitally
- Request delivery dates
- Real-time order tracking ("Where's my order?")
- View delivery confirmation photos
- Automated delivery notifications

**Assessment:** Builders FirstSource focuses on the customer experience (real-time tracking, photo proof, digital ordering) built on top of a traditional fleet operation (Teletrac Navman telematics). Their driver app is likely a standard fleet telematics driver app supplemented by photo capture requirements. The innovation is in the customer-facing side, not necessarily in a purpose-built driver experience.

### 16.2 ABC Supply

**Overview:** Largest US wholesale roofing distributor with 900+ locations and a massive owned fleet including boom trucks, flatbeds, box trucks, cranes, conveyors, knuckle-boom trucks, and semis.

**Operations:**
- Guarantees delivery within **30 minutes of scheduled time** -- industry-leading commitment
- Fleet includes over 100 Kenworth trucks across models (T370, T680, T800, T880)
- Recently added Mack MD Electric vehicles for testing
- Mobile app available on Google Play for customers (order tracking, account management)

**Assessment:** ABC Supply's delivery operation is the gold standard for building materials. Their 30-minute guarantee implies highly sophisticated dispatch and route optimization. Their fleet diversity (boom, flatbed, conveyor, knuckle-boom, semi) means their dispatch system must handle complex vehicle-to-order matching. Their customer app exists, but details on the driver-specific app are not publicly available -- likely proprietary and built on an enterprise telematics platform.

### 16.3 SRS Distribution (Now Part of Home Depot)

**Overview:** One of the fastest-growing building products distributors in the US, acquired by Home Depot. Operates primarily at the branch level with own fleet supplemented by contracted carriers.

**Assessment:** As part of Home Depot, SRS Distribution is likely transitioning to Home Depot's logistics technology stack. Before the acquisition, SRS operated with branch-level fleet management typical of regional building materials distributors. Limited public information on their specific driver app technology.

### 16.4 Curri (On-Demand Platform)

**Overview:** The leading on-demand delivery platform specifically for building materials and construction supplies.

**Driver App Features (Based on Reviews and App Store):**
- Home screen with "Active" toggle to receive delivery notifications
- Delivery offers appear as push notifications and text messages when near available pickups
- Offer details include: pickup area, drop-off area (zip codes), vehicle requirement, pay amount
- "Claim Delivery" button -- driver claims interest; platform may assign or decline
- Assignment confirmation (platform selects from multiple claiming drivers)
- "I'm On My Way" button (cannot activate more than 30 minutes before pickup window)
- Navigation to pickup and delivery locations
- Photo capture of picked-up and delivered materials
- Delivery completion marking
- Payment credited within 15 minutes of completion
- Delivery history view
- "Requests" menu showing available and past offers

**Recent App Updates:**
- Flatbed vehicle category support
- Delivery contact information improvements
- Native views for delivery history and delivery images
- Improved login experience
- Curri Route Driver app (separate app for dedicated route drivers)

**Driver Experience (from Reviews):**
- Pros: Higher per-delivery pay than food delivery, daytime-only work, instant payouts, no tip dependency
- Cons: Opaque assignment algorithm, low volume (1-2 offers per day in some markets), long distances reduce effective hourly rate, minimal offer information (no maps or distance breakdowns in the offer)
- Average offer: ~$66 per delivery
- Effective hourly rate after expenses: $9-$15/hour (for gig per-delivery drivers)
- Route drivers get better economics: $28/hour guaranteed + overtime

**Assessment:** Curri has built the most purpose-built platform for building materials delivery in the on-demand space. The driver app is functional but not as polished or information-rich as major gig platforms (DoorDash, Uber). The per-delivery gig model struggles with low volume in many markets, but their route driver program (guaranteed hours) is more viable. For HyperQuote, Curri is best used as an overflow/hot-shot solution, not a primary delivery method.

### 16.5 GoShare

**Overview:** On-demand delivery platform connecting businesses with local drivers who have pickup trucks, cargo vans, or box trucks.

**Platform Features:**
- Free estimate in-app
- Schedule pickup time and location
- Match with a delivery professional in about a minute
- Drivers load, secure, transport, and unload items
- Available same-day and scheduled
- Nationwide coverage

**Vehicle Types:** Pickup trucks, cargo vans, box trucks

**Assessment:** GoShare is more generalized than Curri (not building-materials-specific). Good for light loads, small orders, and will-call deliveries. Less suitable for heavy building materials requiring specialized equipment. Simpler platform than Curri but wider vehicle variety for lighter loads.

### 16.6 Industry Dispatch/Driver Platforms Used in Building Materials

| Platform | Type | Driver App? | Building Materials Specific? |
|----------|------|-------------|------------------------------|
| **Epicor BisTrack** | ERP + Delivery | Yes (ePOD app) | Yes -- purpose-built for LBM (lumber, building materials) |
| **DispatchTrack** | Dispatch + Tracking | Yes (driver app) | Adapted for construction |
| **Teletrac Navman** | Telematics | Yes (ELD + GPS) | Used by Builders FirstSource |
| **Samsara** | Telematics | Yes (driver app) | General fleet, widely used in construction |
| **Motive** | Telematics + ELD | Yes (driver app) | General fleet |
| **INFORM SyncroTESS** | AI Dispatch | No (dispatch-side) | Yes -- building materials logistics optimization |
| **TruxNow** | Dispatch | Yes | Concrete/aggregate-specific |
| **AMCS** | Transport Optimization | Yes | Building materials logistics |

### 16.7 What a Best-in-Class Building Materials Driver App Should Have (HyperQuote Target)

Based on analysis of all the above systems and their gaps:

**Must Have (Table Stakes):**
- Digital DVIR (pre-trip/post-trip)
- Route view with optimized stop sequence
- Turn-by-turn truck-specific navigation
- Delivery manifest with item-level verification
- Barcode/QR scanning for load verification
- Photo POD with GPS + timestamp
- Electronic signature capture
- Damage reporting with photos
- In-app messaging with dispatch
- Push notifications for route changes
- Break/HOS status management
- Offline-first architecture (construction sites have poor connectivity)

**Should Have (Competitive Differentiation):**
- Load verification with mismatch alerts before departure
- Site access instructions with photos, gate codes, GPS pins
- PPE reminder triggered by geofence
- Cargo securement photo documentation
- Historical delivery notes per site
- Weight ticket capture and verification
- Partial delivery workflow with remaining item tracking
- Failed delivery workflow with reason codes and documentation
- Return-to-warehouse logging
- End-of-day summary with performance metrics
- Voice input for notes and damage descriptions

**Could Have (Best-in-Class / Future):**
- AI-powered route reoptimization mid-day
- Computer vision for cargo condition assessment
- Automated cargo securement verification (photo AI)
- Predictive ETA based on historical delivery times at each site
- Driver scorecarding and gamification
- Integrated ELD (built-in, not separate device)
- Multi-language support (critical for diverse driver workforce)
- Dark mode for early morning/evening operations
- One-hand operation design (all actions in thumb zone)
- Voice-first interface for hands-free operation while driving

---

## Summary: HyperQuote Driver Operations Model

### The Three-Tier Driver Strategy

```
TIER 1 -- INTERNAL (W2): 70-85% of deliveries
  WHO: CDL holders, specialized equipment operators, company employees
  WHAT: Core daily delivery volume, specialized equipment, key accounts
  COST: $175K/year per truck (all-in); lowest per-delivery cost at scale
  MANAGEMENT: Full control -- dispatch assigns, trains, evaluates, retains

TIER 2 -- CONTRACTED: 10-20% of deliveries
  WHO: Recurring owner-operators, small carriers, under contract
  WHAT: Overflow, peak season, specialty loads, geographic gaps
  COST: $2.50-$3.50/mile or $150-$500/delivery; higher per-unit but variable
  MANAGEMENT: Carrier agreement, insurance monitoring, performance rating, load tendering

TIER 3 -- ON-DEMAND: 5-10% of deliveries
  WHO: Gig drivers on platforms (Curri, GoShare)
  WHAT: Hot shots, urgent small loads, will-call, light materials
  COST: $75-$200 per delivery (platform pricing); highest per-unit but zero overhead
  MANAGEMENT: Platform handles; HyperQuote rates and provides delivery instructions
```

### Critical Success Factors

1. **Specialized equipment is the moat.** Boom trucks, Moffett forklifts, and crane-equipped vehicles cannot be easily sourced from third parties. Internal fleet with this equipment is a competitive advantage.

2. **The driver IS the customer experience.** In building materials, the delivery driver is the last touchpoint. A professional, skilled driver who places materials correctly and communicates well creates customer loyalty.

3. **Compliance is non-negotiable.** HOS, ELD, DVIR, cargo securement, drug testing, insurance -- violations are expensive ($1,000-$19,000+ per incident) and can shut down operations.

4. **Technology enables scale.** A purpose-built driver app with offline capability, route optimization, digital POD, and real-time tracking is what separates modern operations from paper-based chaos.

5. **Failed deliveries are expensive.** At $150-$400+ per failure, prevention (confirmation, site data, communication) pays for itself many times over.

6. **The driver shortage is real and getting worse.** Investment in recruitment, training, retention (pay, benefits, modern equipment, respect) is a strategic necessity, not a cost center.

---

## Sources

### Driver Recruitment and Shortage
- [Why Is the Trucking Driver Shortage Getting Worse in 2025?](https://www.foresmart.com/trucking-driver-shortage/)
- [How to Solve the Driver Shortage in 2025](https://www.goeldhub.com/blog/how-to-solve-the-driver-shortage-in-2025)
- [CDL Staffing Guide 2025](https://cdrgeneralservices.com/cdl-staffing/)
- [Guide to CDL Driver Recruiting in 2026](https://www.godrivers360.com/hiring-resources/guide-cdl-driver-recruiting/)
- [Truck Driver Shortage 2026](https://www.americatruckdriving.com/truck-driver-shortage-in-2026-why-demand-is-growing-and-what-it-means-for-new-cdl-drivers/)
- [The Truck Driver Shortage: Causes, Impact, Solutions](https://chiefcarriers.com/us-truck-driver-shortage/)

### Compliance and Regulations
- [FMCSA Cargo Securement Rules](https://www.fmcsa.dot.gov/regulations/cargo-securement/cargo-securement-rules)
- [FMCSA Load Securement Regulations Guide](https://www.mysafetymanager.com/fmcsa-load-securement-regulations/)
- [DOT Hours of Service for Local Drivers](https://www.mysafetymanager.com/dot-hours-of-service-for-local-drivers/)
- [ELD Rules for Local Drivers](https://hos247.com/resources/eld-mandate/eld-rules-for-local-drivers/)
- [Short Haul Exemption Guide](https://www.mysafetymanager.com/short-haul-exemption/)
- [Summary of HOS Regulations (FMCSA)](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations)
- [FMCSA Drug & Alcohol Clearinghouse](https://clearinghouse.fmcsa.dot.gov/)
- [FMCSA Clearinghouse Requirements Guide](https://americanriverwellnessrecovery.com/fmcsa-clearinghouse-requirements/)
- [CDL Drug Testing Requirements 2025](https://americanriverwellnessrecovery.com/cdl-drug-testing-requirements/)
- [DOT Requirements for Non-CDL Drivers](https://checkr.com/resources/articles/dot-requirements-for-non-cdl-drivers)
- [DOT Med Cards Changing June 2025](https://www.cnsprotects.com/news/dot-med-cards-changing-june-2025/)
- [DVIR Guide 2026](https://heavyvehicleinspection.com/article/dvir-guide-driver-vehicle-inspection-report)
- [OSHA PPE for Construction](https://www.osha.gov/personal-protective-equipment/construction)
- [OSHA Trucking Industry Overview](https://www.osha.gov/trucking-industry)
- [eCFR 49 CFR Part 393 Subpart I](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-I)
- [FMCSA Driver's Handbook on Cargo Securement](https://cms7.fmcsa.dot.gov/regulations/cargo-securement/drivers-handbook-cargo-securement)

### Pay and Compensation
- [How Much Truck Drivers Make in 2025](https://www.1stcommercialcredit.com/blog/how-much-truck-drivers-make)
- [Delivery Driver Salary 2026 (Glassdoor)](https://www.glassdoor.com/Salaries/delivery-driver-salary-SRCH_KO0,15.htm)
- [Flatbed Truck Driver Salary (ZipRecruiter)](https://www.ziprecruiter.com/Salaries/Truck-Driver-Per-Mile-Salary)
- [Concrete Mixer Truck Driver Hourly Pay (PayScale)](https://www.payscale.com/research/US/Job=Concrete_Mixer_Truck_Driver/Hourly_Rate)
- [Foundation Building Materials Driver Salary (Indeed)](https://www.indeed.com/cmp/Foundation-Building-Materials-3/salaries/Truck-Driver)
- [Flatbed Truck Driver Salary (Salary.com)](https://www.salary.com/research/salary/listing/flatbed-truck-driver-salary)
- [Truck Driver Salary Guide (Geotab)](https://www.geotab.com/blog/truck-driver-salary/)

### On-Demand Platforms
- [Curri Virtual Fleet Management](https://www.curri.com/article/how-much-should-your-virtual-fleet-cost)
- [Curri Driver Page](https://www.curri.com/drive)
- [Curri Driver Review (EntreCourier)](https://entrecourier.com/delivery/gig-delivery-platforms/other-platforms/curri-delivery-driver-review/)
- [Life as a Curri Driver](https://www.curri.com/article/what-is-it-like-to-drive-for-curri)
- [Curri Hotshot Delivery Cost Factors](https://www.curri.com/article/hotshot-delivery-cost-factors-what-impacts-the-final-price)
- [GoShare Building Materials Delivery](https://goshare.co/service/building-materials-delivery/)
- [GoShare On-Demand Delivery](https://goshare.co/service/delivery-on-demand/)

### Major Distributors
- [Builders FirstSource Delivery and Pickup](https://www.bldr.com/services/delivery-pickup)
- [myBLDR Digital Platform](https://www.bldr.com/digital-tools/mybldr)
- [ABC Supply Services](https://www.abcsupply.com/services/)
- [ABC Supply Mobile App](https://play.google.com/store/apps/details?id=com.abcsupply.mobile)

### Carrier Management
- [CarrierAssure Performance Ratings](https://www.carrierassure.com/)
- [Carrier411 Safety Monitoring](https://www.carrier411.com/)
- [Truckstop Carrier Monitoring](https://truckstop.com/product/carrier-monitoring/)
- [Descartes Carrier Compliance 2026](https://www.descartes.com/resources/knowledge-center/carrier-compliance-landscape-changing-2026)
- [Owner Operator Insurance Requirements 2025](https://logitydispatch.com/blog/owner-operator-insurance-requirements-everything-you-need-to-know/)
- [Insurance for Owner-Operators (Pearl)](https://pearl.insurance/insurance-needs-owner-operators-vs-company-drivers/)

### Fleet Management and Technology
- [Geotab DVIR Solution](https://www.geotab.com/fleet-management-solutions/dvir/)
- [Whip Around DVIR App](https://apps.apple.com/us/app/whip-around-dvir/id1030219989)
- [Lytx Digital DVIR](https://www.lytx.com/dvir)
- [Moffett Forklift Information](https://www.customtruck.com/piggyback-truck-mounted-forklifts/)
- [Moffett Forklift Rentals](https://www.eliftruck.com/for-rent/forklifts/moffett)

### Vehicle Pricing
- [Commercial Truck Trader Listings](https://www.commercialtrucktrader.com/)
- [Knuckleboom Trader](https://www.knuckleboomtrader.com/)
- [U.S. Trucking Rates Per Mile 2026](https://heigten.com/us-trucking-rates-per-mile-2026/)
