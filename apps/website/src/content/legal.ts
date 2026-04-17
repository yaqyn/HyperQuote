export interface LegalSection {
	number: string
	title: string
	content: string[]
}

export const TERMS_SECTIONS: LegalSection[] = [
	{
		number: '01',
		title: 'Acceptance of Terms',
		content: [
			'By accessing or using the HyperQuote platform, you agree to be bound by these Terms of Service and all applicable Egyptian laws and regulations. If you are using the platform on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these terms.',
			'If you do not agree to these terms, you may not access or use the platform. We reserve the right to refuse service to anyone for any reason at any time.',
		],
	},
	{
		number: '02',
		title: 'The Platform',
		content: [
			'HyperQuote is a B2B digital platform that connects contractors and construction companies with verified building materials suppliers across Egypt. We facilitate the request-for-quote (RFQ) process, supplier coordination, order management, delivery logistics, and payment processing.',
			'HyperQuote acts as an intermediary platform. We are not a supplier, manufacturer, or distributor of building materials. While we verify suppliers on our platform, we do not guarantee the quality, safety, or fitness of any materials. All material warranties and guarantees are the responsibility of the respective suppliers.',
			'We deliver consolidated quotes during business hours (Sunday through Thursday, 9:00 AM to 5:00 PM Egypt Standard Time). Response times vary based on request complexity, material availability, and supplier capacity.',
		],
	},
	{
		number: '03',
		title: 'Accounts & Registration',
		content: [
			'To use the platform, you must register a business account with valid commercial registration, tax identification number, and authorized representative details. You are responsible for maintaining the accuracy of your account information and the confidentiality of your login credentials.',
			'Each account is tied to a single legal entity. You may not share accounts between companies or create multiple accounts for the same entity without prior written approval. You are responsible for all activity that occurs under your account, including actions taken by employees or agents you authorize.',
			'We reserve the right to suspend or terminate accounts that provide false registration information, engage in fraudulent activity, repeatedly fail to fulfill payment obligations, or violate these terms. Account suspension does not relieve you of outstanding payment obligations.',
		],
	},
	{
		number: '04',
		title: 'Quote-Based Pricing',
		content: [
			'All pricing on HyperQuote is quote-based. We do not publish fixed prices. Quotes are generated based on current supplier availability, material specifications, quantities, delivery location, and market conditions. Quoted prices include applicable taxes unless explicitly stated otherwise.',
			'Quotes are valid for the period specified in each quote document, typically 48 to 72 hours. Prices may change after the validity period expires due to market fluctuations, supplier availability, or changes in applicable taxes. All prices are quoted in Egyptian Pounds (EGP) and include 14% Value Added Tax (VAT) as required by Egyptian tax law.',
			'Accepting a quote constitutes a binding order. Once a quote is accepted and confirmed, the quoted price is locked for that order regardless of subsequent market changes. Partial acceptance of multi-line quotes is permitted only where explicitly indicated.',
		],
	},
	{
		number: '05',
		title: 'Orders & Delivery',
		content: [
			'Confirmed orders are processed and scheduled for delivery based on the timeline specified in the accepted quote. Delivery dates are estimates and may be affected by supplier lead times, material availability, weather conditions, and Cairo traffic regulations including the truck ban (6:00 AM to midnight within Cairo city limits).',
			'You must ensure that the delivery site is accessible and that an authorized representative is present to receive and inspect materials upon delivery. Failure to receive a scheduled delivery may result in additional charges for re-delivery, storage, or vehicle waiting time.',
			'Claims for damaged, defective, or incorrect materials must be reported within 24 hours of delivery with photographic evidence. We will coordinate with the supplier to resolve claims, but ultimate liability for material quality rests with the supplying party. Delivery confirmation is recorded digitally with GPS coordinates and timestamp.',
		],
	},
	{
		number: '06',
		title: 'Payment Terms',
		content: [
			'Payment terms are specified in each accepted quote and may vary by supplier, order value, and account history. Standard payment methods include bank wire transfer, cheque, cash on delivery (for qualifying orders), and letters of credit for large orders. Mobile wallet payments are not accepted.',
			'Payment is due according to the terms specified in the invoice. Late payments are subject to a late payment fee as specified in the order confirmation. Under Egyptian law, issuing a cheque that is subsequently dishonored (bounced) is a criminal offense under Article 534 of the Egyptian Penal Code.',
			'All invoices are issued electronically in compliance with the Egyptian Tax Authority (ETA) e-invoicing system. Invoices include the required tax registration numbers, 14% VAT breakdown, and are submitted in real-time to the ETA in the mandated Arabic format. You are responsible for ensuring your tax registration information is current and accurate.',
		],
	},
	{
		number: '07',
		title: 'Limitation of Liability',
		content: [
			'To the maximum extent permitted by Egyptian law, HyperQuote shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, project delays, business interruption, or cost of substitute materials, arising from your use of the platform.',
			'Our total liability for any claim arising from or related to these terms or the platform shall not exceed the total fees paid by you to HyperQuote in the twelve months preceding the claim. This limitation applies regardless of the legal theory on which the claim is based.',
			'We are not liable for delays, failures, or damages caused by force majeure events, including but not limited to natural disasters, government actions, civil unrest, pandemics, or disruptions to transportation infrastructure. We will notify affected parties promptly and work to minimize disruption.',
		],
	},
	{
		number: '08',
		title: 'Egyptian Law & Jurisdiction',
		content: [
			'These terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any dispute arising from or relating to these terms or your use of the platform shall be subject to the exclusive jurisdiction of the Economic Courts in Cairo, Egypt.',
			'Both parties agree to attempt resolution of disputes through good-faith negotiation before initiating legal proceedings. If negotiation fails, either party may refer the dispute to arbitration under the rules of the Cairo Regional Centre for International Commercial Arbitration (CRCICA), or proceed directly to the competent Egyptian courts.',
			'Nothing in these terms shall be construed to limit any rights you may have under mandatory provisions of Egyptian consumer protection or commercial law that cannot be waived by contract.',
		],
	},
	{
		number: '09',
		title: 'Changes to Terms',
		content: [
			'We may update these terms from time to time to reflect changes in our services, legal requirements, or business practices. We will notify registered users of material changes via email and platform notification at least 30 days before the changes take effect.',
			'Your continued use of the platform after the effective date of updated terms constitutes acceptance of the changes. If you do not agree to the updated terms, you must stop using the platform and may request account closure. Pending orders at the time of term changes will be governed by the terms in effect when the order was placed.',
		],
	},
	{
		number: '10',
		title: 'Contact Us',
		content: [
			'For questions about these terms, account issues, or legal inquiries, contact us at legal@hyperquote.net or write to our registered office in Cairo, Egypt. Business hours are Sunday through Thursday, 9:00 AM to 5:00 PM Egypt Standard Time.',
			'For urgent order or delivery issues, contact our operations team directly through the platform support channel. We aim to respond to all inquiries within one business day.',
		],
	},
]

export const PRIVACY_SECTIONS: LegalSection[] = [
	{
		number: '01',
		title: 'Information We Collect',
		content: [
			'We collect information you provide directly when registering for an account, submitting quote requests, or communicating with our team. This includes your company name, commercial registration number, tax identification number, contact details (name, email, phone number), delivery addresses, and project specifications.',
			'When you use the platform, we automatically collect technical data including IP address, browser type, device information, pages visited, and interaction patterns. For delivery tracking, we collect GPS location data from driver devices with their explicit consent.',
			'For payment processing and ETA e-invoicing compliance, we collect banking details, tax registration information, and transaction records as required by Egyptian Tax Authority regulations.',
		],
	},
	{
		number: '02',
		title: 'How We Use Your Information',
		content: [
			'We use your information to operate the HyperQuote platform: processing quote requests, coordinating with suppliers, arranging deliveries, generating invoices, and facilitating payments. Your material specifications and pricing data are used to improve our AI-powered quote matching system.',
			'We use contact information to send order updates, delivery notifications, payment confirmations, and platform announcements. Technical data helps us maintain platform security, diagnose issues, and improve performance.',
			'Transaction data is retained and reported as required by Egyptian tax law, including real-time submission to the Egyptian Tax Authority (ETA) electronic invoicing system. We use aggregated, anonymized data for market analysis and platform improvement.',
		],
	},
	{
		number: '03',
		title: 'Data Sharing',
		content: [
			'We share relevant order details with suppliers who bid on your quote requests, including material specifications, quantities, and delivery locations. Supplier identity and pricing are shared with you as part of the quote process. We do not sell your personal data to third parties.',
			'We share data with delivery partners to fulfill orders, payment processors to handle transactions, and cloud infrastructure providers who host our platform. All service providers are contractually bound to protect your data and use it only for the services they provide to us.',
			'We disclose information when required by Egyptian law, including tax records to the Egyptian Tax Authority, and when necessary to comply with legal processes, enforce our terms, or protect the rights and safety of HyperQuote, our users, or the public.',
		],
	},
	{
		number: '04',
		title: 'Data Storage & Security',
		content: [
			'Your data is stored on secure cloud infrastructure with encryption at rest and in transit. We use Cloudflare Workers and Supabase with data residency considerations appropriate for our operations. Database backups are encrypted and stored in geographically distributed locations.',
			'We implement industry-standard security measures including role-based access control, audit logging, two-factor authentication for administrative access, and regular security assessments. Payment information is handled in compliance with PCI DSS standards.',
			'We retain your account data for the duration of your account plus seven years as required by Egyptian commercial and tax law. Transaction records and tax invoices are retained for the statutory period mandated by the Egyptian Tax Authority. You may request deletion of non-legally-required data at any time.',
		],
	},
	{
		number: '05',
		title: 'Your Rights',
		content: [
			'You have the right to access, correct, and update your personal information at any time through your account settings or by contacting our support team. You may request a copy of all personal data we hold about you in a machine-readable format.',
			'You may request deletion of your account and associated personal data, subject to our legal obligations to retain certain records under Egyptian commercial and tax law. We will process deletion requests within 30 days and notify you of any data we are legally required to retain.',
			'You may opt out of non-essential communications at any time. You may withdraw consent for optional data processing. These choices will not affect your ability to use core platform features or the processing of your existing orders.',
		],
	},
	{
		number: '06',
		title: 'Egyptian Data Protection',
		content: [
			'HyperQuote operates in compliance with Egyptian data protection regulations, including Law No. 151 of 2020 on the Protection of Personal Data and its executive regulations. We process personal data on the legal basis of contractual necessity, legitimate business interest, and regulatory compliance.',
			'As a B2B platform handling commercial transactions, we comply with the Egyptian Commercial Code, the Egyptian Tax Procedures Law, and ETA e-invoicing requirements. All tax invoices are submitted in real-time to the Egyptian Tax Authority in the required Arabic format with 14% VAT applied where applicable.',
			'For cross-border data transfers, we ensure appropriate safeguards are in place as required by Egyptian law. Our data processing practices are subject to oversight by the Egyptian Data Protection Center established under Law No. 151 of 2020.',
		],
	},
	{
		number: '07',
		title: 'Contact Us',
		content: [
			'For privacy-related inquiries, data access requests, or to exercise any of your rights under this policy, contact our Data Protection Officer at privacy@hyperquote.net or write to us at our registered office in Cairo, Egypt.',
			'We aim to respond to all privacy requests within 15 business days (Sunday through Thursday). If you are unsatisfied with our response, you have the right to lodge a complaint with the Egyptian Data Protection Center.',
		],
	},
]
