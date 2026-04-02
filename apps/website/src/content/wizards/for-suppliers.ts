import type { WizardStep } from '../registry'

export const steps: WizardStep[] = [
  {
    id: 'portal-setup',
    titleKey: 'docs.wizard.for-suppliers.steps.portalSetup.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.portalSetup.body',
    illustration: 'signup',
    tip: 'docs.wizard.for-suppliers.steps.portalSetup.tip',
  },
  {
    id: 'publish-catalog',
    titleKey: 'docs.wizard.for-suppliers.steps.publishCatalog.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.publishCatalog.body',
    illustration: 'browse',
  },
  {
    id: 'set-pricing',
    titleKey: 'docs.wizard.for-suppliers.steps.setPricing.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.setPricing.body',
    illustration: 'quote',
    tip: 'docs.wizard.for-suppliers.steps.setPricing.tip',
  },
  {
    id: 'receive-po',
    titleKey: 'docs.wizard.for-suppliers.steps.receivePo.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.receivePo.body',
    illustration: 'submit',
  },
  {
    id: 'confirm-fulfillment',
    titleKey: 'docs.wizard.for-suppliers.steps.confirmFulfillment.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.confirmFulfillment.body',
    illustration: 'verify',
  },
  {
    id: 'upload-delivery-note',
    titleKey: 'docs.wizard.for-suppliers.steps.uploadDeliveryNote.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.uploadDeliveryNote.body',
    illustration: 'track',
  },
  {
    id: 'track-payments',
    titleKey: 'docs.wizard.for-suppliers.steps.trackPayments.title',
    bodyKey: 'docs.wizard.for-suppliers.steps.trackPayments.body',
    illustration: 'support',
  },
]
