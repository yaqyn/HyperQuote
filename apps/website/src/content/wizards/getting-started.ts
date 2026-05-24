import type { WizardStep } from '../registry'

export const steps: WizardStep[] = [
	{
		id: 'create-account',
		titleKey: 'docs.wizard.gettingStarted.steps.createAccount.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.createAccount.body',
		title: 'Create Your Account',
		body: 'Sign up with your Egyptian mobile number first. Email/password can be added during setup and becomes available after email confirmation.',
		illustration: 'signup',
		tip: 'docs.wizard.gettingStarted.steps.createAccount.tip',
		tipText:
			'Phone verification is mandatory. Email/password is optional and requires email confirmation.',
	},
	{
		id: 'verify-phone',
		titleKey: 'docs.wizard.gettingStarted.steps.verifyPhone.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.verifyPhone.body',
		title: 'Verify Your Phone',
		body: 'Enter the 6-digit code sent to your WhatsApp. If you do not receive it within 30 seconds, a fallback SMS will be sent automatically.',
		illustration: 'verify',
		tipText: 'Check WhatsApp first — it arrives faster than SMS in Egypt.',
	},
	{
		id: 'browse-market',
		titleKey: 'docs.wizard.gettingStarted.steps.browseMarket.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.browseMarket.body',
		title: 'Browse the Market',
		body: 'Explore building materials by category — cement, steel, lumber, roofing, and more. You will see price ranges, specifications, and availability, but never exact prices.',
		illustration: 'browse',
		link: {
			to: '/market',
			labelKey: 'docs.wizard.gettingStarted.steps.browseMarket.link',
			label: 'Browse Market',
		},
		tipText:
			'Prices are quote-based. Add items to your list and we will get you a custom price within hours.',
	},
	{
		id: 'search-products',
		titleKey: 'docs.wizard.gettingStarted.steps.searchProducts.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.searchProducts.body',
		title: 'Search for Products',
		body: 'Use the search bar to find specific materials by name, brand, or specification. Filter results by category, availability, and delivery area to narrow down exactly what you need.',
		illustration: 'search',
	},
	{
		id: 'add-to-quote',
		titleKey: 'docs.wizard.gettingStarted.steps.addToQuote.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.addToQuote.body',
		title: 'Add to Your Quote',
		body: 'Found what you need? Tap "Add to Quote" on any product, enter your quantity, and it goes straight into your material list. Build your full list before submitting.',
		illustration: 'quote',
		tipText:
			'You can also upload a CSV or paste a bill of materials to add items in bulk.',
	},
	{
		id: 'submit-quote',
		titleKey: 'docs.wizard.gettingStarted.steps.submitQuote.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.submitQuote.body',
		title: 'Submit Your Quote',
		body: 'Review your material list, choose a delivery location, and submit your quote request. Our team sources the best prices from multiple suppliers and sends you a single consolidated quote.',
		illustration: 'submit',
		tipText:
			'Quotes for common materials like cement and rebar often arrive in under an hour.',
	},
	{
		id: 'track-order',
		titleKey: 'docs.wizard.gettingStarted.steps.trackOrder.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.trackOrder.body',
		title: 'Track Your Order',
		body: 'Once you accept a quote, your order is confirmed. Track it through every stage — from preparation to dispatch to delivery — with live GPS tracking on a map.',
		illustration: 'track',
		tipText:
			'You will get WhatsApp notifications at each stage so you always know what is happening.',
	},
	{
		id: 'get-support',
		titleKey: 'docs.wizard.gettingStarted.steps.getSupport.title',
		bodyKey: 'docs.wizard.gettingStarted.steps.getSupport.body',
		title: 'Get Support',
		body: 'Need help at any point? Reach us through WhatsApp, in-app chat, or phone. Our support team handles everything — from product questions to delivery issues — so you have a single point of contact.',
		illustration: 'support',
		link: {
			to: '/support',
			labelKey: 'docs.wizard.gettingStarted.steps.getSupport.link',
			label: 'Get Support',
		},
	},
]
