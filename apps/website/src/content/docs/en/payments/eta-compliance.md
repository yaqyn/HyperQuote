Electronic invoicing through the Egyptian Tax Authority is not optional — it is a legal requirement for all B2B transactions in Egypt. HyperQuote handles ETA compliance automatically, so every invoice, credit note, and debit note meets the authority's requirements without manual intervention on your part.

## What ETA e-invoicing requires

The Egyptian Tax Authority mandates that all B2B invoices be submitted electronically in a structured digital format. This applies to every invoice HyperQuote generates on your behalf. The core requirements are:

- **Digital format** — Invoices submitted in JSON/XML to the ETA platform, not just PDF
- **Digital signature** — Every invoice must be digitally signed using a certificate issued through ITIDA (the Information Technology Industry Development Agency), either via hardware security module (HSM) or software-based signing
- **Real-time submission** — Invoices are submitted to ETA on the same day as the transaction. There is no grace period for delayed reporting
- **ETA UUID** — Each invoice receives a unique identifier from the ETA system upon acceptance
- **Both parties identified** — Seller and buyer Tax Registration Numbers (9-digit TRN) are required on every document

## Product codes

Every product on an invoice requires an **EGS (Egyptian General Standard)** or **GPC (Global Product Classification)** code. These standardized codes identify the product type for the tax authority. The HyperQuote catalog enforces code assignment — products cannot appear on invoices without a valid EGS/GPC classification.

When suppliers publish products through the supplier portal, they assign these codes during the catalog setup process. The system validates code presence and format before a product is approved for invoicing.

## How HyperQuote handles compliance

The entire ETA integration is built into the invoicing pipeline. When a delivery is confirmed and an invoice is generated:

1. The system populates all required fields (seller TRN, buyer TRN, product codes, quantities, prices, VAT calculation)
2. The invoice is digitally signed using HyperQuote's ITIDA-issued certificate
3. The signed invoice is submitted to the ETA platform in real-time
4. The ETA returns a UUID confirming acceptance
5. The UUID is recorded on the invoice and included in the PDF sent to you

You receive a fully ETA-compliant invoice without needing to interact with the tax authority's systems yourself.

## Credit notes and adjustments

ETA e-invoices cannot be deleted or modified after submission. If there is an error, a price adjustment, or a damage claim, the correction is made through a **credit note** (or debit note), which is itself an ETA-compliant document with its own UUID.

Credit notes must reference the original invoice UUID and cannot exceed the original invoice amounts. The VAT adjustment from a credit note applies to the period in which the credit note is issued, not the period of the original invoice.

Non-compliance with credit note requirements carries penalties of EGP 20,000 to 100,000.

## Zero-value items

The ETA system does not accept line items with a value of EGP 0. This matters when issuing free replacement materials for damaged goods. Instead of invoicing at zero, the system issues a credit note against the original invoice and a new invoice for the replacement at the original price. The net effect to you is zero, but both documents are valid ETA submissions.

## Your responsibilities

As the buyer, you need to ensure your **Tax Registration Number** is current and provided to HyperQuote during account setup. Invoice disputes should be raised promptly — the standard dispute window is 72 hours from delivery. If you reject an invoice on the ETA portal, the resolution process goes through credit/debit notes, and all records must be retained for 5 years as required by Egyptian tax law.
