import type { WizardStep } from '../registry'

export const steps: WizardStep[] = [
  {
    id: 'install-app',
    titleKey: 'docs.wizard.for-drivers.steps.installApp.title',
    bodyKey: 'docs.wizard.for-drivers.steps.installApp.body',
    illustration: 'signup',
    tip: 'docs.wizard.for-drivers.steps.installApp.tip',
  },
  {
    id: 'login-setup',
    titleKey: 'docs.wizard.for-drivers.steps.loginSetup.title',
    bodyKey: 'docs.wizard.for-drivers.steps.loginSetup.body',
    illustration: 'verify',
  },
  {
    id: 'view-assignments',
    titleKey: 'docs.wizard.for-drivers.steps.viewAssignments.title',
    bodyKey: 'docs.wizard.for-drivers.steps.viewAssignments.body',
    illustration: 'browse',
  },
  {
    id: 'start-delivery',
    titleKey: 'docs.wizard.for-drivers.steps.startDelivery.title',
    bodyKey: 'docs.wizard.for-drivers.steps.startDelivery.body',
    illustration: 'submit',
    tip: 'docs.wizard.for-drivers.steps.startDelivery.tip',
  },
  {
    id: 'navigate-route',
    titleKey: 'docs.wizard.for-drivers.steps.navigateRoute.title',
    bodyKey: 'docs.wizard.for-drivers.steps.navigateRoute.body',
    illustration: 'track',
  },
  {
    id: 'collect-proof',
    titleKey: 'docs.wizard.for-drivers.steps.collectProof.title',
    bodyKey: 'docs.wizard.for-drivers.steps.collectProof.body',
    illustration: 'search',
    tip: 'docs.wizard.for-drivers.steps.collectProof.tip',
  },
  {
    id: 'complete-delivery',
    titleKey: 'docs.wizard.for-drivers.steps.completeDelivery.title',
    bodyKey: 'docs.wizard.for-drivers.steps.completeDelivery.body',
    illustration: 'support',
  },
]
