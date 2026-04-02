Delivery windows in Egypt are shaped by regulations, religious observances, weather, and the physical realities of handling heavy building materials on active construction sites. Understanding these constraints helps you plan your site operations around incoming deliveries.

## Cairo heavy vehicle restrictions

The single most impactful constraint on building material delivery in Greater Cairo is the **heavy vehicle ban on the Ring Road**. Trucks weighing 5 tons or more are prohibited from 6:00 AM to midnight. Since most commercial building material deliveries exceed this weight threshold — a standard cement delivery runs 25-50 tons — Cairo deliveries for heavy materials are restricted to the **midnight to 6:00 AM** window.

This is not a HyperQuote policy. It is a traffic authority regulation enforced across Greater Cairo. The dispatch system automatically blocks heavy delivery scheduling during banned hours and routes these deliveries to the night window.

**Light deliveries** under 5 tons — box trucks carrying bagged goods, hardware, fixtures, or small quantities — are exempt from the ban and can be scheduled during standard business hours, typically 8:00 AM to 4:00 PM Sunday through Thursday.

## Standard delivery windows

Outside of Cairo's heavy vehicle restrictions, delivery windows follow Egyptian business norms:

- **Sunday through Thursday** — Standard work week. Deliveries are scheduled during business hours, typically 7:00 AM to 5:00 PM.
- **Friday** — Weekend day with a hard blackout during Jumu'ah prayer (11:30 AM to 1:30 PM). No deliveries, no warehouse operations during this window. Limited deliveries may be scheduled outside prayer hours for urgent orders.
- **Saturday** — Weekend day. Emergency deliveries only, with prior arrangement.

The system calculates delivery ETAs, SLA timers, and escalation triggers based on the Sunday-Thursday work week. A quote submitted Thursday afternoon has its 4-hour response SLA paused over the weekend and resumes Sunday morning.

## Prayer time buffers

Five daily prayers each take 5-10 minutes and can affect site availability. The system integrates a prayer time API and adds 10-15 minute buffers around each prayer when calculating delivery ETAs. This prevents trucks from arriving at a site where the foreman and crew are at prayer.

Delivery time estimates shown to customers include these buffers automatically, so the ETA you see already accounts for prayer schedule adjustments.

## Seasonal considerations

**Khamsin dust storms (March through May)** bring winds of 40-80 km/h with severely reduced visibility. The dispatch system monitors weather conditions and blocks deliveries of sheet materials (plywood, drywall, roofing sheets) when wind speeds exceed 30 km/h — these materials become dangerous to handle in high winds. Cement deliveries during Khamsin require tarped loads, since 5% moisture exposure means total loss.

**Summer heat (June through September)** affects delivery scheduling in Upper Egypt, where temperatures reach 40-50 degrees Celsius. Driver safety mandates include mandatory breaks, water supply, and no loading during peak heat hours (12:00 PM to 3:00 PM). The dispatch system adjusts windows to favor early morning operations during summer months.

## Ramadan adjustments

During Ramadan (dates shift annually based on the Islamic calendar), working hours are legally reduced to 6 hours per day under Egyptian labor law. Delivery windows narrow accordingly, typically shifting to 9:00 AM-3:00 PM or 10:00 AM-4:00 PM. SLA targets are adjusted, and the dispatch system automatically applies Ramadan-mode scheduling.

## Night delivery safety

For Cairo night deliveries in the midnight-6AM window, additional safety protocols apply. Drivers wear high-visibility vests, vehicle lighting is verified functional before departure, and the site must have adequate lighting for safe unloading. The driver app activates dark mode automatically during night shifts, and dispatch requires departure and arrival confirmations for every night delivery.
