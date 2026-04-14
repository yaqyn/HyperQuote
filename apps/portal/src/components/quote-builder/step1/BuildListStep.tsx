/**
 * Step 1: Build List -- tab selector for 4 input methods + persistent product list table.
 * Search & Add is the default tab. Upload/QuickPad/AIAssist are placeholders for Plan 03.
 */
import { useTranslation } from 'react-i18next'
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components'
import { SearchAndAdd } from './SearchAndAdd'
import { ProductListTable } from './ProductListTable'

export function BuildListStep() {
  const { t } = useTranslation('portal')

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      {/* Input method tabs */}
      <Tabs defaultSelectedKey="search">
        <TabList
          aria-label={t('quoteBuilder.tabSearchAdd')}
          className="flex gap-0 border-b border-[var(--color-border)]"
        >
          <Tab
            id="search"
            className="h-9 px-3 text-[13px] cursor-pointer outline-none transition-colors text-[var(--color-text-muted)] data-[selected]:text-[var(--color-text)] data-[selected]:border-b-2 data-[selected]:border-[var(--color-primary)] -mb-px"
          >
            {t('quoteBuilder.tabSearchAdd')}
          </Tab>
          <Tab
            id="upload"
            className="h-9 px-3 text-[13px] cursor-pointer outline-none transition-colors text-[var(--color-text-muted)] data-[selected]:text-[var(--color-text)] data-[selected]:border-b-2 data-[selected]:border-[var(--color-primary)] -mb-px"
          >
            {t('quoteBuilder.tabUpload')}
          </Tab>
          <Tab
            id="quickpad"
            className="h-9 px-3 text-[13px] cursor-pointer outline-none transition-colors text-[var(--color-text-muted)] data-[selected]:text-[var(--color-text)] data-[selected]:border-b-2 data-[selected]:border-[var(--color-primary)] -mb-px"
          >
            {t('quoteBuilder.tabQuickPad')}
          </Tab>
          <Tab
            id="ai"
            className="h-9 px-3 text-[13px] cursor-pointer outline-none transition-colors text-[var(--color-text-muted)] data-[selected]:text-[var(--color-text)] data-[selected]:border-b-2 data-[selected]:border-[var(--color-primary)] -mb-px"
          >
            {t('quoteBuilder.tabAIAssist')}
          </Tab>
        </TabList>

        <TabPanel id="search" className="pt-4 outline-none">
          <SearchAndAdd />
        </TabPanel>
        <TabPanel id="upload" className="pt-4 outline-none">
          <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            {t('quoteBuilder.comingSoon')}
          </div>
        </TabPanel>
        <TabPanel id="quickpad" className="pt-4 outline-none">
          <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            {t('quoteBuilder.comingSoon')}
          </div>
        </TabPanel>
        <TabPanel id="ai" className="pt-4 outline-none">
          <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            {t('quoteBuilder.comingSoon')}
          </div>
        </TabPanel>
      </Tabs>

      {/* Product list table -- always visible during Step 1 */}
      <ProductListTable />
    </div>
  )
}
