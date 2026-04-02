import type { WizardStep } from '../registry'

export const steps: WizardStep[] = [
  {
    id: 'create-account',
    titleKey: 'docs.wizard.gettingStarted.steps.createAccount.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.createAccount.body',
    illustration: 'signup',
    tip: 'docs.wizard.gettingStarted.steps.createAccount.tip',
  },
  {
    id: 'verify-phone',
    titleKey: 'docs.wizard.gettingStarted.steps.verifyPhone.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.verifyPhone.body',
    illustration: 'verify',
  },
  {
    id: 'browse-market',
    titleKey: 'docs.wizard.gettingStarted.steps.browseMarket.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.browseMarket.body',
    illustration: 'browse',
    link: { to: '/market', labelKey: 'docs.wizard.gettingStarted.steps.browseMarket.link' },
  },
  {
    id: 'search-products',
    titleKey: 'docs.wizard.gettingStarted.steps.searchProducts.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.searchProducts.body',
    illustration: 'search',
    link: { to: '/market', labelKey: 'docs.wizard.gettingStarted.steps.searchProducts.link' },
  },
  {
    id: 'add-to-quote',
    titleKey: 'docs.wizard.gettingStarted.steps.addToQuote.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.addToQuote.body',
    illustration: 'quote',
    link: { to: '/market', labelKey: 'docs.wizard.gettingStarted.steps.addToQuote.link' },
  },
  {
    id: 'submit-quote',
    titleKey: 'docs.wizard.gettingStarted.steps.submitQuote.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.submitQuote.body',
    illustration: 'submit',
  },
  {
    id: 'track-order',
    titleKey: 'docs.wizard.gettingStarted.steps.trackOrder.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.trackOrder.body',
    illustration: 'track',
  },
  {
    id: 'get-support',
    titleKey: 'docs.wizard.gettingStarted.steps.getSupport.title',
    bodyKey: 'docs.wizard.gettingStarted.steps.getSupport.body',
    illustration: 'support',
    link: { to: '/support', labelKey: 'docs.wizard.gettingStarted.steps.getSupport.link' },
  },
]
