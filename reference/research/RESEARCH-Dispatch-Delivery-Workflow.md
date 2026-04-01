> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Dispatch and Delivery Workflow for B2B Building Materials Distribution

**Research Date:** March 2026
**Scope:** Heavy building materials (cement, steel, lumber, drywall, roofing, windows) delivered to construction sites
**Industry Context:** B2B wholesale distribution, not retail/homeowner delivery

---

## Table of Contents

1. [Dispatch Workflow](#1-dispatch-workflow)
2. [Own Fleet vs Third-Party Delivery](#2-own-fleet-vs-third-party-delivery)
3. [Driver Daily Workflow](#3-driver-daily-workflow)
4. [Proof of Delivery for Building Materials](#4-proof-of-delivery-for-building-materials)
5. [Delivery Exceptions in Construction](#5-delivery-exceptions-in-construction)
6. [Loading and Unloading Building Materials](#6-loading-and-unloading-building-materials)
7. [Delivery Scheduling with Customers](#7-delivery-scheduling-with-customers)
8. [Fleet Management Technology](#8-fleet-management-technology)
9. [Cost of Delivery](#9-cost-of-delivery)
10. [Communication Between Dispatcher, Driver, and Customer](#10-communication-between-dispatcher-driver-and-customer)

---

## 1. Dispatch Workflow

### How a Dispatcher Plans a Delivery Day

The dispatch process for building materials typically begins the afternoon or evening before the delivery day. The core workflow is:

**Day-Before Planning (T-1):**
1. **Order cutoff** -- Most distributors have a cutoff time (typically 2:00-4:00 PM) for next-day deliveries. Orders placed after cutoff go to the following day unless flagged urgent.
2. **Order consolidation** -- The dispatcher reviews all confirmed orders for the next day, grouping them by geography, truck type required, and delivery window.
3. **Load planning** -- Each truck's load is planned considering weight limits, product compatibility (e.g., cement cannot be stacked on drywall), and delivery sequence (last stop loaded first -- "last on, first off").
4. **Route optimization** -- Routes are built considering delivery windows, drive times, unloading times (which vary by product type and site conditions), and return-to-yard timing.
5. **Driver assignment** -- Drivers are matched to routes based on CDL class, equipment certification (crane, Moffett forklift), familiarity with the area, and hours-of-service availability.

**Morning-Of Execution (Day 0):**
1. **Pre-load verification** -- Warehouse team picks and stages loads per the dispatch plan. Dispatcher verifies product availability (no stockouts overnight).
2. **Driver briefing** -- Drivers receive route sheets (paper or digital) with stop sequence, customer contacts, delivery instructions, and any site-specific notes.
3. **Load inspection** -- Driver inspects load for accuracy and securement before departing.
4. **Real-time adjustments** -- Throughout the day, the dispatcher monitors progress and handles changes.

### Information the Dispatcher Needs

| Data Point | Why It Matters |
|---|---|
| Order details (SKU, quantity, weight) | Determines truck type, load planning |
| Customer delivery address | Route building |
| Delivery window / time preference | Sequence optimization |
| Site access notes (gate codes, low bridges, narrow roads) | Prevents failed deliveries |
| Unloading method required (boom, forklift, tailgate, customer crane) | Equipment matching |
| Contact person and phone number at site | Coordination on arrival |
| Product availability / warehouse location | Load staging |
| Driver availability and HOS status | Legal compliance |
| Truck/equipment availability and maintenance status | Fleet readiness |
| Historical delivery data for the site | Realistic time estimates |

### Handling Last-Minute Changes

Common last-minute disruptions and how dispatchers handle them:

- **Customer cancellation** -- Remove stop, re-optimize remaining route. If truck already loaded, product returns to warehouse or gets rerouted to another order.
- **Add-on order / hot shot** -- Evaluate if it can be inserted into an existing route without blowing delivery windows. If not, dispatch a dedicated truck or defer to next day.
- **Driver calls in sick** -- Reassign route to a backup driver, split the route across other trucks, or push lower-priority deliveries to the next day.
- **Truck breakdown** -- Dispatch a replacement vehicle; transfer the load if possible. Notify affected customers of delays.
- **Site not ready** -- Dispatcher coordinates with customer for a new delivery time, either later the same day or rescheduled. The driver moves to the next stop.
- **Weather delay** -- Suspend routes if unsafe. Reschedule in bulk. Notify all affected customers.

### Dispatch Software Used by Leading Companies

| Software | Specialty | Key Feature |
|---|---|---|
| **INFORM SyncroTESS** | Building materials-specific | AI calculates optimized schedule and fleet config nightly; updates every minute during the day. Claims 30-50% reduction in trucks/trips needed. |
| **DispatchTrack** | Construction/building supply delivery | Automated route optimization factoring truck capacity, delivery windows, vehicle type restrictions. Real-time customer notifications. |
| **Epicor BisTrack** | Building materials ERP with delivery | Journey Planner with drag-and-drop truck scheduling, route and load-weight tracking, integrated maps. Delivery app captures GPS, ePOD. |
| **AMCS** | Building materials logistics | Automated transport optimization, intelligent load creation, live execution monitoring. |
| **TruxNow** | Concrete/aggregate dispatch | Real-time dispatching for bulk material delivery, connecting producers, contractors, and haulers. |

**Key industry insight:** AI-powered dispatch software for building materials distributors claims to cut logistics unit costs by up to 20%, increase loads/truck/day by up to 37%, reduce fleet size by up to 30%, and reduce empty mileage by up to 19%.

---

## 2. Own Fleet vs Third-Party Delivery

### The Decision Framework

Building materials distribution has unique delivery requirements that push most mid-to-large distributors toward operating their own fleet:

**Why building materials distributors lean toward owned fleets:**
- **Specialized equipment** -- Deliveries require boom trucks, Moffett-equipped flatbeds, knuckle-boom cranes, conveyors. Third-party carriers rarely have this equipment.
- **Driver skill requirements** -- Drivers must operate cranes, forklifts, and navigate active construction sites. This is not standard truck driving.
- **Customer relationship** -- The delivery driver is often the face of the company. Contractors judge suppliers by delivery reliability.
- **Delivery complexity** -- Construction site deliveries involve precise placement (e.g., roofing materials ON the roof, lumber to a specific spot on site). General freight carriers are not equipped for this.
- **Same-day/urgent delivery** -- Construction delays cost thousands per day. Having your own fleet allows rapid response.

### How Major Companies Handle It

**Builders FirstSource (largest U.S. building materials distributor):**
- Operates approximately 4,500 company trucks with company drivers
- Offers seamless scheduling, real-time delivery notifications, and in-store pickup
- Fleet includes flatbeds, boom trucks, and specialized delivery vehicles
- GPS-tracked fleet (uses Teletrac Navman for fleet tracking)
- National footprint with local delivery operations at each branch

**ABC Supply (largest U.S. wholesale roofing distributor):**
- Operates its own fleet across 450+ branches in 45 states
- Fleet includes boom trucks, flatbeds, box trucks, cranes, conveyors, knuckle-boom trucks, and semis
- Guarantees delivery within 30 minutes of scheduled time
- Recently added Mack MD Electric vehicles for testing
- Over 100 Kenworth trucks (T370, T680, T800, T880 models)

**Carter Lumber (regional distributor):**
- Operates its own delivery fleet for commercial casework and millwork
- Cites increased reliability, cost control, flexibility, and customization as reasons

### Own Fleet vs Third-Party Cost Comparison

| Cost Factor | Own Fleet (per truck/year) | Third-Party (per mile, spot) |
|---|---|---|
| **Truck payment/lease** | $28,857/year (new Class 8) | Included in rate |
| **Driver wages + benefits** | $77,512/year | Included in rate |
| **Fuel** | $44,327/year | Included in rate |
| **Insurance** | $7,936/year | Included in rate |
| **Maintenance & repair** | $16,192/year (~$0.15/mile) | Included in rate |
| **Total operating cost** | ~$174,824/year per truck | -- |
| **Cost per mile (all-in)** | $1.77-$2.90/mile | $2.53-$3.07/mile (flatbed spot/contract) |

**When to use third-party carriers:**
- Overflow capacity during peak season (spring/summer construction boom)
- Long-haul transfers between distribution centers (not last-mile delivery)
- Regions where you have low delivery volume (no branch nearby)
- Specialty loads requiring equipment you do not own (e.g., oversized steel beams)

**When to own your fleet:**
- You have consistent, predictable daily delivery volume (5+ trucks needed daily)
- Your deliveries require specialized equipment (boom, Moffett, crane)
- Customer service differentiation is critical (guaranteed time windows)
- You are doing more than 20-30 deliveries per day from a location

### The Hybrid Model

Most mid-size distributors (5-20 branches) use a hybrid approach:
- **Core fleet (owned or leased):** Handles 70-85% of regular daily volume
- **Third-party/on-demand:** Handles 15-30% (peak overflow, long-haul, specialty)
- **Platforms like Curri:** Provide on-demand construction delivery with flatbeds and Moffett trucks; same-day delivery in as fast as 2 hours

---

## 3. Driver Daily Workflow

### Complete Day-in-the-Life: Building Materials Delivery Driver

**5:00-5:30 AM -- Clock In and Pre-Trip**
1. Arrive at yard/branch. Clock in (timeclock or mobile app).
2. Check dispatch assignment -- route sheet, stop sequence, special instructions.
3. **FMCSA-required pre-trip vehicle inspection (DVIR):**
   - Walk-around: tires, lights, mirrors, body damage, fluid leaks
   - Under hood: engine oil, coolant, belts, hoses
   - Cab: steering, brakes, horn, wipers, gauges, seatbelt
   - Coupling: fifth wheel, kingpin, glad hands (if tractor-trailer)
   - Specialized equipment: boom/crane function test, Moffett operation check, hydraulic lines
   - Document inspection on DVIR form (paper or electronic via ELD device)
4. If defects found: report to maintenance. Truck may be red-tagged; dispatcher reassigns to another vehicle.

**5:30-6:30 AM -- Loading**
1. Drive to loading dock or yard staging area.
2. Warehouse team loads truck per the dispatch load plan (last stop first, first stop last).
3. Driver verifies load against order paperwork:
   - Correct products (SKU, grade, size)
   - Correct quantities (count bundles, pieces, pallets)
   - No visible damage
4. **Cargo securement** per FMCSA 49 CFR Part 393:
   - Chains, binders, straps for heavy loads (steel, lumber)
   - Edge protectors to prevent strap damage
   - Dunnage between layers
   - Minimum tiedown requirements based on cargo weight
5. Sign off on load sheet. Take departure photo if required.

**6:30 AM-3:00 PM -- Route Execution (typically 4-8 stops)**

*At each delivery stop:*
1. **Arrival:** Check in with site contact. Confirm safe unloading location.
2. **Site assessment:** Look for overhead power lines, soft ground, adequate space for truck and equipment operation, pedestrian traffic.
3. **Unloading:**
   - **Flatbed with Moffett:** Driver rides the piggyback forklift off the truck, unloads pallets, places at designated location on site.
   - **Boom truck:** Operate boom crane to lift materials onto roof or upper floors.
   - **Conveyor truck:** Feed materials (shingles, drywall) up a belt conveyor to roof or second story.
   - **Tailgate/manual:** Smaller items unloaded by hand with help from site crew.
4. **Verification:** Customer/site contact counts and inspects materials.
5. **Proof of delivery:**
   - Obtain signature (paper or electronic) from authorized site representative
   - Note any discrepancies (short, damaged, wrong item) on delivery ticket
   - Take photos of delivered materials at their placement location
   - Record any refused items
6. **Cargo securement check:** After partial unload, re-secure remaining cargo. FMCSA requires re-inspection within first 50 miles after loading and every 3 hours/150 miles thereafter.
7. **Depart** and proceed to next stop. Update dispatch on status.

**3:00-4:00 PM -- End of Day**
1. Return to yard with empty truck (or with returns/refused material).
2. **Post-trip inspection (DVIR):** Document vehicle condition, any new defects.
3. Turn in delivery tickets/paperwork (if paper-based).
4. Report any delivery exceptions, customer issues, or vehicle problems.
5. Fuel truck if needed.
6. Clock out.

### Common Driver Pain Points

| Pain Point | Impact |
|---|---|
| **Waiting at job sites** | Sites not ready, no one to receive, gates locked. Driver detention is unpaid time. |
| **Difficult site access** | Narrow residential streets, muddy unpaved sites, no room to maneuver boom or Moffett. |
| **Incorrect delivery information** | Wrong address, no gate code, no site contact phone number. Wastes time calling dispatch. |
| **Overloaded routes** | Too many stops for available hours. Pressure to rush, skip safety checks. |
| **Paper-based processes** | Handwritten tickets get lost, are hard to read, require re-entry at office. |
| **Physical strain** | Manual unloading of heavy materials (80-lb bags of cement, bundles of shingles). High injury risk. |
| **Weather exposure** | Working outdoors in heat, cold, rain. Securement and unloading in bad conditions. |
| **Equipment failures** | Boom hydraulics fail, Moffett won't start, flat tire on forklift. Delivery cannot be completed. |
| **Construction site hazards** | Uneven terrain, open excavations, overhead hazards, other equipment in operation. |

---

## 4. Proof of Delivery for Building Materials

### What Constitutes Valid POD

Building materials POD is more complex than parcel delivery because of the bulk, weight, value, and placement requirements. A complete POD for building materials includes:

**Essential elements:**
1. **Signature** -- Name and signature of the person receiving delivery at the job site. This person must be authorized to accept (site superintendent, project manager, or designated receiver).
2. **Date and time** -- When delivery was completed.
3. **Itemized delivery receipt** -- List of products delivered with quantities, matching the original order/invoice.
4. **Condition notes** -- Any damage observed at time of delivery, noted on the ticket before signing.

**Increasingly standard (ePOD):**
5. **Geo-stamped photos** -- Photos of materials at the point of placement, with GPS coordinates and timestamps embedded. Shows what was delivered, where it was placed, and its condition.
6. **GPS coordinates of delivery** -- Confirms the truck was actually at the correct site.
7. **Barcode/QR code scan** -- Scanning product or order barcodes links the physical delivery to the digital order.

**Specialized to building materials:**
8. **Weight tickets** -- For bulk materials (gravel, sand, concrete, asphalt), a certified scale ticket from the loading facility proves the weight delivered. Some ready-mix concrete trucks have onboard scales.
9. **Tally sheets** -- For lumber and steel, a detailed tally of pieces by dimension (e.g., 47 pieces of 2x4x8, 23 pieces of 2x6x12). The receiver tallies against the order.
10. **Placement confirmation** -- Notes or photos confirming materials were placed at the agreed location (e.g., "roofing materials placed on north section of roof" or "lumber stacked at southeast corner of lot").

### ePOD Technology

Modern ePOD systems used in building materials delivery:
- Driver uses a mobile app (smartphone or rugged tablet) to capture all POD elements
- Photos are automatically geo-tagged and timestamped
- Customer signs on the device screen
- Data syncs to the back office in real time (or queues for sync when offline)
- Integrated with ERP/order management for automatic invoice matching

**Leading ePOD providers for building materials:** Descartes, DispatchTrack, Detrack, Track-POD, Epicor BisTrack (built-in).

### Handling Delivery Disputes

**Common disputes in building materials delivery:**

| Dispute Type | How to Resolve | Prevention |
|---|---|---|
| "We never received this delivery" | GPS data proving truck was on site + signature + geo-tagged photos | Always get signature; never leave materials without POD |
| "Wrong quantity delivered" | Tally sheet signed by receiver vs. warehouse load-out records | Count and verify at point of delivery, both parties |
| "Materials were damaged on arrival" | Condition noted on POD before signature; photos of damage. If not noted, presumption is materials were delivered in good condition. | Driver takes photos before and after unloading. Receiver inspects before signing. |
| "Materials placed in wrong location" | GPS-tagged placement photos | Confirm placement location with site contact before unloading |
| "Materials delivered to wrong site" | GPS coordinates vs. order address | Verify address on arrival; geo-fence alerts if truck is at wrong location |
| "Weight was short" | Certified scale ticket from loading facility vs. claimed weight | Always obtain and retain scale tickets for bulk loads |

### Legal Requirements

- **UCC (Uniform Commercial Code)** -- Under UCC Article 2, risk of loss transfers to the buyer upon delivery (unless otherwise agreed). POD documents this transfer.
- **Bill of Lading** -- For interstate shipments, the Carmack Amendment governs carrier liability. The BOL is the legal contract of carriage.
- **Digital signatures** -- Legally recognized under the ESIGN Act (federal) and UETA (state-level) in the United States. Electronic POD has the same legal standing as paper.
- **Retention requirements** -- Delivery records should be retained for a minimum of 3-7 years depending on state statutes of limitation for contract disputes.
- **Lien rights** -- In many states, the building materials supplier has mechanic's lien rights on the property where materials were delivered. POD documentation (proving delivery to the specific job site) is essential evidence for enforcing a lien.

---

## 5. Delivery Exceptions in Construction

### Common Exceptions and How to Handle Each

**1. Site Not Ready**
- **What happens:** Concrete slab not poured yet, framing not complete, previous trade still occupying the space where materials need to go.
- **Frequency:** Very common. Construction schedules shift constantly.
- **Handling:** Driver contacts dispatch. Dispatcher contacts customer to determine: (a) Can materials be placed somewhere else on site? (b) Can delivery happen later today? (c) Reschedule to a specific date? Document the exception with photos and notes. Return materials to warehouse if no alternative.
- **Cost impact:** A failed delivery costs $150-$400+ (driver time, fuel, lost capacity on the route).

**2. Wrong Delivery Location / Address**
- **What happens:** Order has incorrect address, or customer has multiple job sites and the wrong one was specified.
- **Handling:** Driver contacts dispatch immediately. Dispatch contacts customer to confirm correct location. If the correct site is nearby and within route feasibility, redirect. Otherwise, reschedule.
- **Prevention:** Address verification at order entry. GPS geo-fence confirms truck is at the expected location.

**3. Access Restricted**
- **What happens:** Gated community (no code), locked construction site (no one on site), road too narrow for truck, bridge weight limit, permit required for delivery.
- **Handling:** Driver attempts to reach site contact by phone. If no answer, wait 15-20 minutes (company policy varies). If still no access, mark as failed delivery, document with photos, notify dispatch.
- **Prevention:** Collect gate codes, access instructions, and site contact phone numbers at order entry. Flag sites with known access issues in the system.

**4. No One to Receive**
- **What happens:** No authorized person is on site to accept delivery, inspect materials, and sign POD.
- **Handling:** Company policy dictates whether driver can leave materials without signature. Many companies prohibit this to avoid disputes. Driver waits a set time, then moves to next stop. Delivery rescheduled.
- **Prevention:** Confirm delivery day/time with customer the day before. Send "driver en route" notification with ETA.
- **Alternative:** Some companies allow "unattended delivery" with customer pre-authorization, documented by photo POD showing materials placed at agreed location.

**5. Damaged Goods**
- **What happens:** Materials damaged during loading, transport, or unloading. Could be discovered at warehouse, in transit, or at site.
- **Handling:**
  - If discovered before departure: replace from warehouse stock.
  - If discovered at site by driver: document damage, notify dispatch, offer partial delivery of undamaged items. Return damaged items.
  - If discovered by customer after driver departs: customer contacts supplier with photos. Supplier reviews POD photos (condition at delivery) and determines responsibility.
- **Prevention:** Proper cargo securement, load planning (heavy items on bottom, fragile items protected), driver training on material handling.

**6. Partial Delivery Needed**
- **What happens:** Customer only wants part of the order delivered now (storage constraints, project phasing), or supplier only has partial stock available.
- **Handling:** Dispatch confirms with customer what to deliver now and what to hold. Driver delivers partial order, POD clearly notes items delivered vs. items remaining. Remaining items scheduled for a future delivery.
- **Invoicing:** Typically invoiced per delivery, not per order.

**7. Weather Delays**
- **What happens:** Rain makes unpaved construction sites impassable (truck gets stuck in mud). High winds prevent boom/crane operation. Snow/ice makes roads unsafe.
- **Handling:** Dispatcher monitors weather forecasts proactively. Decisions made early in the morning whether to run, delay, or cancel routes. Individual stops can be skipped if a specific site is inaccessible.
- **Boom truck wind limits:** Most boom trucks cannot operate safely above 20-30 mph winds. Rooftop deliveries are particularly sensitive.
- **Impact:** Weather is the number one cause of bulk route cancellations. Missed deliveries stack up and create a backlog.

**8. Customer Refuses Delivery**
- **What happens:** Customer disputes order (wrong product, didn't order this, changed mind), or refuses due to quality concerns.
- **Handling:** Driver contacts dispatch. Dispatch contacts sales team or customer service. If the issue cannot be resolved on the spot, driver returns materials to warehouse. Exception documented on delivery ticket.
- **Prevention:** Order confirmation sent to customer before delivery. Driver verifies order number with site contact on arrival.

**9. Truck/Equipment Breakdown**
- **What happens:** Vehicle mechanical failure or specialized equipment (boom, Moffett, conveyor) malfunction en route or at the job site.
- **Handling:** Driver contacts dispatch and roadside assistance. Dispatcher determines if a replacement truck can be sent or if remaining stops need to be rescheduled. If only equipment is down but truck is operational, driver may complete non-equipment stops.
- **Prevention:** Rigorous preventive maintenance schedule. Pre-trip inspections catch many issues before departure.

**10. Overweight/Oversize Compliance Issues**
- **What happens:** Route passes over a bridge with a weight restriction, road has height clearance issue, or load exceeds legal weight limits.
- **Handling:** Dispatcher plans routes considering weight restrictions and clearances. If discovered in the field, driver contacts dispatch for an alternate route.
- **Prevention:** Route planning software with truck-specific routing (not standard car GPS).

---

## 6. Loading and Unloading Building Materials

### Equipment Types and When Each Is Used

**1. Truck-Mounted Forklift (Moffett / Piggyback)**
- **What it is:** A compact, all-wheel-drive forklift (typically HIAB Moffett brand) that rides on a bracket at the rear of a flatbed truck. Driver dismounts it at the delivery site to unload.
- **Capacity:** Up to 8,000 lbs.
- **Best for:** Palletized materials (lumber bundles, bagged cement/morite, brick pallets, packaged drywall, shingle bundles), any material on pallets.
- **Advantages:** Driver is self-sufficient -- no need for site equipment. Can navigate tight residential driveways and crowded job sites with 4-way steering. Most versatile option for building materials.
- **Limitations:** Cannot lift to roof height. Requires relatively firm, level ground. Takes up 4-6 feet of trailer length.
- **Cost:** A new Moffett costs $40,000-$80,000. Adds weight to the truck, reducing payload capacity by ~5,000-6,000 lbs.

**2. Boom Truck / Knuckle-Boom Crane**
- **What it is:** A hydraulic crane mounted on the truck chassis, capable of lifting materials to elevated locations.
- **Best for:** Roofing materials (shingles, underlayment) delivered directly to the roof. Trusses, wall panels, and other items that need to go to upper floors or elevated locations.
- **Advantages:** Eliminates the need for site crew to carry materials up ladders/scaffolding. Huge time-saver for roofing jobs.
- **Limitations:** Requires outrigger setup (takes space), cannot operate in high winds (20-30 mph limit), needs overhead clearance (no power lines above), and requires certified operator.
- **Typical lift capacity:** 3-28 tons depending on truck class and boom length.

**3. Conveyor Truck**
- **What it is:** A truck equipped with a belt conveyor that angles up from the truck bed to the roof or upper floor.
- **Best for:** Shingles, bagged materials, and smaller items that can ride a belt conveyor.
- **Advantages:** Faster than crane for high-volume roofing material delivery. Lower skill requirement than boom operation.
- **Limitations:** Limited to materials that can ride a belt. Cannot handle large/heavy individual pieces.

**4. Standard Flatbed (No Self-Unload Equipment)**
- **What it is:** A flatbed trailer with no onboard unloading equipment. Relies on site-provided equipment or manual unloading.
- **Best for:** Deliveries to sites with their own forklift, crane, or dock. Large commercial construction sites typically have equipment on hand.
- **Limitations:** Driver cannot unload independently. Causes detention time if site equipment is busy.

**5. Crane (Site-Provided)**
- **What it is:** A mobile or tower crane already on the construction site, operated by site crew.
- **Best for:** Steel beams, precast concrete, heavy structural components. Large commercial projects.
- **How it works:** Truck arrives, site crane lifts materials off the truck and places them where needed.
- **Coordination:** Delivery must be timed to when the crane is available (not being used for other lifts). Requires advance scheduling with the general contractor.

**6. Manual Unloading**
- **What it is:** Materials carried by hand from truck to placement location.
- **Best for:** Small orders, odd-lot items, materials under 80 lbs per piece.
- **Reality:** Common for small residential deliveries but physically demanding and slow. OSHA limits on repetitive lifting should be considered.

### How Unloading Method Affects Route Planning

The unloading method has a major impact on route planning because it determines:

| Factor | Moffett | Boom Truck | Conveyor | Flatbed (site equip.) |
|---|---|---|---|---|
| **Avg unload time per stop** | 15-30 min | 30-60 min | 20-40 min | 10-45 min (depends on site) |
| **Stops per day** | 6-10 | 3-6 | 4-7 | 4-8 |
| **Site space needed** | Moderate | Large (outriggers) | Moderate | Minimal |
| **Weather sensitivity** | Low | High (wind) | Medium | Low |
| **Driver skill required** | Forklift cert | Crane cert (NCCCO) | Basic training | Minimal |

**Key planning implications:**
- Boom truck routes have fewer stops because each stop takes longer and requires more setup.
- Moffett routes can handle more stops because self-unloading is faster.
- Routes mixing equipment types are inefficient -- dispatchers try to group similar delivery types.
- Site equipment availability must be confirmed in advance for flatbed-only deliveries.

### Who Provides the Equipment?

- **Distributor provides:** Moffett forklift, boom crane, conveyor -- these are truck-mounted and part of the delivery service.
- **Customer/site provides:** Dock, crane, forklift on large commercial sites. If customer equipment is unavailable, the driver cannot unload.
- **Gray area:** Some distributors charge a "boom fee" or "Moffett fee" ($50-$200 per delivery) for specialized unloading equipment use. Others include it in the delivery charge.

---

## 7. Delivery Scheduling with Customers

### How Delivery Windows Are Set

**Standard building materials delivery windows:**
- **AM delivery:** Typically 7:00 AM - 12:00 PM (preferred by most contractors who want materials first thing)
- **PM delivery:** Typically 12:00 PM - 5:00 PM
- **Specific time window:** Within a 1-2 hour window (e.g., "between 9:00 and 11:00 AM")
- **First delivery:** Customer requests to be the first stop of the day (usually at a premium or for preferred customers)

**How windows are negotiated:**
1. Customer places order (via phone, sales rep, or online portal) and requests a delivery date and time preference.
2. Dispatch reviews route feasibility and either confirms the window or offers alternatives.
3. Modern systems (like DispatchTrack) allow customers to choose delivery slots based on available routing options -- maintaining efficiency while offering flexibility.

### Advance Notice Requirements

| Delivery Type | Typical Lead Time | Notes |
|---|---|---|
| **Standard scheduled** | 24-48 hours | Most common. Order by 2-4 PM for next-day delivery. |
| **Same-day / hot shot** | 2-4 hours | Available for urgent needs, usually at a premium. Platforms like Curri offer same-day delivery in as fast as 2 hours. |
| **Large/specialty orders** | 3-7 days | Truss packages, engineered wood, custom-cut steel. Requires fabrication or transfer from distribution center. |
| **Boom/crane delivery** | 24-72 hours | Must coordinate equipment availability and may need to verify site conditions. |
| **Bulk materials (concrete, aggregate)** | 24-48 hours | Ready-mix concrete requires tight scheduling due to curing time. |

### Who Coordinates

- **Sales rep** places the initial order and sets customer expectations on delivery timing.
- **Dispatcher** confirms feasibility, assigns to a route, and sets the actual delivery window.
- **Customer service / delivery coordinator** handles changes, reschedules, and day-of communication.
- **Driver** communicates directly with site contact on day of delivery (arrival ETA, site access).

### Day-Before Confirmation

Best practice in the industry is to confirm deliveries the day before:
1. **Automated notification** (text or email) sent to customer: "Your delivery of [order summary] is scheduled for tomorrow between [time window]. Reply to confirm or call to reschedule."
2. If customer does not confirm or requests changes, dispatch adjusts routes.

### Construction Site Scheduling Challenges

- **Multiple trades competing** -- The general contractor may be coordinating deliveries from multiple suppliers (lumber, concrete, electrical, plumbing). Delivery windows must be coordinated to avoid site congestion.
- **Staging area limitations** -- Limited space on site means materials must arrive just-in-time, not too early (nowhere to store) and not too late (crew waiting).
- **Phased delivery** -- Large orders are often split across multiple deliveries aligned with construction phases. A framing package might come in 3-4 loads over a week as different sections of the house are framed.
- **Municipal restrictions** -- Some jurisdictions restrict delivery hours (no deliveries before 7 AM or after 6 PM in residential areas) or require street permits for large truck access.

---

## 8. Fleet Management Technology

### Essential vs Nice-to-Have

**Essential (Must-Have for Any Fleet):**

| Technology | Purpose | Cost Range |
|---|---|---|
| **ELD (Electronic Logging Device)** | FMCSA-mandated for tracking Hours of Service. Automatic recording of driving time by connecting to the vehicle's Engine Control Module (ECM). | $25-$35/vehicle/month (e.g., Motive, Samsara) |
| **GPS Tracking** | Real-time vehicle location for dispatch, customer ETAs, theft recovery. | Often bundled with ELD |
| **Basic Telematics** | Engine diagnostics, fault code alerts, idle time monitoring. | Often bundled with ELD |
| **DVIR (Digital Vehicle Inspection Reports)** | Pre-trip/post-trip inspections on mobile device. FMCSA compliance. | Often bundled with ELD |
| **Route Planning / Dispatch Software** | Optimized route building, driver assignment, delivery scheduling. | $100-$500/month + per vehicle |
| **ePOD (Electronic Proof of Delivery)** | Photo, signature, GPS capture at delivery. | $15-$50/vehicle/month or bundled with dispatch |

**Important (High ROI, Strongly Recommended):**

| Technology | Purpose | Cost Range |
|---|---|---|
| **Dashcams (AI-powered)** | Forward and driver-facing cameras. Accident evidence, driver coaching, insurance savings. AI detects distracted driving, tailgating, hard braking. | $30-$60/vehicle/month |
| **Fuel Management** | Fuel card integration, MPG tracking, fuel theft detection, idle reduction. | $10-$25/vehicle/month |
| **Maintenance Scheduling** | Automated PM alerts based on mileage/engine hours. Work order tracking. | $10-$30/vehicle/month or bundled |
| **Customer Notification System** | Automated "driver en route" and "delivered" notifications to customers. | Often bundled with dispatch software |
| **Two-Way Messaging** | In-app messaging between dispatcher and driver (reduces phone calls). | Often bundled with dispatch software |

**Nice-to-Have (Advanced/Growth Stage):**

| Technology | Purpose |
|---|---|
| **Video telematics / AI coaching** | Automated driver safety scoring and coaching based on camera and sensor data. Predicted to grow at 12.7% CAGR through 2030. |
| **Tire pressure monitoring (TPMS)** | Remote tire pressure alerts. Prevents blowouts and improves fuel economy. |
| **Temperature/load sensors** | For sensitive materials (certain adhesives, coatings). |
| **Predictive maintenance** | AI-based prediction of component failures before they happen. |
| **EV fleet management** | Charge scheduling, range optimization, for electric delivery vehicles. |

### Leading Platforms (2025-2026)

| Platform | Best For | Strengths |
|---|---|---|
| **Samsara** | Mid-to-large fleets (25+ vehicles) | Integrated ELD + GPS + AI dashcam + maintenance. Strong analytics. |
| **Motive (formerly KeepTruckin)** | Mid-size fleets | Clean interface, AI dashcams, automated HOS. $25-$35/vehicle/month. |
| **Geotab** | Data-heavy fleets | Deep telematics analytics, open API, large marketplace of integrations. |
| **Fleetio** | Fleet maintenance focus | Maintenance scheduling, fuel tracking, inspections. Integrates with telematics. |
| **Teletrac Navman** | Construction/building materials | Used by Builders FirstSource. Industry-specific features. |
| **FleetUp** | Compliance-focused | ELD + GPS + DVIR in one device. |

### Fleet Management Market Context

The global fleet management market was $27 billion in 2025, growing to an expected $122.3 billion by 2035 (16.9% CAGR). Commercial vehicles hold 63% market share. This rapid growth reflects the shift from "nice-to-have" to "must-have" across the industry.

---

## 9. Cost of Delivery

### Cost Per Mile (Own Fleet)

Based on 2025 industry benchmarks for flatbed/building materials trucks:

| Cost Component | Per Mile | Per Year (per truck) | % of Total |
|---|---|---|---|
| **Driver wages + benefits** | $0.72-$0.97 | $77,512 | 44% |
| **Fuel** | $0.41-$0.55 | $44,327 | 25% |
| **Truck payment/depreciation** | $0.27-$0.36 | $28,857 | 17% |
| **Maintenance & repair** | $0.15 | $16,192 | 9% |
| **Insurance** | $0.07-$0.10 | $7,936 | 5% |
| **Tires** | $0.03-$0.05 | ~$3,500 | 2% |
| **Permits, tolls, misc** | $0.02-$0.04 | ~$2,500 | 1% |
| **TOTAL** | **$1.67-$2.22** | **$174,000-$181,000** | **100%** |

Note: These are marginal operating costs. Total Cost of Ownership (TCO) including overhead allocation is higher.

### Cost Per Stop

Cost per stop varies significantly based on distance, unload time, and equipment used:

| Stop Type | Estimated Cost Per Stop | Key Driver |
|---|---|---|
| **Local Moffett delivery (< 20 miles)** | $75-$150 | Quick unload, short drive |
| **Local boom delivery (< 20 miles)** | $150-$300 | Longer setup/unload time |
| **Regional delivery (20-50 miles)** | $150-$350 | More fuel and drive time |
| **Failed delivery (no one to receive)** | $150-$400 | Full cost with zero revenue |
| **Same-day/hot shot** | $200-$500+ | Dedicated truck, route disruption |

### Third-Party / Spot Market Rates

For hired flatbed carriers delivering building materials (2025):
- **Spot rate:** $2.44-$2.53/mile average; building materials and heavy loads average $2.69/mile
- **Contract rate:** $3.02-$3.07/mile average
- **Peak season (spring/summer):** $2.60-$3.00+/mile spot
- **Accessorial charges on top:** Detention ($50-$75/hour after free time), stop-off charges ($50-$100/stop), driver assist ($50-$100), liftgate/Moffett fees ($100-$200)

### Delivery Cost as a Percentage of Revenue

This is the critical benchmark for a building materials distributor:

| Metric | Range | Notes |
|---|---|---|
| **Total supply chain cost (all-in)** | 6-12% of net sales | Includes warehouse, transport, planning, returns. Top performers at 5-7%. |
| **Transportation/delivery only** | 3-8% of net sales | Varies by product density, delivery distance, order size. |
| **Distribution + warehousing** | 8-15% of net sales | Broader category including all logistics. |
| **Delivery charge to customer** | Often $0-$150 per delivery | Many distributors include "free delivery" above a minimum order ($500-$2,000). The cost is embedded in product margins. |

**Industry comparison for context:**
- Consumer packaged goods distribution: 6-8% of revenue
- General wholesale distribution: 5-10% of revenue
- Building materials distribution: typically 5-10% of revenue, higher for low-density/bulky products

**Key insight:** Building materials distributors typically operate on gross margins of 25-35%. If delivery costs are 5-10% of revenue, they represent 15-40% of gross profit. This is why delivery efficiency is a critical competitive advantage.

### What Drives Delivery Cost Up or Down

**Cost reducers:**
- Higher drop size (more revenue per stop)
- Route density (more stops per route, less drive time between stops)
- Efficient loading/unloading (minimize time at each stop)
- Backhaul utilization (picking up returns or transfers on the way back)
- Optimized route sequencing (less total miles driven)

**Cost inflators:**
- Small orders / low drop size
- Long delivery distances (rural areas)
- Specialized equipment stops (boom, crane)
- Failed deliveries (100% cost, 0% revenue)
- Customer detention (waiting for unloading access)
- Return trips for refused/damaged material

---

## 10. Communication Between Dispatcher, Driver, and Customer

### The Communication Flow

```
CUSTOMER                    DISPATCHER                    DRIVER
   |                            |                            |
   |--- Places order ---------->|                            |
   |                            |--- Builds route ---------->|
   |<-- Confirms delivery ------|                            |
   |    window (email/text)     |                            |
   |                            |                            |
   |      [DAY BEFORE]          |                            |
   |<-- Delivery reminder ------|                            |
   |    (automated text/email)  |                            |
   |                            |                            |
   |      [DELIVERY DAY]        |                            |
   |                            |--- Route sheet / app ----->|
   |                            |    (all stops, details)    |
   |                            |                            |
   |<-- "Driver en route" ------|<-- Departs for route ------|
   |    (auto notification)     |    (GPS detected)          |
   |                            |                            |
   |<-- ETA update -------------|<-- Approaching stop -------|
   |    (auto, ~30 min out)     |    (GPS detected)          |
   |                            |                            |
   |                            |<-- "Arrived at stop" ------|
   |                            |    (driver check-in)       |
   |                            |                            |
   |<------- Driver calls ------+------- if needed --------->|
   |    (site access issue,     |                            |
   |     no one to receive)     |                            |
   |                            |                            |
   |                            |<-- "Delivery complete" ----|
   |<-- "Delivered" notification|    (POD submitted)         |
   |    (auto, with POD link)   |                            |
   |                            |                            |
   |                            |<-- Exception reported -----|
   |<-- Exception notification--|    (damage, short, etc.)   |
   |    (if applicable)         |                            |
```

### Communication Methods by Channel

**Dispatcher to Driver:**
- **Primary:** In-app messaging / dispatch app (DispatchTrack, Samsara, etc.)
- **Secondary:** Phone call (for urgent/complex situations)
- **Broadcast:** Push notification to all drivers (weather alerts, yard closures)
- **Route assignment:** Digital route sheet in driver's mobile app
- **What's communicated:** Route assignments, order changes, customer instructions, weather updates, site access info, redirect instructions

**Dispatcher to Customer:**
- **Automated:** SMS/email notifications triggered by driver GPS status (en route, ETA, delivered)
- **Manual:** Phone call for exceptions (reschedule, delay, out-of-stock)
- **Proactive:** Day-before delivery confirmation via text/email
- **What's communicated:** Delivery window confirmation, real-time ETA, delivery completion with POD, exception notifications

**Driver to Customer:**
- **On arrival:** Phone call to site contact if no one visible, or to confirm placement location
- **During delivery:** Face-to-face at the point of delivery (verify order, note damage, get signature)
- **What's communicated:** "I'm here," "Where do you want this placed?", "Please sign here," "I'm short 2 bundles, noting on the ticket"

**Customer to Dispatcher:**
- **Order placement:** Phone, email, online portal, or through sales rep
- **Day-of changes:** Phone call (most common) or text/chat
- **Complaints/issues:** Phone call or email post-delivery
- **What's communicated:** Order placement, delivery preferences, changes/cancellations, site readiness, issues/complaints

### What the Customer Needs to Know and When

| Timing | Information | Method |
|---|---|---|
| **At order placement** | Confirmed delivery date and window | Email/portal/phone |
| **Day before delivery** | Reminder with time window and order summary | Automated SMS + email |
| **Morning of delivery** | Route started, estimated delivery sequence position | Automated push/SMS |
| **~30 min before arrival** | "Driver is on the way" with live ETA | Automated SMS with tracking link |
| **At arrival** | "Driver has arrived" | Automated notification + driver calls site contact |
| **At completion** | "Delivery complete" with POD (photos, signature, items delivered) | Automated SMS/email with POD link |
| **If exception occurs** | What happened, what's being done, new ETA or reschedule | Dispatcher phone call (personal touch for problems) |

### Best Practices from Industry Leaders

1. **Proactive over reactive** -- Customers should never have to call to find out where their delivery is. Automated notifications handle 80%+ of communication.
2. **Escalation path** -- If driver cannot reach site contact, dispatcher escalates to the customer's account manager or sales rep.
3. **Single source of truth** -- All communication (driver notes, POD, exception reports, customer confirmations) should be captured in one system, not scattered across texts, emails, and paper tickets.
4. **Branded experience** -- Notifications from the distributor (not a generic delivery platform) build brand trust. DispatchTrack emphasizes branded messages as a key differentiator.
5. **Close the loop** -- After delivery, send a completion notification with a link to POD photos and signed receipt. This pre-empts disputes.

---

## Key Takeaways for System Design

If building a dispatch and delivery management system for a B2B building materials distributor, the system must handle:

1. **Complex load planning** -- Weight, product compatibility, delivery sequence, equipment type matching.
2. **Multi-equipment routing** -- Different truck types (boom, Moffett, flatbed, conveyor) have different stop capacities and time profiles.
3. **Real-time exception management** -- The plan changes constantly. The system must support rapid re-routing and re-scheduling.
4. **Rich POD capture** -- Photos, signatures, GPS, tally counts, weight tickets, condition notes. All geo-tagged and timestamped.
5. **Automated customer communication** -- Proactive notifications reduce inbound calls by 50%+ and improve customer satisfaction.
6. **Driver mobile experience** -- Must work on rugged devices, support offline mode (construction sites often have poor connectivity), and be operable with gloves.
7. **Integration with ERP/Order Management** -- Delivery data must flow back to invoicing, inventory, and customer accounts in real time.
8. **HOS/ELD compliance** -- Route planning must respect driver hours-of-service limits.
9. **Maintenance tracking** -- Trucks and specialized equipment (boom, Moffett) need preventive maintenance scheduling tied to usage.
10. **Cost visibility** -- Cost per stop, cost per mile, delivery cost as % of revenue, driver productivity metrics.

---

## Sources

- [INFORM - AI-Powered Building Materials Logistics](https://www.inform-software.com/en/solutions/logistics/buildingmaterialslogistics)
- [INFORM - Smart Route Planning for Building Materials Distributors](https://www.inform-software.com/en/solutions/logistics/load-and-route-planning)
- [DispatchTrack - Building Supplies Delivery Software](https://www.dispatchtrack.com/industries/building-supplies-distribution)
- [DispatchTrack - 5 Customer Communication Best Practices in Building Materials Delivery](https://www.dispatchtrack.com/blog/building-materials-delivery)
- [DispatchTrack - Construction Dispatch Software](https://www.dispatchtrack.com/blog/construction-dispatch-software/)
- [Mercer Transportation - Construction Material Delivery to Site](https://mercer-trans.com/2025/05/27/how-to-get-construction-material-to-site/)
- [NexLift - Biggest Challenges in Construction Materials Delivery](https://www.nexlift.com/the-biggest-challenges-in-construction-materials-delivery-explained)
- [Carter Lumber - Benefits of Using a Supplier with Their Own Fleet](https://www.carterlumber.com/blog/benefits-of-using-a-materials-supplier-with-their-own-fleet-for-commercial-casework-millwork-delivery)
- [Transport Topics - 2025 Top Building Materials Carriers](https://www.ttnews.com/private-carriers/building/2025)
- [Jones Logistics - Dedicated Fleet vs Private Fleet 2025](https://www.joneslogistics.com/blog/dedicated-fleet-vs.-private-fleet-how-to-choose-the-right-model-in-2025)
- [ABC Supply - Our Fleet](https://www.abcsupply.com/services/our-fleet/)
- [ABC Supply - 6 Ways Fleet Delivers Guaranteed Service](https://www.abcsupply.com/news-events/6-ways-abc-supplys-fleet-delivers-guaranteed-service/)
- [Builders FirstSource - Delivery and Pickup](https://www.bldr.com/services/delivery-pickup)
- [Teletrac Navman - Builders First Source Case Study](https://www.teletracnavman.com/resources/blog/review-builders-first-source-copy)
- [Curri - Same-Day Building Materials Delivery](https://www.curri.com/industries/building-materials-delivery-logistics)
- [AtoB - Delivery of Construction Materials Industry Guide](https://www.atob.com/blog/delivery-of-construction-materials)
- [TruxNow - Dispatching and Material Delivery Software](https://www.truxnow.com/blog/enhancing-project-efficiency)
- [SPEC Building Materials - Delivery Driver Job Description](https://www.speccorp.com/delivery-drivers-class-and-b)
- [Bard Materials - Material Delivery Professional](https://bardmaterials.com/careers/material-delivery-professionals-drivers)
- [Rush Truck Centers - Pre-Trip and Post-Trip Inspection Checklist](https://www.rushtruckcenters.com/blog/2025/12/pre-trip-and-post-trip-inspection-checklist-for-truck-drivers)
- [Whip Around - DOT Pre-Trip Inspection Checklist](https://whiparound.com/dot-pre-trip-inspection-checklist/)
- [Revolution Trucking - Mastering Jobsite Deliveries](https://www.revolutiontrucking.com/blog-posts/drive-success-in-construction-essential-strategies-for-truckers-on-jobsite-deliveries)
- [Designing Buildings - Proof of Delivery POD](https://www.designingbuildings.co.uk/wiki/Proof_of_Delivery_POD)
- [Descartes - Secure Building Materials with ePOD](https://www.descartes.com/resources/knowledge-center/safeguarding-building-materials-distribution-electronic-proof-delivery)
- [Upper - Electronic Proof of Delivery Guide](https://www.upperinc.com/blog/how-to-collect-electronic-proof-of-delivery/)
- [Upper - Proof of Delivery Definitive Guide 2026](https://www.upperinc.com/guides/what-is-proof-of-delivery/)
- [HIAB - Moffett Truck Mounted Forklifts](https://www.hiab.com/en-us/our-brands/moffett)
- [Moffett Official Site](https://moffett-co.com/)
- [Custom Truck One Source - Roofing Equipment](https://www.customtruck.com/blog/types-of-equipment-used-for-residential-commercial-roofing/)
- [Custom Truck One Source - Truck-Mounted Forklifts](https://www.customtruck.com/piggyback-truck-mounted-forklifts/)
- [CAT Rental Store - Construction Materials Transportation Guide](https://www.catrentalstore.com/en_US/blog/construction-materials-transportation-guide.html)
- [MGA International - Flatbed Trucking for Construction](https://www.mgainternational.com/flatbed-trucking-the-preferred-method-of-transport-for-construction-materials/)
- [StruxHub - Mastering Delivery Scheduling in Construction](https://struxhub.com/blog/mastering-delivery-scheduling-in-construction-best-techniques-and-tools-for-materials-deliveries/)
- [Driver Schedule - Construction Material Delivery Scheduling](https://www.driverschedule.com/industries/construction-site-material-delivery-scheduling/)
- [Geotab - Fleet Telematics Guide 2025](https://www.geotab.com/blog/fleet-telematics-safety-efficiency-guide/)
- [Tracki - What Is Fleet Telematics Guide](https://tracki.com/blogs/post/what-is-fleet-telematics-complete-guide)
- [Dataconomy - Top ELD Devices 2025](https://dataconomy.com/2025/09/18/best-eld-devices-and-fleet-management-tools-2025-top-picks-for-trucking-companies/)
- [GM Insights - Fleet Management Market Size 2026-2035](https://www.gminsights.com/industry-analysis/fleet-management-market)
- [Fleetio - 2025 Fleet Cost Per Mile and TCO](https://www.fleetio.com/blog/cost-per-mile-total-cost-ownership-trucking-logistics)
- [Fleetio - Trucking Cost Analysis 2025](https://www.fleetio.com/blog/trucking-cost-analysis)
- [EasiTrack - 2025 Fleet Cost Benchmarks](https://easitrack.com/blog-2025-fleet-cost-benchmarks.html)
- [FinditParts - 2025 Trucking Costs: 43 Stats](https://www.finditparts.com/blog/trucking-costs)
- [Bobtail - Trucking at $1.77 Per Mile](https://www.bobtail.com/blog/trucking-at-1-77-per-mile/)
- [O Trucking - Flatbed Rates Per Mile 2026](https://otrucking.com/resources/guides/flatbed-rates-per-mile/)
- [Lynx Freight - 2025 Flatbed Trucking Rates](https://lynxfreight.com/2025-flatbed-trucking-rates-per-mile-a-cost-guide-for-smart-freight-planning/)
- [Bain & Company - Distribution and Transportation Costs](https://www.bain.com/insights/are-your-distribution-and-transportation-costs-out-of-control/)
- [Ironspring Ventures - Rise of Building Material Distributors](https://ironspring.com/4-the-rise-of-the-building-material-distributors/)
- [APQC - Supply Chain Management Costs as Percentage of Revenue](https://www.apqc.org/what-we-do/benchmarking/open-standards-benchmarking/measures/supply-chain-management-costs)
- [Onfleet - Construction Materials Delivery Industry Growth](https://onfleet.com/blog/construction-material-delivery/)
- [Detrack - Delivery Notifications Construction](https://www.detrack.com/blog/dispatched-1/)
- [Track-POD - Dispatcher Driver Chat](https://www.track-pod.com/blog/dispatcher-driver-chat-for-perfect-deliveries/)
- [Textline - Dispatch SMS Solution](https://www.textline.com/industries/dispatch-and-logistics)
- [World Construction Today - Visual Documentation in Construction](https://www.worldconstructiontoday.com/news/the-hidden-roi-of-visual-documentation-in-construction-litigation-and-compliance/)
