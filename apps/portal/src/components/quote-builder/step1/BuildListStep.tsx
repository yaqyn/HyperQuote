/**
 * BuildListStep -- Step 1 of quote builder.
 * 4-tab container: Search & Add, Upload, Quick Pad, AI Assist.
 * Created as minimal container for Plan 03; Plan 02 will add
 * Search & Add, product list table, and step navigation.
 */
import { useState } from 'react'
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components'
import { Search, Upload, Grid3X3, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UploadMethod } from './UploadMethod'
import { QuickPad } from './QuickPad'
import { AIAssistMethod } from './AIAssistMethod'

// ============================================================================
// Component
// ============================================================================

export function BuildListStep() {
  const { t } = useTranslation('portal')

  return (
    <div className="flex flex-col gap-lg">
      <Tabs defaultSelectedKey="search" className="flex flex-col gap-md">
        <TabList className="flex gap-sm border-b border-[var(--color-border)]">
          <Tab
            id="search"
            className={({ isSelected }) =>
              `flex items-center gap-xs px-sm pb-sm text-xs font-medium outline-none ${
                isSelected
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Search size={14} />
            {t('quoteBuilder.tabSearch', 'Search & Add')}
          </Tab>
          <Tab
            id="upload"
            className={({ isSelected }) =>
              `flex items-center gap-xs px-sm pb-sm text-xs font-medium outline-none ${
                isSelected
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Upload size={14} />
            {t('quoteBuilder.tabUpload', 'Upload')}
          </Tab>
          <Tab
            id="quickpad"
            className={({ isSelected }) =>
              `flex items-center gap-xs px-sm pb-sm text-xs font-medium outline-none ${
                isSelected
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Grid3X3 size={14} />
            {t('quoteBuilder.tabQuickPad', 'Quick Pad')}
          </Tab>
          <Tab
            id="ai"
            className={({ isSelected }) =>
              `flex items-center gap-xs px-sm pb-sm text-xs font-medium outline-none ${
                isSelected
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Sparkles size={14} />
            {t('quoteBuilder.tabAI', 'AI Assist')}
          </Tab>
        </TabList>

        <TabPanel id="search" className="outline-none">
          <div className="flex items-center justify-center py-xl text-sm text-[var(--color-text-subtle)]">
            {t('quoteBuilder.searchPlaceholder', 'Search & Add -- coming in Plan 02')}
          </div>
        </TabPanel>

        <TabPanel id="upload" className="outline-none">
          <UploadMethod />
        </TabPanel>

        <TabPanel id="quickpad" className="outline-none">
          <QuickPad />
        </TabPanel>

        <TabPanel id="ai" className="outline-none">
          <AIAssistMethod />
        </TabPanel>
      </Tabs>
    </div>
  )
}
