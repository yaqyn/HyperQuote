# Guest Orders and Account Claiming in B2B

## Research Date: March 2026
## Context: HyperQuote - Egyptian B2B Building Materials Platform
## Stack: Supabase + TanStack Start + Phone-based OTP

---

## 1. The Scenario

A customer calls HyperQuote by phone, never having visited the website. A sales rep takes the order (company name, contact name, phone number, materials needed). The system creates a customer record with phone number but NO login credentials. The order proceeds normally. Later, the customer signs up on the portal, enters their phone number, receives OTP, and sees all their previous phone-order history.

---

## 2. Industry Patterns for Guest/Phone Orders

### Shopify B2B: Draft Orders
Shopify B2B uses **draft orders** for phone/email/in-person sales. Sales reps create draft orders on behalf of customers from the admin panel, select or create a customer record, add products, set payment terms ("Payment due later"), and either send an invoice or mark as paid. However, Shopify B2B **requires** customer accounts to be activated before B2B features work -- there is no true "credentialless customer record" pattern.

### OroCommerce: Guest Customer Users
OroCommerce has a `GuestCustomerUserManager` class that creates **guest customer user entities** under an "Anonymous Customer" organization. Guest users are part of a **Non-Authenticated Visitors** group. After checkout, guests "are still able to sign up for an account." OroCommerce also supports **record merging** for accounts, contacts, and campaigns. However, the specific linking mechanism between guest activity and later registration is not well-documented publicly.

### Common B2B Pattern: Post-Purchase Account Conversion
The dominant pattern across B2B platforms is:
1. Allow the transaction to happen with minimal friction (guest/phone/draft order)
2. Store essential data (phone, email, company name) as a customer record
3. After the transaction, prompt: "Save your details for next time" or "Track your order easily"
4. Use the stored identifier (email or phone) to link the guest purchase history to the new account

---

## 3. Recommended Architecture for Supabase

### The Two-Table Pattern: `customers` vs `auth.users`

The key insight: **decouple the business entity (customer) from the authentication identity (auth user)**.

```
customers table (public schema)
├── id: uuid (PK, generated)
├── company_name: text (required)
├── contact_name: text (required)
├── phone: text (required, indexed)
├── email: text (nullable)
├── delivery_address: jsonb (nullable)
├── status: enum ('unclaimed', 'claimed', 'active')
├── auth_user_id: uuid (nullable, FK → auth.users)
├── created_by: uuid (FK → auth.users, the sales rep)
├── created_at: timestamptz
├── claimed_at: timestamptz (nullable)
└── metadata: jsonb
```

**When a sales rep creates a customer by phone:**
- A row is inserted into `customers` with `status = 'unclaimed'` and `auth_user_id = NULL`
- NO entry is created in `auth.users`
- Orders reference `customers.id`, not `auth.users.id`

**When the customer signs up on the portal:**
- They enter their phone number
- The system sends OTP to that phone number
- On verification, a new `auth.users` entry is created
- The system checks `customers` table for matching phone number
- If found: sets `customers.auth_user_id = auth_user.id`, `status = 'claimed'`, `claimed_at = now()`
- All orders linked to that `customers.id` are now visible to the authenticated user

### Why NOT Use Supabase Anonymous Sign-Ins

Supabase anonymous sign-ins create an entry in `auth.users` with `is_anonymous = true`. This is designed for browser sessions (shopping carts, demos), NOT for sales-rep-created records. Problems:
- Anonymous users are tied to a browser session and device
- They cannot be "claimed" by a different person/device later
- They create unnecessary `auth.users` entries for customers who may never sign up
- The conversion flow (anonymous → permanent) requires the SAME session, which is impossible when a sales rep creates the record and the customer later claims it from a different device

### Why NOT Use `admin.createUser` for Phone Orders

You could use `supabase.auth.admin.createUser({ phone: '+201234567890', phone_confirm: true })` to pre-create an auth user. But this has problems:
- Creates an auth user who has never actually authenticated
- When the customer later calls `signInWithOtp({ phone })`, Supabase finds an existing user and sends OTP -- but the customer has no context of what account they are signing into
- If you set `phone_confirm: true`, the phone is marked as verified even though the customer never verified it
- Pollutes `auth.users` with records that may never be claimed

### The Clean Pattern: Customer Record First, Auth Later

```
Phone Order Flow:
  Sales Rep → INSERT into customers (phone, company, contact) → status='unclaimed'
  Sales Rep → INSERT into orders (customer_id, items, ...) → proceeds normally

Account Claiming Flow:
  Customer → enters phone on portal
  System → SELECT from customers WHERE phone = :phone AND status = 'unclaimed'
  If found → send OTP via supabase.auth.signInWithOtp({ phone })
  Customer → enters OTP → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  This creates a NEW auth.users entry (signInWithOtp creates user if not exists)
  System → UPDATE customers SET auth_user_id = auth.uid(), status = 'claimed'
  Customer → sees all orders linked to their customer_id
```

---

## 4. Implementation Details for Supabase + TanStack Start

### Database Schema

```sql
-- Customers table: the business entity
CREATE TABLE public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  phone_secondary text,
  email text,
  delivery_address jsonb,
  tax_id text,              -- Egyptian tax registration
  commercial_register text, -- Egyptian commercial register number
  status text NOT NULL DEFAULT 'unclaimed'
    CHECK (status IN ('unclaimed', 'claimed', 'active', 'suspended')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),  -- sales rep who created it
  created_at timestamptz DEFAULT now(),
  claimed_at timestamptz,
  notes text,               -- internal notes from sales rep
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index for account claiming lookup
CREATE UNIQUE INDEX idx_customers_phone ON public.customers(phone)
  WHERE status != 'suspended';

-- Orders always reference customers, never auth.users directly
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  order_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  items jsonb NOT NULL,
  total_amount numeric,
  currency text DEFAULT 'EGP',
  created_by uuid REFERENCES auth.users(id),  -- could be sales rep or customer
  created_at timestamptz DEFAULT now(),
  -- ... other order fields
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

-- RLS: customers can only see their own customer record
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Sales reps can see all customers
CREATE POLICY "Sales reps can manage customers" ON public.customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employee_roles
      WHERE user_id = auth.uid()
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- Customers can see their own record after claiming
CREATE POLICY "Customers see own record" ON public.customers
  FOR SELECT USING (auth_user_id = auth.uid());

-- RLS for orders: customers see orders linked to their customer_id
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = orders.customer_id
      AND customers.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employee_roles
      WHERE user_id = auth.uid()
      AND role IN ('sales_rep', 'sales_manager', 'admin', 'warehouse')
    )
  );
```

### Account Claiming Server Function (TanStack Start)

```typescript
// src/server/functions/claim-account.ts
import { createServerFn } from '@tanstack/start'
import { createClient } from '@supabase/supabase-js'

// Step 1: Check if phone number has unclaimed customer record
export const checkPhoneForClaiming = createServerFn('POST', async (payload: { phone: string }) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
  )

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, company_name, contact_name, status')
    .eq('phone', payload.phone)
    .eq('status', 'unclaimed')
    .maybeSingle()

  if (error) throw new Error('Failed to check phone number')

  return {
    hasExistingRecord: !!customer,
    // Don't expose full details -- just confirm company name initial
    // for the customer to recognize: "We found a record for A**** C****"
    companyHint: customer
      ? customer.company_name.charAt(0) + '****'
      : null,
    contactHint: customer
      ? customer.contact_name.charAt(0) + '****'
      : null,
  }
})

// Step 2: After OTP verification, link the auth user to customer record
export const linkAuthToCustomer = createServerFn('POST', async (payload: {
  authUserId: string,
  phone: string
}) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find the unclaimed customer record
  const { data: customer, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', payload.phone)
    .eq('status', 'unclaimed')
    .is('auth_user_id', null)
    .maybeSingle()

  if (findError) throw new Error('Failed to find customer record')

  if (!customer) {
    // No existing record -- this is a brand new customer signing up
    // Create a new customer record linked to auth
    const { error: createError } = await supabase
      .from('customers')
      .insert({
        phone: payload.phone,
        company_name: '', // they'll fill this in during onboarding
        contact_name: '', // they'll fill this in during onboarding
        status: 'active',
        auth_user_id: payload.authUserId,
        claimed_at: new Date().toISOString(),
      })

    if (createError) throw new Error('Failed to create customer record')
    return { type: 'new_account', needsOnboarding: true }
  }

  // Link existing unclaimed record to this auth user
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      auth_user_id: payload.authUserId,
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    })
    .eq('id', customer.id)

  if (updateError) throw new Error('Failed to claim customer record')

  return { type: 'claimed_existing', customerId: customer.id }
})
```

### Client-Side Claiming Flow (TanStack Start)

```typescript
// src/routes/signup.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '~/lib/supabase'
import { checkPhoneForClaiming, linkAuthToCustomer } from '~/server/functions/claim-account'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'otp' | 'onboarding'>('phone')
  const [claimInfo, setClaimInfo] = useState<{ hasExistingRecord: boolean; companyHint: string | null } | null>(null)

  async function handlePhoneSubmit() {
    // Step 1: Check if this phone has an existing customer record
    const result = await checkPhoneForClaiming({ phone })
    setClaimInfo(result)

    // Step 2: Send OTP regardless (creates auth user if needed)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) {
      console.error('Failed to send OTP:', error)
      return
    }
    setStep('otp')
  }

  async function handleOtpVerify(token: string) {
    // Step 3: Verify OTP -- this creates the auth.users entry
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })
    if (error) {
      console.error('OTP verification failed:', error)
      return
    }

    // Step 4: Link auth user to customer record
    const linkResult = await linkAuthToCustomer({
      authUserId: data.user!.id,
      phone,
    })

    if (linkResult.type === 'claimed_existing') {
      // Redirect to portal -- they'll see all their order history
      window.location.href = '/portal'
    } else {
      // New customer -- needs to fill in company details
      setStep('onboarding')
    }
  }

  return (
    <div>
      {step === 'phone' && (
        <form onSubmit={(e) => { e.preventDefault(); handlePhoneSubmit() }}>
          <label>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+20 1XX XXX XXXX"
          />
          <button type="submit">Continue</button>
        </form>
      )}

      {step === 'otp' && (
        <div>
          {claimInfo?.hasExistingRecord && (
            <div>
              We found an existing account for {claimInfo.companyHint}.
              Verify your phone number to access your order history.
            </div>
          )}
          <OtpInput onComplete={handleOtpVerify} />
        </div>
      )}

      {step === 'onboarding' && (
        <OnboardingForm phone={phone} />
      )}
    </div>
  )
}
```

---

## 5. Sales Rep "Add Customer" UI -- Minimum Fields

### Required Fields (Minimum Viable)
| Field | Why |
|-------|-----|
| **Phone number** | Primary identifier for account claiming. Egyptian mobile: +20 1XX XXX XXXX |
| **Company name** | Business identity for invoicing, delivery, credit |
| **Contact name** | Who the sales rep spoke to |

### Highly Recommended Fields
| Field | Why |
|-------|-----|
| **Delivery address** | Needed for the first order anyway |
| **Project name/site** | Common in building materials -- "Villa in 6th October" helps track context |
| **Secondary phone** | Egyptian business practice: office landline + mobile |
| **Notes** | Free text for the sales rep: "Referred by Ahmed at XYZ", "Needs steel delivery by Thursday" |

### Optional Fields (Can Be Filled Later)
| Field | Why |
|-------|-----|
| **Email** | Not common for Egyptian B2B; useful if they want portal access |
| **Tax ID** | Needed for formal invoicing, but not for quoting |
| **Commercial register** | Required for large orders/credit terms |
| **Preferred payment method** | Wire, check, LC -- helps with order processing |

### Sales Rep UI Data Flow

```
Sales Rep clicks "New Customer" →
  Minimal form appears:
    Phone*:      [+20 ___________]
    Company*:    [________________]
    Contact*:    [________________]
    ---
    Delivery:    [________________] (optional, expandable)
    Project:     [________________] (optional)
    Notes:       [________________] (optional)

  On submit → system checks if phone already exists:
    If exists → show existing record, offer to add new contact/order
    If new → create customer record with status='unclaimed'

  Then immediately → "Add Order for this Customer" →
    Quote flow begins
```

---

## 6. Order History Continuity

### The Key: Single `customer_id` Across All Orders

Orders are ALWAYS linked to `customers.id`, never to `auth.users.id`. This means:

```
Phone order (created by sales rep):
  orders.customer_id = customers.id (where auth_user_id IS NULL)
  orders.created_by = sales_rep_auth_id

Portal order (created by customer):
  orders.customer_id = customers.id (where auth_user_id = customer's auth id)
  orders.created_by = customer_auth_id

Both orders share the same customer_id → seamless history
```

### RLS Policy for Seamless History

```sql
-- Customer sees ALL orders linked to their customer record
-- regardless of who created them
CREATE POLICY "Customers see own orders" ON public.orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE auth_user_id = auth.uid()
    )
  );
```

### What the Customer Sees After Claiming

```
My Orders
─────────────────────────────────────────
#  | Date       | Items              | Status    | Created Via
1  | 2026-01-15 | 50 tons cement     | Delivered | Phone Order
2  | 2026-02-03 | Steel rebar 12mm   | Delivered | Phone Order
3  | 2026-03-10 | 200 bags plaster   | In Transit| Phone Order
4  | 2026-03-28 | Ceramic tiles 60x60| Quoted    | Portal
─────────────────────────────────────────
```

The "Created Via" column is derived from whether `orders.created_by` matches the customer's `auth_user_id` or a staff member's.

---

## 7. Security Considerations

### Threat: Phone Number Spoofing

**Attack:** Someone learns a customer's phone number, signs up with that number on the portal, receives OTP (via SIM swap or social engineering), and gains access to order history.

**Mitigations:**

1. **OTP is the primary defense.** The OTP goes to the actual phone number. If the attacker does not possess the physical phone, they cannot complete verification. This is adequate for the threat model of a B2B building materials platform (not a bank).

2. **Rate limiting on OTP requests.** Supabase enforces 30 OTP requests per hour per IP by default. Configure additional limits.

3. **Hint, don't reveal.** When checking if a phone number has an existing record, return only a masked company name hint ("A**** C****"), not full details. This prevents information leakage.

4. **Audit trail.** Log every account claiming event with IP, user agent, timestamp. Alert the sales rep who created the original record.

5. **Staff notification.** When a customer record is claimed, notify the assigned sales rep: "Your customer Al-Ahram Construction just claimed their portal account." If it is fraudulent, the sales rep can flag it.

### Threat: Shared Company Phone Numbers

**Scenario:** A company has one main number (+20 2 XXXX XXXX). Multiple employees call from it. Two people try to claim the account.

**Solution:**

```sql
-- Allow multiple contacts per customer
CREATE TABLE public.customer_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  contact_name text NOT NULL,
  phone text NOT NULL,
  role text,  -- 'owner', 'procurement', 'site_manager'
  auth_user_id uuid REFERENCES auth.users(id),
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

This way, the `customers` table represents the **company**, and `customer_contacts` represents **individuals**. Multiple people can claim access to the same company's orders, each with their own phone number and auth credentials. The first person to claim becomes the primary contact; subsequent claimants are added as additional contacts (possibly requiring approval from the primary).

### Threat: Phone Number Changed

**Scenario:** Customer's phone number changed since the original phone order.

**Solutions:**
1. **Sales rep update:** The customer calls, explains the situation, sales rep updates the phone number on the customer record, then the customer claims with the new number.
2. **Support flow:** Customer contacts support with verifying information (company name, order numbers, delivery addresses) and support updates the phone.
3. **No self-service phone change for unclaimed accounts.** This is intentional -- it prevents unauthorized claiming.

### Threat: SIM Swap Attacks

**Risk level:** Low for B2B building materials. SIM swap attacks target high-value financial accounts, not construction material order histories.

**If concerned:**
- Add a secondary verification factor: ask the customer to confirm their last order details or delivery address during the claiming flow
- Implement a brief hold period: "Your account claim is being verified. You'll have access within 24 hours." This gives the real customer time to notice unauthorized activity.

---

## 8. Complete Flow Diagram

```
PHONE ORDER FLOW
════════════════
Customer ──calls──→ Sales Rep
                      │
                      ├─ "New Customer" button
                      │   └─ Enters: phone, company, contact
                      │   └─ System creates: customers row (status=unclaimed, auth_user_id=NULL)
                      │
                      ├─ "New Order" for this customer
                      │   └─ Quote → Confirm → Fulfill → Invoice
                      │   └─ Order linked to customers.id
                      │
                      └─ Done. Customer has orders but no portal access.


ACCOUNT CLAIMING FLOW
═════════════════════
Customer ──visits portal──→ "Sign Up" page
                              │
                              ├─ Enters phone number
                              │   └─ Server checks: any unclaimed customer with this phone?
                              │   └─ Returns hint: "Found record for A**** C****"
                              │
                              ├─ OTP sent to phone
                              │   └─ supabase.auth.signInWithOtp({ phone })
                              │   └─ This creates auth.users entry on verification
                              │
                              ├─ Customer enters OTP
                              │   └─ supabase.auth.verifyOtp({ phone, token, type: 'sms' })
                              │   └─ auth.users row now exists
                              │
                              ├─ Server links: customers.auth_user_id = auth.uid()
                              │   └─ status changes: unclaimed → claimed
                              │
                              └─ Customer enters portal → sees ALL previous orders
                                  └─ RLS policy: orders WHERE customer_id IN
                                     (SELECT id FROM customers WHERE auth_user_id = auth.uid())


RETURNING CUSTOMER FLOW
═══════════════════════
Customer ──visits portal──→ "Sign In" page
                              │
                              ├─ Enters phone number
                              │   └─ supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } })
                              │   └─ Only works if auth.users entry already exists
                              │
                              ├─ OTP sent → verified → session created
                              │
                              └─ Customer enters portal → sees all orders
```

---

## 9. Key Implementation Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Customer identity | `customers` table in public schema | Decoupled from auth; exists before authentication |
| Auth integration | `auth_user_id` nullable FK on customers | NULL = unclaimed, populated = claimed |
| Primary identifier | Phone number | Egyptian B2B norm; more reliable than email |
| Auth method | Phone OTP via Supabase | No passwords to manage; phone proves identity |
| Order linking | Orders reference `customers.id` | Consistent whether phone order or portal order |
| Account claiming trigger | Phone number match | OTP to actual phone number = verification |
| Anonymous sign-ins | NOT used | Wrong pattern for sales-rep-created records |
| admin.createUser | NOT used | Pollutes auth.users; wrong ownership model |
| Multiple contacts | `customer_contacts` table | Company = customer, people = contacts |
| Sign-in for existing users | `shouldCreateUser: false` | Prevents accidental new account creation on login page |
| Sign-up for new users | `shouldCreateUser: true` (default) | Creates auth.users entry on first OTP verification |
| Security model | OTP + masked hints + audit trail | Proportionate to B2B building materials threat model |

---

## Sources

- [Shopify B2B Draft Orders](https://help.shopify.com/en/manual/b2b/checkout-and-orders/draft-orders)
- [Shopify Guest Checkout](https://www.shopify.com/enterprise/blog/guest-checkout)
- [OroCommerce Guest Functions](https://doc.oroinc.com/1.6/user/concept-guides/guests/)
- [OroCommerce Order Management](https://doc.oroinc.com/user/concept-guides/customers-sales/orders/)
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login)
- [Supabase signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Supabase admin.createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase Users Documentation](https://supabase.com/docs/guides/auth/users)
- [Supabase Discussion: Creating Users Without Signup](https://github.com/orgs/supabase/discussions/1327)
- [BigCommerce B2B Checkout](https://www.bigcommerce.com/articles/b2b-ecommerce/b2b-checkout/)
- [Sana Commerce B2B Checkout Optimization](https://www.sana-commerce.com/blog/checkout-optimization/)
- [Vonage Guide to Verifying Users in Ecommerce](https://www.vonage.com/resources/publications/verifying-users-ecommerce/)
- [OTP Verification for eCommerce - Dexatel](https://dexatel.com/blog/otp-verification-for-ecommerce/)
