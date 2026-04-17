# Conversations

Support tickets / conversations across email, WhatsApp, and live chat.
Each conversation belongs to a customer (by `customerId`), has a channel,
status, priority, and a nested array of messages. Linked orders and quotes
reference IDs from the orders/quotes tables.

Time fields use `minutesAgo` for relative timestamps resolved at boot.

Schema (conversation):
`{ id, customerId, channel, status, priority, subject, assignedTo,
assignedToName, tags, ticketId, slaDeadlineMinutesFromNow, slaBreached,
createdAtMinutesAgo, linkedOrders, linkedQuotes, messages }`

Schema (message):
`{ id, channel, direction, content, senderName, minutesAgo, read, metadata }`

```json
[
  {
    "id": "conv-001",
    "customerId": "cust-001",
    "channel": "live",
    "status": "open",
    "priority": "urgent",
    "subject": "Order delivery delayed — site crew waiting",
    "assignedTo": "usr-agent-01",
    "assignedToName": "Sara Ahmed",
    "tags": ["delivery", "escalation"],
    "ticketId": null,
    "slaDeadlineMinutesFromNow": 15,
    "slaBreached": false,
    "createdAtMinutesAgo": 45,
    "linkedOrders": [
      { "id": "ord-4521", "displayId": "ORD-4521", "rfqId": "rfq-008", "status": "in_transit", "totalAmount": 187500, "currency": "EGP", "createdAtMinutesAgo": 1440 },
      { "id": "ord-4498", "displayId": "ORD-4498", "rfqId": "rfq-008", "status": "delivered", "totalAmount": 95200, "currency": "EGP", "createdAtMinutesAgo": 10080 }
    ],
    "linkedQuotes": [
      { "id": "qt-0156", "displayId": "QT-0156", "status": "accepted", "totalAmount": 187500, "currency": "EGP", "createdAtMinutesAgo": 4320 }
    ],
    "messages": [
      { "id": "m-001", "channel": "live", "direction": "inbound", "content": "Good morning, I placed order ORD-4521 yesterday and was told delivery at 10 AM. It is now 10:45 and no one has arrived.", "senderName": "Ahmed El-Sayed", "minutesAgo": 45, "read": true, "metadata": {} },
      { "id": "m-002", "channel": "live", "direction": "outbound", "content": "Good morning Ahmed. Let me check the status of your delivery right away.", "senderName": "Sara Ahmed", "minutesAgo": 42, "read": true, "metadata": {} },
      { "id": "m-003", "channel": "live", "direction": "outbound", "content": "The truck left the warehouse at 9:30 AM. There is heavy traffic on the Ring Road. Updated ETA is 11:15 AM. I apologize for the delay.", "senderName": "Sara Ahmed", "minutesAgo": 40, "read": true, "metadata": {} },
      { "id": "m-004", "channel": "live", "direction": "inbound", "content": "The crew is idle. Every hour costs me money. This is the second time this month.", "senderName": "Ahmed El-Sayed", "minutesAgo": 20, "read": true, "metadata": {} },
      { "id": "m-005", "channel": "live", "direction": "inbound", "content": "Where is my order? The site crew has been waiting since 10 AM", "senderName": "Ahmed El-Sayed", "minutesAgo": 3, "read": false, "metadata": {} }
    ]
  },
  {
    "id": "conv-002",
    "customerId": "cust-003",
    "channel": "email",
    "status": "open",
    "priority": "high",
    "subject": "Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180",
    "assignedTo": "usr-agent-02",
    "assignedToName": "Mohamed Kamal",
    "tags": ["payment", "invoice"],
    "ticketId": "TKT-2026-0002",
    "slaDeadlineMinutesFromNow": 300,
    "slaBreached": false,
    "createdAtMinutesAgo": 120,
    "linkedOrders": [
      { "id": "ord-4523", "displayId": "ORD-4523", "rfqId": "rfq-003", "status": "delivered", "totalAmount": 25000, "currency": "EGP", "createdAtMinutesAgo": 7200 }
    ],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-010", "channel": "email", "direction": "inbound", "content": "Dear HyperQuote Support,\n\nI am writing regarding invoice INV-2026-0089 for order ORD-4523. The invoice charges for 200 bags of Portland cement at LE 125/bag (LE 25,000 total), but we only received 180 bags. The delivery receipt signed by your driver confirms the 180-bag count.\n\nPlease adjust the invoice to reflect the actual quantity delivered (180 bags = LE 22,500) and issue a corrected invoice at your earliest convenience.\n\nPlease see attached delivery receipt showing 180 bags, not 200 as invoiced.\n\nRegards,\nMahmoud Fathy\nDelta Building Materials", "senderName": "Mahmoud Fathy", "minutesAgo": 120, "read": true, "metadata": { "from": "mahmoud@deltabuilding.eg", "to": "support@hyperquote.io", "subject": "Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180" } },
      { "id": "m-011", "channel": "email", "direction": "outbound", "content": "Dear Mr. Fathy,\n\nThank you for bringing this to our attention. I have verified the delivery receipt and confirmed the discrepancy. A corrected invoice for 180 bags (LE 22,500) will be issued within 24 hours.\n\nI have also escalated this to our warehouse team to investigate why the short delivery occurred.\n\nPlease accept our apologies for the inconvenience.\n\nBest regards,\nMohamed Kamal\nHyperQuote Support", "senderName": "Mohamed Kamal", "minutesAgo": 90, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "mahmoud@deltabuilding.eg", "subject": "Re: Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180" } },
      { "id": "m-012", "channel": "email", "direction": "inbound", "content": "Thank you Mohamed. Please also confirm whether the remaining 20 bags will be delivered or if a credit note will be issued instead.\n\nRegards,\nMahmoud Fathy", "senderName": "Mahmoud Fathy", "minutesAgo": 35, "read": false, "metadata": { "from": "mahmoud@deltabuilding.eg", "to": "support@hyperquote.io", "subject": "Re: Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180" } }
    ]
  },
  {
    "id": "conv-003",
    "customerId": "cust-003",
    "channel": "email",
    "status": "open",
    "priority": "high",
    "subject": "Cracked marble tiles in latest delivery — 15 of 50 damaged",
    "assignedTo": "usr-agent-01",
    "assignedToName": "Sara Ahmed",
    "tags": ["quality", "damage-claim", "vip"],
    "ticketId": "TKT-2026-0003",
    "slaDeadlineMinutesFromNow": 60,
    "slaBreached": false,
    "createdAtMinutesAgo": 180,
    "linkedOrders": [
      { "id": "ord-4536", "displayId": "ORD-4536", "rfqId": "rfq-003", "status": "evaluated", "totalAmount": 984301, "currency": "EGP", "createdAtMinutesAgo": 14400 }
    ],
    "linkedQuotes": [
      { "id": "qt-001", "displayId": "QT-2026-00523", "status": "sent", "totalAmount": 984301, "currency": "EGP", "createdAtMinutesAgo": 1440 }
    ],
    "messages": [
      { "id": "m-020", "channel": "email", "direction": "inbound", "content": "Dear HyperQuote Support,\n\nWe received delivery DEL-0089 today containing 50 Carrara marble tiles (60x60cm). Upon unpacking, 15 tiles have visible hairline cracks running through them. These tiles were ordered specifically for a VIP lobby installation scheduled for next week.\n\nPhotos attached showing the damage. We need either immediate replacement or a full credit for the damaged tiles. Time is critical — installation crew is booked.", "senderName": "Omar Khalil", "minutesAgo": 180, "read": true, "metadata": { "from": "omar@niledevelopment.eg", "to": "support@hyperquote.io", "subject": "Cracked marble tiles in latest delivery — 15 of 50 damaged" } },
      { "id": "m-021", "channel": "email", "direction": "outbound", "content": "Mr. Khalil, thank you for reporting this with photos. I have initiated a damage claim (CLM-003) and escalated it as major due to the VIP timeline.\n\nI am checking stock availability for replacement tiles now. Will update you within 2 hours.\n\nPriority: HIGH — VIP project timeline at risk.\n\nBest regards,\nSara Ahmed\nHyperQuote Support", "senderName": "Sara Ahmed", "minutesAgo": 150, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "omar@niledevelopment.eg", "subject": "Re: Cracked marble tiles in latest delivery — 15 of 50 damaged" } },
      { "id": "m-022", "channel": "email", "direction": "outbound", "content": "Update: We have 22 matching Carrara tiles in our Badr City warehouse. I have reserved them for you. We can deliver replacement tiles tomorrow morning (Thursday) before 9 AM.\n\nFor the remaining 15 tiles to complete the full replacement, our supplier confirms availability by Saturday.\n\nShall I proceed with the 22-tile delivery tomorrow and schedule the remainder for Saturday?\n\nBest regards,\nSara Ahmed", "senderName": "Sara Ahmed", "minutesAgo": 90, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "omar@niledevelopment.eg", "subject": "Re: Cracked marble tiles in latest delivery — 15 of 50 damaged" } }
    ]
  },
  {
    "id": "conv-004",
    "customerId": "cust-006",
    "channel": "live",
    "status": "open",
    "priority": "low",
    "subject": "Account login issue",
    "assignedTo": null,
    "assignedToName": null,
    "tags": ["account"],
    "ticketId": null,
    "slaDeadlineMinutesFromNow": 480,
    "slaBreached": false,
    "createdAtMinutesAgo": 8,
    "linkedOrders": [],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-030", "channel": "live", "direction": "inbound", "content": "Hello, I cannot log in to the portal. It says my password is expired but I changed it last week.", "senderName": "Hassan Ali", "minutesAgo": 8, "read": false, "metadata": {} }
    ]
  },
  {
    "id": "conv-005",
    "customerId": "cust-001",
    "channel": "live",
    "status": "pending",
    "priority": "medium",
    "subject": "Quote request — 500t rebar + 200t cement for Q3 project",
    "assignedTo": "usr-agent-02",
    "assignedToName": "Mohamed Kamal",
    "tags": ["quote", "bulk"],
    "ticketId": null,
    "slaDeadlineMinutesFromNow": 720,
    "slaBreached": false,
    "createdAtMinutesAgo": 195,
    "linkedOrders": [
      { "id": "ord-4510", "displayId": "ORD-4510", "rfqId": "rfq-008", "status": "delivered", "totalAmount": 342000, "currency": "EGP", "createdAtMinutesAgo": 43200 },
      { "id": "ord-4485", "displayId": "ORD-4485", "rfqId": "rfq-008", "status": "delivered", "totalAmount": 215000, "currency": "EGP", "createdAtMinutesAgo": 86400 }
    ],
    "linkedQuotes": [
      { "id": "qt-0190", "displayId": "QT-0190", "status": "draft", "totalAmount": 0, "currency": "EGP", "createdAtMinutesAgo": 170 }
    ],
    "messages": [
      { "id": "m-040", "channel": "live", "direction": "inbound", "content": "Is 12mm and 16mm rebar available for delivery this week? We need to stock up for a Q3 project.", "senderName": "Tarek Nour", "minutesAgo": 195, "read": true, "metadata": {} },
      { "id": "m-041", "channel": "live", "direction": "outbound", "content": "Good morning Mr. Nour. Yes, both 12mm and 16mm rebar are in stock. Earliest delivery is tomorrow. Shall I create a quote?", "senderName": "Mohamed Kamal", "minutesAgo": 190, "read": true, "metadata": {} },
      { "id": "m-042", "channel": "live", "direction": "inbound", "content": "Yes please, 100 bundles of 12mm. Can we also add 16mm to the quote?", "senderName": "Tarek Nour", "minutesAgo": 175, "read": true, "metadata": {} }
    ]
  },
  {
    "id": "conv-006",
    "customerId": "cust-006",
    "channel": "email",
    "status": "open",
    "priority": "high",
    "subject": "Disputing charges on INV-2026-0102 — duplicate billing",
    "assignedTo": "usr-agent-02",
    "assignedToName": "Mohamed Kamal",
    "tags": ["payment", "dispute"],
    "ticketId": "TKT-2026-0006",
    "slaDeadlineMinutesFromNow": 180,
    "slaBreached": false,
    "createdAtMinutesAgo": 300,
    "linkedOrders": [
      { "id": "ord-4530", "displayId": "ORD-4530", "rfqId": "rfq-007", "status": "delivered", "totalAmount": 156000, "currency": "EGP", "createdAtMinutesAgo": 20160 }
    ],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-050", "channel": "email", "direction": "inbound", "content": "To whom it may concern,\n\nInvoice INV-2026-0102 includes two delivery charges of LE 2,500 each. We should only have been charged once as both items were part of the same delivery (DEL-0094).\n\nPlease investigate and issue a corrected invoice.\n\nYasser Fahmy\nOctober Cement Works", "senderName": "Yasser Fahmy", "minutesAgo": 300, "read": true, "metadata": { "from": "yasser@october-cement.eg", "to": "support@hyperquote.io", "subject": "Disputing charges on INV-2026-0102 — duplicate billing" } },
      { "id": "m-051", "channel": "email", "direction": "outbound", "content": "Dear Mr. Fahmy,\n\nThank you for flagging this. I can confirm that delivery DEL-0094 was a single trip, so the double charge is indeed an error.\n\nI have submitted a correction request to our finance team. A revised invoice will be issued within 48 hours, and the LE 2,500 overcharge will be applied as a credit to your next order.\n\nApologies for the inconvenience.\n\nMohamed Kamal\nHyperQuote Support", "senderName": "Mohamed Kamal", "minutesAgo": 240, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "yasser@october-cement.eg", "subject": "Re: Disputing charges on INV-2026-0102 — duplicate billing" } }
    ]
  },
  {
    "id": "conv-007",
    "customerId": "cust-003",
    "channel": "email",
    "status": "open",
    "priority": "medium",
    "subject": "Granite slab chipped during unloading — CLM-002",
    "assignedTo": "usr-agent-01",
    "assignedToName": "Sara Ahmed",
    "tags": ["quality", "resolved"],
    "ticketId": "TKT-2026-0007",
    "slaDeadlineMinutesFromNow": null,
    "slaBreached": false,
    "createdAtMinutesAgo": 4320,
    "linkedOrders": [
      { "id": "ord-4525", "displayId": "ORD-4525", "rfqId": "rfq-002", "status": "delivered", "totalAmount": 89000, "currency": "EGP", "createdAtMinutesAgo": 28800 }
    ],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-060", "channel": "email", "direction": "inbound", "content": "Dear Support,\n\nTwo granite slabs were chipped during unloading at our site. The driver confirmed the damage occurred during handling. Photos attached.\n\nRegards,\nKarim Mansour", "senderName": "Karim Mansour", "minutesAgo": 4320, "read": true, "metadata": { "from": "karim@heliopolismarble.eg", "to": "support@hyperquote.io", "subject": "Granite slab chipped during unloading — CLM-002" } },
      { "id": "m-061", "channel": "email", "direction": "outbound", "content": "Dear Mr. Mansour,\n\nDamage claim CLM-002 created. Since the damage is minor (under 5%), this qualifies for automatic credit. Processing now.\n\nBest regards,\nSara Ahmed", "senderName": "Sara Ahmed", "minutesAgo": 4260, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "karim@heliopolismarble.eg", "subject": "Re: Granite slab chipped during unloading — CLM-002" } },
      { "id": "m-062", "channel": "email", "direction": "outbound", "content": "Dear Mr. Mansour,\n\nCredit note CN-0045 has been applied to your account. Thank you for your patience.\n\nBest regards,\nSara Ahmed", "senderName": "Sara Ahmed", "minutesAgo": 2880, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "karim@heliopolismarble.eg", "subject": "Re: Granite slab chipped during unloading — CLM-002" } }
    ]
  },
  {
    "id": "conv-008",
    "customerId": "cust-006",
    "channel": "live",
    "status": "pending",
    "priority": "low",
    "subject": "New account verification — documents submitted",
    "assignedTo": "usr-agent-01",
    "assignedToName": "Sara Ahmed",
    "tags": ["account", "onboarding"],
    "ticketId": null,
    "slaDeadlineMinutesFromNow": null,
    "slaBreached": false,
    "createdAtMinutesAgo": 380,
    "linkedOrders": [],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-070", "channel": "live", "direction": "inbound", "content": "Hello, I just registered on the platform. I need to submit my company documents for verification.", "senderName": "Nadia Ibrahim", "minutesAgo": 380, "read": true, "metadata": {} },
      { "id": "m-071", "channel": "live", "direction": "outbound", "content": "Welcome to HyperQuote! You can upload your documents through the portal under Account > Verification. We need your tax registration and commercial register.", "senderName": "Sara Ahmed", "minutesAgo": 375, "read": true, "metadata": {} },
      { "id": "m-072", "channel": "live", "direction": "inbound", "content": "I have uploaded the tax registration and commercial register. How long does verification take?", "senderName": "Nadia Ibrahim", "minutesAgo": 360, "read": true, "metadata": {} },
      { "id": "m-073", "channel": "live", "direction": "outbound", "content": "Thank you Nadia. Verification typically takes 1-2 business days. I will notify you as soon as your account is approved. In the meantime, you can browse our catalog.", "senderName": "Sara Ahmed", "minutesAgo": 355, "read": true, "metadata": {} }
    ]
  },
  {
    "id": "conv-009",
    "customerId": "cust-001",
    "channel": "live",
    "status": "open",
    "priority": "urgent",
    "subject": "Wrong rebar size delivered — 10mm instead of 12mm",
    "assignedTo": "usr-agent-02",
    "assignedToName": "Mohamed Kamal",
    "tags": ["delivery", "wrong-item", "escalation"],
    "ticketId": "TKT-2026-0009",
    "slaDeadlineMinutesFromNow": -30,
    "slaBreached": true,
    "createdAtMinutesAgo": 180,
    "linkedOrders": [
      { "id": "ord-4540", "displayId": "ORD-4540", "rfqId": "rfq-008", "status": "in_transit", "totalAmount": 284000, "currency": "EGP", "createdAtMinutesAgo": 2880 }
    ],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-080", "channel": "live", "direction": "inbound", "content": "We just received the rebar delivery but these are 10mm, not 12mm as ordered. My engineer confirmed. This cannot be used on our project.", "senderName": "Tarek Nour", "minutesAgo": 180, "read": true, "metadata": {} },
      { "id": "m-081", "channel": "live", "direction": "outbound", "content": "I sincerely apologize, Mr. Nour. Let me verify with the warehouse immediately.", "senderName": "Mohamed Kamal", "minutesAgo": 170, "read": true, "metadata": {} },
      { "id": "m-082", "channel": "live", "direction": "outbound", "content": "Confirmed — the warehouse shipped the wrong batch. We have 12mm in stock and are loading a replacement truck now. ETA to your site: 3 hours.", "senderName": "Mohamed Kamal", "minutesAgo": 150, "read": true, "metadata": {} },
      { "id": "m-083", "channel": "live", "direction": "inbound", "content": "Three hours? My crew is standing idle right now. This already cost me half a day.", "senderName": "Tarek Nour", "minutesAgo": 60, "read": true, "metadata": {} },
      { "id": "m-084", "channel": "live", "direction": "inbound", "content": "It has been 2 hours and still nothing. Where is the truck?", "senderName": "Tarek Nour", "minutesAgo": 30, "read": false, "metadata": {} },
      { "id": "m-085", "channel": "live", "direction": "inbound", "content": "This is unacceptable. I need the correct size TODAY or I am cancelling the account.", "senderName": "Tarek Nour", "minutesAgo": 25, "read": false, "metadata": {} }
    ]
  },
  {
    "id": "conv-010",
    "customerId": "cust-003",
    "channel": "email",
    "status": "pending",
    "priority": "medium",
    "subject": "Delivery scheduling for next week — 3 sites",
    "assignedTo": "usr-agent-01",
    "assignedToName": "Sara Ahmed",
    "tags": ["delivery", "scheduling"],
    "ticketId": null,
    "slaDeadlineMinutesFromNow": 1200,
    "slaBreached": false,
    "createdAtMinutesAgo": 600,
    "linkedOrders": [
      { "id": "ord-4545", "displayId": "ORD-4545", "rfqId": "rfq-002", "status": "warehouse", "totalAmount": 762800, "currency": "EGP", "createdAtMinutesAgo": 4320 }
    ],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-090", "channel": "email", "direction": "inbound", "content": "Dear Support,\n\nWe have three active projects and need to schedule deliveries for next Tuesday:\n\n1. Heliopolis showroom — 20 marble slabs (morning)\n2. Nasr City villa — 15 granite countertops (midday)\n3. New Cairo office — 30 floor tiles (afternoon)\n\nCan we coordinate all three in one day? This would save us significant logistics costs.\n\nBest,\nKarim Mansour", "senderName": "Karim Mansour", "minutesAgo": 600, "read": true, "metadata": { "from": "karim@heliopolismarble.eg", "to": "support@hyperquote.io", "subject": "Delivery scheduling for next week — 3 sites" } },
      { "id": "m-091", "channel": "email", "direction": "outbound", "content": "Dear Mr. Mansour,\n\nI have checked with our dispatch team. All three deliveries can be accommodated on Tuesday with the following windows:\n\n1. Heliopolis showroom: 8:00–10:00 AM\n2. Nasr City villa: 11:30 AM–1:30 PM\n3. New Cairo office: 3:00–5:00 PM\n\nShall I confirm these slots? Please note the New Cairo delivery requires a crane truck for the floor tiles.\n\nBest regards,\nSara Ahmed", "senderName": "Sara Ahmed", "minutesAgo": 480, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "karim@heliopolismarble.eg", "cc": "dispatch@hyperquote.io", "subject": "Re: Delivery scheduling for next week — 3 sites" } }
    ]
  },
  {
    "id": "conv-011",
    "customerId": "cust-006",
    "channel": "email",
    "status": "open",
    "priority": "low",
    "subject": "Cannot access order history — portal shows blank page",
    "assignedTo": "usr-agent-01",
    "assignedToName": "Sara Ahmed",
    "tags": ["platform", "bug"],
    "ticketId": "TKT-2026-0011",
    "slaDeadlineMinutesFromNow": null,
    "slaBreached": false,
    "createdAtMinutesAgo": 1800,
    "linkedOrders": [],
    "linkedQuotes": [],
    "messages": [
      { "id": "m-100", "channel": "email", "direction": "inbound", "content": "Hello,\n\nWhen I click on Order History in my portal, the page loads blank. No orders showing. I have 5 active orders that should appear. Browser: Chrome on Windows.\n\nHassan Ali", "senderName": "Hassan Ali", "minutesAgo": 1800, "read": true, "metadata": { "from": "hassan@gizacontractors.eg", "to": "support@hyperquote.io", "subject": "Cannot access order history — portal shows blank page" } },
      { "id": "m-101", "channel": "email", "direction": "outbound", "content": "Dear Mr. Ali,\n\nThank you for reporting this. We identified a caching issue affecting some accounts. I have cleared your session cache on our end. Please try logging out and back in.\n\nBest regards,\nSara Ahmed", "senderName": "Sara Ahmed", "minutesAgo": 1680, "read": true, "metadata": { "from": "support@hyperquote.io", "to": "hassan@gizacontractors.eg", "subject": "Re: Cannot access order history — portal shows blank page" } },
      { "id": "m-102", "channel": "email", "direction": "inbound", "content": "Working now. Thank you for the quick fix.\n\nHassan Ali", "senderName": "Hassan Ali", "minutesAgo": 1440, "read": true, "metadata": { "from": "hassan@gizacontractors.eg", "to": "support@hyperquote.io", "subject": "Re: Cannot access order history — portal shows blank page" } }
    ]
  },
  {
    "id": "conv-012",
    "customerId": "cust-001",
    "channel": "live",
    "status": "resolved",
    "priority": "low",
    "subject": "Price inquiry — bulk Portland cement",
    "assignedTo": "usr-agent-02",
    "assignedToName": "Mohamed Kamal",
    "tags": ["pricing", "quote"],
    "ticketId": null,
    "slaDeadlineMinutesFromNow": null,
    "slaBreached": false,
    "createdAtMinutesAgo": 420,
    "linkedOrders": [],
    "linkedQuotes": [
      { "id": "qt-0195", "displayId": "QT-0195", "status": "draft", "totalAmount": 121500, "currency": "EGP", "createdAtMinutesAgo": 360 }
    ],
    "messages": [
      { "id": "m-110", "channel": "live", "direction": "inbound", "content": "What is the current price for Portland cement 50kg bags? I need around 1000 bags for a project starting next month.", "senderName": "Ahmed El-Sayed", "minutesAgo": 420, "read": true, "metadata": {} },
      { "id": "m-111", "channel": "live", "direction": "outbound", "content": "Current price for Portland cement 50kg bags is LE 125/bag for orders under 500, and LE 118/bag for orders of 500+. For 1000 bags, your total would be LE 118,000 before delivery.", "senderName": "Mohamed Kamal", "minutesAgo": 390, "read": true, "metadata": {} },
      { "id": "m-112", "channel": "live", "direction": "inbound", "content": "And what about delivery to 6th of October City?", "senderName": "Ahmed El-Sayed", "minutesAgo": 378, "read": true, "metadata": {} },
      { "id": "m-113", "channel": "live", "direction": "outbound", "content": "Delivery to 6th of October for this volume would be LE 3,500. Total: LE 121,500. Delivery within 48 hours of order confirmation. Shall I create a formal quote?", "senderName": "Mohamed Kamal", "minutesAgo": 366, "read": true, "metadata": {} },
      { "id": "m-114", "channel": "live", "direction": "inbound", "content": "Thank you for the quote. I will discuss with my team and get back to you.", "senderName": "Ahmed El-Sayed", "minutesAgo": 360, "read": true, "metadata": {} }
    ]
  }
]
```
