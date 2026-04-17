import type { WizardStep } from '../registry'

export const steps: WizardStep[] = [
	{
		id: 'portal-setup',
		titleKey: 'docs.wizard.for-suppliers.steps.portalSetup.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.portalSetup.body',
		title: 'Set Up Your Portal',
		body: 'Register your company, upload your trade license and tax card, and complete compliance verification. Once approved, your supplier portal is ready — the whole process is digital, no paperwork to mail.',
		illustration: 'signup',
		tip: 'docs.wizard.for-suppliers.steps.portalSetup.tip',
		tipText:
			'Have your 9-digit Tax Registration Number (TRN) ready — it is required for ETA e-invoicing compliance.',
	},
	{
		id: 'publish-catalog',
		titleKey: 'docs.wizard.for-suppliers.steps.publishCatalog.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.publishCatalog.body',
		title: 'Publish Your Catalog',
		body: 'Upload your product catalog in any format — PDF, Excel, or CSV. Our AI parses it automatically and extracts structured product data. Review the results side-by-side with your original document before publishing.',
		illustration: 'browse',
		tipText:
			'AI extraction handles 200-page catalogs with 85-95% accuracy. You just review and confirm.',
	},
	{
		id: 'set-pricing',
		titleKey: 'docs.wizard.for-suppliers.steps.setPricing.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.setPricing.body',
		title: 'Set Your Pricing',
		body: 'Manage prices individually or in bulk. Upload a new price list and AI will draft the changes for you. Set regional pricing, volume tiers, and validity periods. Every price change is tracked with a full audit trail.',
		illustration: 'quote',
		tip: 'docs.wizard.for-suppliers.steps.setPricing.tip',
		tipText:
			'Your prices are never visible to end customers. HyperQuote applies its own margins before quoting.',
	},
	{
		id: 'receive-po',
		titleKey: 'docs.wizard.for-suppliers.steps.receivePo.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.receivePo.body',
		title: 'Receive Purchase Orders',
		body: 'When a customer accepts a quote containing your products, you receive a purchase order in your portal. Review the items, quantities, and delivery requirements, then confirm or flag any issues.',
		illustration: 'submit',
		tipText:
			'POs are anonymized — you see the delivery address but never the end customer name.',
	},
	{
		id: 'confirm-fulfillment',
		titleKey: 'docs.wizard.for-suppliers.steps.confirmFulfillment.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.confirmFulfillment.body',
		title: 'Confirm Fulfillment',
		body: 'Mark the PO as ready for dispatch and schedule the delivery date. For drop-ship orders, print the HyperQuote-branded delivery note and attach it to the shipment — this is required for every delivery.',
		illustration: 'verify',
		tipText:
			'The system generates the branded delivery note automatically. Just print and include it with the shipment.',
	},
	{
		id: 'upload-delivery-note',
		titleKey: 'docs.wizard.for-suppliers.steps.uploadDeliveryNote.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.uploadDeliveryNote.body',
		title: 'Upload Delivery Proof',
		body: 'After delivery, upload the signed delivery note and any supporting documents. This triggers the three-way matching process — PO, delivery note, and invoice — which accelerates your payment.',
		illustration: 'track',
		tipText:
			'Complete documentation means faster payment. Missing delivery notes delay the matching process.',
	},
	{
		id: 'track-payments',
		titleKey: 'docs.wizard.for-suppliers.steps.trackPayments.title',
		bodyKey: 'docs.wizard.for-suppliers.steps.trackPayments.body',
		title: 'Track Your Payments',
		body: 'View all invoices, payment status, and settlement history in one place. See gross amount, 1% withholding tax deduction, and net payment. Track outstanding balances and expected payment dates.',
		illustration: 'support',
		tipText:
			'HyperQuote withholds 1% per Egyptian tax law and remits it quarterly. You receive a withholding certificate for your records.',
	},
]
