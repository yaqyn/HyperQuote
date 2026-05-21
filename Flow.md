# HyperQuote Backend Flow

## Website

The website is the public entry point for customers. Visitors can browse the
market, create a customer account, build a draft order, and submit that order
into the company workflow.

### Actors

- `visitor`: unauthenticated public user.
- `customer`: authenticated user in the shared website/portal customer pool.
- `system`: backend process that records state changes and activity history.

### Account Flow

- Visitors can sign up from the website.
- Customers can sign in from the website.
- Website accounts are customer accounts and must also work in the portal.
- A customer account must not grant access to internal or driver apps.
- Customer identity is owned by Supabase Auth.
- Customer profile data is stored in application tables linked to the auth user.
- Signup is phone-first, preferably through WhatsApp OTP.
- Email/password signup is secondary.
- Phone signup and email/password signup both require confirmation before the
  account can submit orders.

### Market Flow

- Visitors and customers can open the market and browse active products.
- Visitors and customers can fill a cart from market products.
- Public product reads must expose only customer-safe catalog fields.
- Internal-only fields, supplier costs, stock internals, and finance data are
  never exposed through public market reads.
- Product search/filter/sort must run against published catalog data only.

### Support Ticket Flow

- Visitors and customers can open the website support page.
- A support requester can submit a ticket using an email address, name, subject,
  message, and optional phone number.
- A signed-in customer ticket is linked to that customer account.
- A signed-out visitor ticket is accepted as a public support ticket using the
  submitted email as the reply contact.
- Supabase is the source of truth for support tickets.
- Email or WhatsApp providers may notify the HyperQuote team and send requester
  confirmations, but notifications are not the ticket record.
- Support tickets enter the internal customer service queue.
- Internal customer support can see all submitted website support tickets.
- Internal customer support can reply to the requester using the email address
  submitted on the ticket.
- Support replies are recorded as ticket messages/events before or while the
  email is sent.
- Each ticket receives a public reference id that can be shown after submit and
  used in follow-up communication.
- Ticket submission must be rate-limited by IP and, when available, customer
  id/email to reduce spam.

### Draft Order Flow

- A visitor can start building an order before login.
- Visitor cart/draft contents may live client-side until the user signs in or
  submits.
- If a visitor tries to submit without being signed in, the website prompts
  them to sign up or sign in.
- After sign up or sign in, the customer returns to the same cart/draft and can
  continue shopping or submit the order without losing progress.
- Once authenticated, the draft is saved as a customer-owned draft.
- Website customers can explicitly save the current cart as a draft without
  submitting it.
- After a website draft save, the website shows a simple inline success message,
  not a prompt or blocking dialog.
- The website draft-save success message links the word `portal` to the portal
  orders panel so the customer can find saved orders.
- Customers can edit, save, abandon, or submit their own drafts.
- A draft belongs to exactly one customer once it is persisted.

### Submit Order Flow

- Submitting a draft creates a submitted customer order.
- Submitted orders enter the internal sales queue in the internal app sales
  section.
- Sales employees work submitted orders from the quote builder.
- Sales employees can call the customer and record call notes/outcomes.
- Sales employees can edit the submitted order freely before it is confirmed:
  confirm, approve, change quantities, change products, add line items, remove
  line items, reject, or cancel.
- Sales edits create a sales quote/version derived from the customer
  submission; the original customer submission remains preserved as history.
- The first internal state is `submitted`.
- Customers can see the submitted order later from the portal.
- The submit action must write an activity event with the customer actor, order
  id, submitted state, timestamp, and request context where practical.

### Portal Order Management Flow

- Website accounts can sign in to the portal with the same customer identity.
- Portal customers can browse the same published market catalog as the website.
- Portal customers can build a cart/draft from market products.
- Portal customers can save a portal cart/draft without submitting it.
- Portal saved drafts appear in the portal orders panel under saved orders.
- Portal customers can open submitted order details from the orders panel.
- Portal customers can open confirmed order details from the orders panel.
- Portal order detail routes must work whether the visible order id is a
  submitted quote request id or a linked confirmed order id.
- Portal submitted and confirmed order details must show the correct reference,
  status, item names, quantities, units, totals when available, and customer-safe
  delivery/tracking state.
- Portal customers can save a submitted order as a new customer-owned draft.
- Portal customers can save a confirmed order as a new customer-owned draft.
- Saving a submitted or confirmed order as a draft must copy customer-safe line
  item snapshots, quantities, units, bilingual display fields, delivery details
  where appropriate, and notes where appropriate.
- Saving an order as a draft must not mutate the original submitted or confirmed
  order.
- Portal customers can edit or submit the newly saved draft after it appears in
  saved orders.
- Portal customers cannot view, save, edit, delete, or submit another customer's
  drafts or orders.
- Repeated save-as-draft clicks must create intentional separate drafts or be
  safely prevented; they must never corrupt the source order.

### Backend Rules

- Public users can read only published catalog data.
- Customers can read and write only their own drafts.
- Customers can submit only their own drafts.
- Customers can create drafts from their own website cart, portal cart,
  submitted orders, or confirmed orders.
- Customers cannot create a draft from another customer's order.
- Customer order detail reads must be scoped to the signed-in customer and must
  resolve both submitted quote requests and linked confirmed orders safely.
- Customer-facing website and portal records must expose Arabic and English
  source data for product names, categories, specifications, units, and other
  displayed business content.
- Unauthenticated visitors cannot submit orders; they must confirm a customer
  account first.
- Visitors can submit support tickets without signing in, but the backend must
  validate and rate-limit the request.
- Customers cannot directly set internal workflow states after submission.
- Server-side validation must recompute totals, product availability, and
  customer-safe line item data before accepting submission.
- The order snapshot must preserve product names, units, quantities, and prices
  as submitted so later catalog edits do not rewrite order history.
- Internal sales changes must preserve who changed what, when, and why where a
  reason/note is provided.

### Data Needed

- Customer auth user.
- Customer profile.
- Published products.
- Customer draft orders.
- Draft line items.
- Submitted orders.
- Submitted order line snapshots.
- Portal saved order drafts.
- Saved-as-draft source order links or activity context.
- Sales quote versions.
- Sales call notes.
- Support tickets.
- Support ticket messages/events.
- Activity/history events.

### Events

- `customer_signed_up`
- `customer_signed_in`
- `draft_created`
- `draft_updated`
- `draft_saved`
- `website_draft_saved`
- `portal_draft_saved`
- `customer_order_saved_as_draft`
- `portal_order_viewed`
- `draft_submitted`
- `order_submitted`
- `sales_order_opened`
- `sales_customer_called`
- `sales_quote_edited`
- `sales_order_confirmed`
- `sales_order_rejected`
- `sales_order_canceled`
- `support_ticket_created`
- `support_ticket_notification_sent`
- `support_ticket_reply_sent`

## AI Agents

HyperQuote has four AI models/agents. Each one has a different data boundary
and action boundary.

### Website AI

- Website AI is public-facing.
- Website AI can access the website index.
- Website AI helps visitors understand public HyperQuote content.
- Website AI must not access private customer, internal, driver, finance,
  supplier, or inventory data.

### Portal AI

- Portal AI is customer-facing inside the portal.
- Portal AI can access all customer-facing docs.
- Portal AI can access all published products.
- Portal AI can help customers decide what they need for a project.
- Portal AI can help estimate the right product mix and quantities when the
  customer does not know exactly what to order.
- Portal AI can draft orders for the customer.
- Portal AI can add drafted order contents to the customer's cart/draft so the
  customer can review and submit easily.
- Portal AI must not submit an order without the customer explicitly
  confirming.
- Portal AI must operate within the signed-in customer's account scope.
- Portal AI can use product/catalog data, docs, and the customer's active draft
  context, but must not access other customers' private data.

### Employee AI

- Employee AI is available inside the internal app for normal employees.
- Employee AI can access approved operational database information needed for
  employee work.
- Employee AI must not access sensitive data outside the employee's role.
- Employee AI must not expose salaries, private finance data, secret tokens,
  raw exports, or cross-role data the employee cannot normally see.
- Employee AI access follows the employee's internal role and panel
  permissions.
- Employee AI can summarize records, explain workflow state, help draft notes,
  and help employees find allowed operational information.
- Employee AI must not perform workflow writes without explicit user action and
  normal backend authorization.

### Search AI

- Search AI is the CEO-facing AI for the Search panel.
- Search AI can access all approved Supabase summary views/materialized views
  used by the Search panel.
- Search AI has broader visibility than normal Employee AI.
- Search AI can answer CEO-level questions across operations, finance,
  employees, support, fleet, inventory, suppliers, and activity/history.
- Search AI can access sensitive CEO-approved summaries, including employee
  salary information if that data is intentionally exposed through approved
  CEO/search views.
- Normal employees cannot ask Employee AI for CEO-only information such as
  employee salary.
- Search AI is read-focused and must not perform workflow writes.
- Search AI queries and viewed sensitive categories must be audited.

## Internal App

The internal app is the employee workspace for running the full HyperQuote
order cycle. Access is company-created only, role-based, and every meaningful
action must be recorded.

### Actors

- `admin`: employee who can create and manage internal users and roles.
- `sales_employee`: employee assigned to the sales panel.
- `inventory_employee`: employee assigned to the inventory panel.
- `warehouse_employee`: employee assigned to the warehouse panel.
- `finance_employee`: employee assigned to the finance panel.
- `dispatch_employee`: employee assigned to the dispatch panel.
- `customer_service_employee`: employee assigned to customer service.
- `ceo`: employee with search/global visibility.
- `system`: backend process that assigns work, enforces transitions, and writes
  history.

### Panels

- Sales.
- Inventory.
- Warehouse.
- Finance.
- Dispatch.
- Customer service.
- Admin.
- Search.

### Internal Auth And Roles

- Internal accounts are created manually by an admin from the admin panel.
- Each internal account is assigned one or more roles.
- Example: `ahmed@hyperquote.net` can be assigned `sales` and then can see only
  the sales panel.
- Internal users cannot self-signup from public website or portal flows.
- Internal users cannot access customer-only or driver-only app areas unless
  explicitly given a matching company role.
- Role enforcement must happen server-side through Supabase/RLS and internal
  server functions, not only by hiding panels in the UI.

### Sales Pipeline

- Submitted website/portal orders enter the sales pipeline.
- Online sales employees receive submitted orders automatically so no time is
  wasted manually picking from the list.
- The pipeline must prevent two employees from receiving the same order.
- Assignment must be transaction-safe: if Ahmed receives order 1 and Salem is
  online too, Salem receives order 2, not order 1.
- A sales assignment records the employee, order id, assignment time, and
  source queue position.
- If no sales employee is online, orders remain in the submitted queue until an
  eligible employee is available.

### Sales Actions

- `Save`: pauses work on the order and returns it to the end of the sales
  pipeline.
- Saved orders do not become immediately available. They become eligible again
  after a configured delay, for example 10 minutes.
- After the delay, the saved order behaves like a fresh submitted order at the
  end of the list.
- `Reject`: rejects the order and marks it as rejected.
- `Add Order`: lets sales create an order manually when a customer calls.

### Add Order Flow

- Step 1: customer information.
- If the customer already exists, sales attaches the order to the existing
  customer.
- If the customer does not exist, sales can create a provisional customer
  account without a password.
- The provisional account is not fully confirmed until the customer confirms
  through phone or email and signs in themselves.
- Once the customer confirms, the account becomes official and the customer can
  see past orders created for them before confirmation.
- Step 2: quote builder.
- Sales sets delivery time/date, items, quantities, and prices.
- Step 3: send to finance for payment discussion.

### Quote Builder Rules

- Sales can edit the order before confirmation: add items, remove items, change
  quantities, change prices, reject, cancel, or approve/confirm.
- Each edit creates history so the original customer submission or phone order
  remains traceable.
- Sales can record customer call notes and outcomes.
- Confirmed sales work moves to finance for payment discussion.

### Price Freshness

- Item prices are not permanently fixed.
- Inventory owns item price freshness and supplier price proof.
- Inventory should update item prices daily or mark stale items as outdated.
- Sales can see when order items are marked outdated.
- When an outdated item is needed for an active order and the customer is on the
  phone, sales can request new prices.
- A sales price request notifies inventory that the item price must be updated
  immediately because it is needed for a live order.
- Inventory must call the supplier, update the price, and upload proof for the
  price update.
- Price updates must record who updated the price, supplier, proof attachment,
  old price, new price, and timestamp.

### Inventory Panel

Inventory manages stock, supplier refills, item price freshness, and customer
orders that have been confirmed by finance.

#### Inventory Stock Tab

- Inventory can see all items with available quantity and minimum required
  quantity.
- If an item's available quantity is below its minimum, inventory must be able
  to press `Refill`.
- `Refill` opens a side panel for calling the supplier and setting a supplier
  deal.
- The supplier deal is sent to finance for payment management.
- Finance manages the supplier payment and sends the refill to warehouse.
- Warehouse receives the supplier truck and unloads it.
- Inventory stock is not increased until warehouse approves the received
  supplier delivery and unloads the truck.
- If warehouse rejects or does not approve the supplier delivery, inventory
  stock does not increase.
- The price entered during a refill also counts as the updated item price, so
  the item becomes price-updated without needing a separate action in the
  prices tab.

#### Inventory Prices Tab

- Inventory can see all item prices with `updated` or `outdated` labels.
- For outdated prices, inventory calls the supplier and updates the price with
  proof.
- Items are tied to suppliers.
- One supplier can provide multiple items.
- One supplier call can update prices for multiple items at once.
- Price updates can happen directly from the prices tab or as part of a refill
  deal from the stock tab.

#### Inventory Orders Tab

- Inventory sees customer orders only after finance confirms payment and sends
  the order to inventory.
- Inventory fills confirmed orders from available stock.
- Example: if an order needs 2000 wood and available stock is 2000 wood,
  inventory can press `Fill`.
- Filling an order reserves that stock for the order.
- Reserved stock is no longer available on paper for other orders.
- If the order is later rejected or canceled before delivery, reserved stock is
  released back into available inventory.
- Stock is truly consumed only when the order is delivered.
- If available stock is not enough to fill the order, inventory can press
  `Contact supplier` and follow the same supplier refill flow as the stock tab.

### Finance Panel

Finance manages money coming in from customer orders and money going out to
supplier refill deals. The panel has two tabs: `IN` and `OUT`.

#### Finance IN Tab

- `IN` shows customer orders confirmed by sales and sent to finance.
- Finance contacts the customer for payment discussion.
- Finance records customer call notes and payment outcome.
- The customer can choose to pay 100% or 50%.
- If the customer pays 100%, finance confirms payment and sends the order to
  inventory.
- If the customer pays 50%, finance confirms the partial payment and sends the
  order to inventory, but the order stays visible in finance for future
  collection.
- Partial payment records must show paid amount, remaining amount, due/follow-up
  state, and who recorded the payment.

#### Finance OUT Tab

- `OUT` shows supplier refill deals sent from inventory.
- Finance contacts or coordinates with the supplier for payment management.
- Finance records supplier payment notes and payment outcome.
- HyperQuote can pay the supplier 100% or 50%.
- If supplier payment is confirmed at 100% or 50%, the supplier refill is sent
  to warehouse so the incoming supplier truck can be received and unloaded.
- If supplier payment is 50%, the supplier refill stays visible in finance for
  future payment collection/completion.

#### Supplier Receiving Exception

- Warehouse can reject supplier stock if the received goods are wrong, damaged,
  short, or otherwise bad.
- Warehouse rejection does not mean the stock entered inventory.
- Warehouse rejection does not automatically return the supplier refill to
  finance as completed inventory.
- The supplier refill remains tracked as incoming/supplier issue so HyperQuote
  can keep following up with the supplier.
- Inventory stock increases only after warehouse approves and unloads the
  supplier delivery.

### Warehouse Panel

Warehouse manages physical movement in two tabs: `LOADING` for customer-bound
trucks and `RECEIVING` for supplier incoming trucks.

#### Warehouse LOADING Tab

- `LOADING` shows customer orders that inventory has filled/reserved and sent
  to warehouse.
- Warehouse selects one or more drivers for the order.
- Warehouse assigns specific reserved stock/items to each selected driver.
- Example: driver Ahmed can be assigned wood while driver Saleh is assigned
  metal for the same customer order.
- Warehouse selects an advisor for the order.
- The advisor must approve the whole loaded order before final takeoff.
- Warehouse loads the truck according to the reserved order items.
- Loading must confirm the actual items and quantities loaded.
- If loading and advisor approval are complete, the order is sent to dispatch
  for route/driver management.
- If loading finds a problem, the order remains in warehouse loading with an
  issue state until resolved.
- Loading an order does not consume inventory yet; inventory is consumed only
  when delivery is completed.

#### Warehouse RECEIVING Tab

- `RECEIVING` shows incoming supplier trucks sent by finance after supplier
  payment is confirmed.
- Warehouse selects an advisor for the receiving task.
- Warehouse unloads and checks the supplier delivery.
- The advisor must approve the whole received supplier delivery.
- If receiving and advisor approval are complete, warehouse records the
  received quantities and the inventory stock is increased.
- If receiving is not approved, the supplier delivery stays in the receiving
  list as incoming/supplier issue.
- Not-approved supplier stock must not be added to inventory.
- Receiving approval/rejection must record who checked it, received quantities,
  issue notes when rejected, and proof where practical.

### Dispatch Panel

Dispatch manages active deliveries after warehouse loading and advisor approval.
The panel has a live fleet map and a deliveries tab.

- Dispatch can see the full fleet.
- Dispatch sees all active trucks on the map.
- Dispatch sees all active customer delivery orders on the map.
- Truck/order live location comes from the driver app.
- Dispatch can see the driver, truck number, and assigned order for each active
  delivery.
- Example: if warehouse assigned order items to driver Ahmed, dispatch sees
  Ahmed, his truck number, and the assigned order.
- If one customer order is split across multiple drivers/trucks, dispatch sees
  each driver/truck assignment and the part of the order assigned to them.
- Dispatch tracks delivery state from warehouse handoff through driver takeoff,
  en route, arrival, delivery completion, and exceptions.
- Driver app updates must feed dispatch without giving drivers access to
  internal dispatch controls.

#### Dispatch Deliveries Tab

- Dispatch can see all active delivery orders.
- Dispatch can mark a delivery as delivered.
- Dispatch can mark a delivery as rejected.
- Delivered orders complete the delivery workflow and consume the reserved
  inventory permanently.
- Rejected deliveries are returned to the warehouse `LOADING` tab for review,
  reload, reassignment, or correction.
- Rejected delivery records must keep the reason, rejecting actor, driver/truck
  assignment, and current order/load state.

### Customer Service Panel

Customer service manages customer communication from website support tickets
and the HyperQuote WhatsApp Business account.

- Customer service can see all support tickets submitted from the website.
- Customer service can see all messages sent to the HyperQuote WhatsApp
  Business account.
- The WhatsApp channel used for signup/login OTP can also be used for customer
  support messaging.
- WhatsApp support messages are stored in Supabase as conversations/messages.
- Website support tickets are stored in Supabase as tickets with messages and
  status history.
- If a WhatsApp message comes from a phone number linked to a customer account,
  the conversation should attach to that customer.
- If the phone number is not linked to a customer account, the message is kept
  as an unlinked support conversation and can be linked later if the customer
  confirms their identity.
- Customer service can reply to website tickets by email.
- Customer service can reply to WhatsApp conversations through the WhatsApp
  Business channel.
- Customer service replies must be recorded before or while the external email
  or WhatsApp message is sent.
- Customer service can assign, update, close, or reopen support tickets and
  conversations.

### Admin Panel

Admin is the internal GUI for controlled database management. It can add,
remove, update, and export operational data, but every action must be guarded,
audited, and recoverable where practical.

- Admin can add and update catalog items.
- Admin can add and update item categories.
- Admin can add and update suppliers.
- Admin can add and update employees.
- Admin can assign and remove employee roles.
- Admin can remove items, categories, suppliers, and employees through safe
  workflows.
- Admin can export database data for approved operational needs.
- Admin should expose powerful database actions through clear forms and review
  screens, not raw SQL editing.
- Admin actions must be available only to users with the admin role.
- Dangerous admin actions should require confirmation and record a reason.
- Removal should default to soft-delete/deactivation when records have history.
- Hard delete is allowed only for safe records with no business history or
  through an explicit maintenance path.
- Employee removal should disable access instead of erasing historical actor
  references.
- Item/category removal should not rewrite old orders, quote versions, invoices,
  inventory movements, or activity history.
- Database exports must record who exported, what scope, when, and why.
- Exports should avoid secrets and should redact sensitive fields when the
  export purpose does not require them.
- Admin cannot bypass audit/history requirements.

### Search Panel

Search is the CEO-facing read surface for fast access to almost everything in
HyperQuote.

- Search is intended for the CEO role.
- Search reads from Supabase views or materialized views that summarize the
  operational database.
- Summary views should cover orders, customers, payments, inventory, warehouse,
  dispatch, drivers, support, suppliers, and activity/history.
- Search can query across those views to answer broad questions without opening
  each panel manually.
- Search results should link back to the source entity/panel when a deeper
  operational view is needed.
- Search is read-focused and must not become a bypass for workflow actions.
- CEO visibility can be broad, but sensitive fields still need intentional
  exposure rules.
- Search views should be designed for speed and safe summarization, not as the
  only source of truth.
- The source of truth remains the normalized operational tables and append-only
  history.

### Backend Rules

- Admin-created employee accounts require explicit roles.
- Employees can read and act only within their allowed panel roles.
- Sales assignment must be handled by a database transaction/RPC so work cannot
  be double-assigned.
- Saved/requeued orders must use a backend eligibility timestamp, not a
  client-side timer.
- Rejected and canceled orders must keep reason/history.
- Every reject action in the whole workflow requires proof.
- Reject actions without proof must fail validation.
- Rejection proof can be photos, files, inspection notes, customer refusal
  details, damaged-stock evidence, wrong-item evidence, or another approved
  proof type for that workflow step.
- Provisional customer accounts must be linked safely to the customer once
  phone/email confirmation succeeds.
- Manual phone orders must preserve the sales employee as the actor.
- Price requests must link to the live order, requested item, requesting sales
  employee, assigned inventory owner when available, and eventual proof upload.
- Customer order stock fill must reserve inventory transactionally so two
  orders cannot reserve the same available stock.
- Supplier refill stock must not increase available inventory until warehouse
  approval/unload is recorded.
- Rejected or canceled customer orders must release reserved inventory when the
  stock has not been delivered.
- Delivered customer orders consume the reserved inventory permanently.
- Supplier price updates must support one supplier updating multiple item
  prices in one action.
- Customer payment confirmation must be recorded before an order enters
  inventory.
- Customer partial payments must keep the order visible in finance until the
  remaining amount is collected or otherwise closed.
- Supplier payment confirmation must be recorded before a supplier refill enters
  warehouse receiving.
- Supplier partial payments must keep the refill visible in finance until the
  remaining amount is paid or otherwise closed.
- Warehouse rejection of supplier goods must not increase inventory and must
  keep the supplier refill tracked as incoming/supplier issue.
- Warehouse loading approval is required before a customer order can enter
  dispatch.
- Advisor approval of the whole loaded customer order is required before final
  takeoff.
- Driver stock assignments must not exceed the reserved stock for the order.
- Warehouse receiving approval is required before supplier refill stock can
  increase inventory.
- Advisor approval of the whole received supplier delivery is required before
  supplier refill stock can increase inventory.
- Dispatch visibility is based on warehouse-approved driver/truck assignments
  and driver app telemetry.
- Driver location updates must be scoped to assigned deliveries and visible to
  dispatch, not to unrelated drivers or customers beyond their own order
  tracking rules.
- Dispatch delivery rejection must return the order to warehouse loading without
  consuming the reserved inventory.
- Dispatch delivery completion consumes the reserved inventory and closes the
  active delivery assignment.
- Website tickets and WhatsApp support messages must both be persisted before
  they are treated as handled.
- WhatsApp support conversations must be linked by verified phone number when
  possible, but unlinked messages must still be accepted into customer service.
- Customer service replies must preserve actor, channel, ticket/conversation,
  message body, external provider status, and timestamp.
- Admin writes must go through validated server functions/RPC and must write
  audit events.
- Admin removal defaults to soft-delete/deactivation for records that may be
  referenced by business history.
- Database exports must be scoped, audited, and protected from exposing secrets.
- Search reads must use approved Supabase views/materialized views and must be
  scoped to the CEO/search role.
- Search must not perform workflow writes or bypass panel-specific
  authorization.
- Search summary views must not replace normalized source tables or
  append-only activity history.

### Data Needed

- Internal auth users.
- Employee profiles.
- Employee roles.
- Employee online/presence state.
- Sales pipeline assignments.
- Sales queue eligibility timestamps.
- Sales quote versions.
- Sales call notes.
- Provisional customer accounts.
- Manual sales orders.
- Item price freshness state.
- Price update requests.
- Supplier price proofs.
- Inventory items.
- Stock levels.
- Stock reservations.
- Supplier item mappings.
- Supplier refill deals.
- Supplier payment handoffs.
- Warehouse receiving approvals.
- Customer payment records.
- Supplier payment records.
- Finance follow-up records.
- Supplier receiving issue records.
- Warehouse loading tasks.
- Warehouse receiving tasks.
- Driver load assignments.
- Advisor load approvals.
- Advisor receiving approvals.
- Truck load confirmations.
- Receiving inspection records.
- Dispatch delivery assignments.
- Truck registry.
- Driver live locations.
- Delivery route/status records.
- Delivery rejection records.
- Support tickets.
- Support conversations.
- Support messages.
- WhatsApp inbound messages.
- WhatsApp outbound messages.
- Support assignment/status records.
- Admin audit events.
- Admin export records.
- Soft-delete/deactivation fields.
- Search summary views.
- Search query audit records.
- Activity/history events.

### Events

- `internal_employee_created`
- `internal_employee_role_assigned`
- `sales_order_auto_assigned`
- `sales_order_saved`
- `sales_order_requeued`
- `sales_order_rejected`
- `manual_order_started`
- `provisional_customer_created`
- `provisional_customer_confirmed`
- `manual_order_quoted`
- `sales_order_sent_to_finance`
- `price_update_requested`
- `supplier_price_proof_uploaded`
- `item_price_updated`
- `inventory_refill_started`
- `supplier_refill_deal_created`
- `supplier_refill_sent_to_finance`
- `customer_payment_discussion_started`
- `customer_payment_recorded`
- `customer_partial_payment_recorded`
- `customer_order_sent_to_inventory`
- `supplier_payment_discussion_started`
- `supplier_payment_recorded`
- `supplier_partial_payment_recorded`
- `supplier_refill_sent_to_warehouse`
- `supplier_receiving_issue_opened`
- `warehouse_loading_started`
- `warehouse_driver_assigned`
- `warehouse_stock_assigned_to_driver`
- `warehouse_advisor_assigned`
- `warehouse_advisor_approved`
- `warehouse_loading_approved`
- `warehouse_loading_issue_opened`
- `customer_order_sent_to_dispatch`
- `warehouse_receiving_started`
- `warehouse_receiving_advisor_assigned`
- `warehouse_receiving_advisor_approved`
- `warehouse_receiving_approved`
- `warehouse_receiving_rejected`
- `dispatch_delivery_created`
- `dispatch_truck_location_updated`
- `dispatch_delivery_status_updated`
- `dispatch_delivery_exception_opened`
- `dispatch_delivery_delivered`
- `dispatch_delivery_rejected`
- `delivery_returned_to_warehouse_loading`
- `support_ticket_assigned`
- `support_ticket_replied`
- `support_ticket_closed`
- `whatsapp_support_message_received`
- `whatsapp_support_message_replied`
- `support_conversation_linked_to_customer`
- `admin_record_created`
- `admin_record_updated`
- `admin_record_deactivated`
- `admin_role_assigned`
- `admin_role_removed`
- `admin_database_exported`
- `search_query_executed`
- `supplier_delivery_unloaded`
- `supplier_delivery_rejected`
- `inventory_stock_increased`
- `inventory_order_received`
- `inventory_stock_reserved`
- `inventory_stock_released`
- `inventory_stock_consumed`

## Driver App

The driver app is the field delivery app. Drivers use it to go online, receive
warehouse-assigned work, navigate to the customer, collect customer signature,
and report delivered or rejected delivery outcomes.

### Actors

- `driver`: company-created driver user.
- `warehouse_employee`: assigns loaded stock/orders to online drivers.
- `dispatch_employee`: monitors live fleet and delivery status.
- `customer_receiver`: customer-side person who signs for delivery.
- `system`: backend process that sends notifications, records telemetry, and
  updates delivery state.

### Driver Availability

- A driver can mark themselves online from the driver app.
- When online, the driver app tracks driver location for dispatch fleet
  visibility.
- Warehouse can see online drivers while loading customer orders.
- Warehouse can assign orders and specific stock/items only to eligible online
  drivers.
- Driver online/offline state must be live enough for warehouse and dispatch to
  avoid assigning unavailable drivers.

### Assignment Flow

- Warehouse assigns the driver during the `LOADING` flow.
- The driver receives a notification that they have been assigned to an order.
- The driver can see assigned order details needed for delivery.
- The driver can see the delivery location on a map.
- The driver can see customer contact information needed for delivery.
- The driver can see the truck/order assignment connected to them.
- Driver assignment data feeds dispatch so dispatch can see driver, truck
  number, and assigned order.

### Delivery Flow

- Driver app keeps sending live location updates for dispatch while the driver
  is online.
- Driver app sends live location updates while the delivery is active.
- Driver app updates feed dispatch live fleet tracking.
- When the driver reaches the customer, the customer signs on the driver's
  phone/tablet.
- Customer signature confirms receipt.
- Confirmed delivery completes the delivery workflow and consumes the reserved
  inventory.
- Signature proof is stored as delivery proof and linked to the order,
  customer, driver, truck, timestamp, and location where practical.

### Driver Rejection Flow

- If delivery is rejected in the field, the driver can press `Reject`.
- Driver rejection requires proof.
- Driver rejection proof must include a reason and supporting evidence where
  practical, such as photos, customer refusal details, damaged goods evidence,
  blocked site access, or wrong-location evidence.
- A rejected driver delivery returns the order to the warehouse `LOADING` tab.
- Returned loading tasks preserve the previous driver, truck, load assignment,
  rejection reason, proof, and current stock/load state.
- Rejected driver deliveries do not consume reserved inventory.

### Backend Rules

- Driver accounts are company-created only.
- Drivers can access only their assigned deliveries.
- Driver location updates support always-on dispatch fleet tracking while the
  driver is online.
- Delivery/order location context is scoped to active assigned deliveries.
- Warehouse can assign deliveries only to eligible online drivers.
- Delivery confirmation requires customer signature proof.
- Delivery rejection requires proof and returns the order to warehouse loading.
- Driver app cannot directly edit sales, finance, inventory, warehouse,
  dispatch, support, admin, or search data.

### Data Needed

- Driver auth users.
- Driver profiles.
- Driver online/presence state.
- Driver assignment notifications.
- Driver delivery assignments.
- Driver live locations.
- Delivery maps/locations.
- Customer delivery contact snapshot.
- Delivery signature records.
- Delivery proof attachments.
- Driver rejection records.
- Activity/history events.

### Events

- `driver_marked_online`
- `driver_marked_offline`
- `driver_assigned_delivery`
- `driver_assignment_notified`
- `driver_location_updated`
- `driver_arrived`
- `customer_signature_captured`
- `driver_delivery_confirmed`
- `driver_delivery_rejected`
- `driver_rejection_proof_uploaded`
- `driver_delivery_returned_to_warehouse_loading`
