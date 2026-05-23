Delivery scheduling for building materials in Egypt operates under constraints that general freight logistics do not face — vehicle weight restrictions in Cairo, prayer time buffers, seasonal dust storms, and the physical demands of offloading steel and cement on active construction sites. The dispatch system accounts for all of these.

## How deliveries are scheduled

Scheduling begins the day before delivery. The dispatch team assigns drivers, plans routes, and sequences stops based on a hierarchy of constraints:

**Hard constraints** come first: vehicle type (flatbed, Moffett, boom truck), driver certification (Second Degree professional license minimum for heavy trucks, Moffett or crane certifications for specialized equipment), and load capacity. A delivery requiring a Moffett-equipped truck for self-unloading at a site without a crane must be matched to a vehicle with that capability.

**Route optimization** follows: proximity-based clustering, fuel-efficient sequencing, and load balancing across the fleet. Moffett-equipped trucks can handle 6-10 stops per day; boom trucks are limited to 3-6 due to setup time at each site.

**Business rules** apply last: internal drivers are dispatched first, contracted drivers get priority overflow, and on-demand drivers fill remaining gaps. Customer preferences (preferred delivery times, specific driver requests) are factored in when possible.

## Cairo truck ban rules

The most significant operational constraint is the **Cairo Ring Road heavy vehicle ban**. Trucks weighing 5 tons or more are prohibited from Cairo's Ring Road between 6:00 AM and midnight. This means building material deliveries within Greater Cairo — cement, steel, aggregates, lumber in commercial quantities — must be scheduled in the **midnight to 6:00 AM** window.

The dispatch system enforces this automatically. Heavy deliveries to Cairo addresses are blocked from daytime scheduling. Dispatchers see alerts if a route plan violates the ban. Customer-facing delivery windows for Cairo show "Night delivery: 12AM-6AM" for heavy materials.

Light deliveries under 5 tons (box trucks with bagged goods or smaller items) are exempt and can be scheduled during standard business hours.

## The dispatch process

On delivery morning, the workflow proceeds:

1. **Pre-load verification** — Warehouse picks the order (barcode scan), stages at the dock (tally check), loads onto the assigned truck (weight verification), and photographs the secured load
2. **Driver sign-off** — The driver confirms the load matches the manifest, completes the pre-trip vehicle inspection, and records the starting odometer
3. **Departure** — GPS detects truck movement and the system transitions to "In Transit." The dispatch board tracks all active vehicles on a color-coded map
4. **Real-time monitoring** — Dispatchers see yellow (loading), green (in transit), blue (at delivery site), and red (problem) indicators for every vehicle. Clicking any marker shows order details, customer contact, and ETA

## Prayer times and weather

The system integrates a prayer time API and automatically buffers delivery ETAs by 10-15 minutes around prayer times. **Friday Jumu'ah prayer (11:30 AM - 1:30 PM)** is a hard blackout — no deliveries, no customer calls, no warehouse operations during this window.

During the March-May Khamsin dust storm season, the system monitors weather conditions. Deliveries of sheet materials (plywood, drywall) are blocked when wind speeds exceed 30 km/h, as these materials act as sails and create dangerous handling conditions.
