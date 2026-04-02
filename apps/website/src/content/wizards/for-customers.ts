import type { WizardStep } from '../registry'

export const steps: WizardStep[] = [
  {
    id: 'portal-overview',
    titleKey: 'docs.wizard.for-customers.steps.portalOverview.title',
    bodyKey: 'docs.wizard.for-customers.steps.portalOverview.body',
    illustration: 'browse',
    tip: 'docs.wizard.for-customers.steps.portalOverview.tip',
  },
  {
    id: 'create-project',
    titleKey: 'docs.wizard.for-customers.steps.createProject.title',
    bodyKey: 'docs.wizard.for-customers.steps.createProject.body',
    illustration: 'signup',
  },
  {
    id: 'build-material-list',
    titleKey: 'docs.wizard.for-customers.steps.buildMaterialList.title',
    bodyKey: 'docs.wizard.for-customers.steps.buildMaterialList.body',
    illustration: 'search',
    link: { to: '/market', labelKey: 'docs.wizard.for-customers.steps.buildMaterialList.link' },
  },
  {
    id: 'request-quote',
    titleKey: 'docs.wizard.for-customers.steps.requestQuote.title',
    bodyKey: 'docs.wizard.for-customers.steps.requestQuote.body',
    illustration: 'submit',
    tip: 'docs.wizard.for-customers.steps.requestQuote.tip',
  },
  {
    id: 'review-quote',
    titleKey: 'docs.wizard.for-customers.steps.reviewQuote.title',
    bodyKey: 'docs.wizard.for-customers.steps.reviewQuote.body',
    illustration: 'quote',
  },
  {
    id: 'accept-order',
    titleKey: 'docs.wizard.for-customers.steps.acceptOrder.title',
    bodyKey: 'docs.wizard.for-customers.steps.acceptOrder.body',
    illustration: 'verify',
  },
  {
    id: 'track-delivery',
    titleKey: 'docs.wizard.for-customers.steps.trackDelivery.title',
    bodyKey: 'docs.wizard.for-customers.steps.trackDelivery.body',
    illustration: 'track',
    link: { to: '/market', labelKey: 'docs.wizard.for-customers.steps.trackDelivery.link' },
  },
  {
    id: 'manage-payments',
    titleKey: 'docs.wizard.for-customers.steps.managePayments.title',
    bodyKey: 'docs.wizard.for-customers.steps.managePayments.body',
    illustration: 'support',
    tip: 'docs.wizard.for-customers.steps.managePayments.tip',
  },
]
