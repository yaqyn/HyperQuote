import type en from '../locales/en/common.json'
import type enUnits from '../locales/en/units.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof en
      units: typeof enUnits
    }
  }
}
