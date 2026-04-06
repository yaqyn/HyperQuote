import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Select, SelectValue, ListBox, ListBoxItem, Popover, Label } from 'react-aria-components'
import { importBankStatement } from '../../../lib/server/finance-recon'

interface ParsedRow {
  date: string
  description: string
  amount: number
  reference: string
}

interface ColumnMapping {
  date: number
  description: number
  amount: number
  reference: number
}

interface CSVImporterProps {
  onImportComplete: (result: { transactionCount: number; autoMatchedCount: number }) => void
}

const MOCK_BANK_ACCOUNTS = [
  { id: 'ba-001', name: 'CIB Main Account - 1234' },
  { id: 'ba-002', name: 'NBE Operations - 5678' },
  { id: 'ba-003', name: 'QNB Collections - 9012' },
]

const EXPECTED_HEADERS = ['date', 'description', 'amount', 'reference']

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function detectColumnMapping(headers: string[]): ColumnMapping | null {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''))
  const dateIdx = normalized.findIndex((h) => h.includes('date') || h.includes('تاريخ'))
  const descIdx = normalized.findIndex((h) => h.includes('desc') || h.includes('memo') || h.includes('narration') || h.includes('وصف'))
  const amountIdx = normalized.findIndex((h) => h.includes('amount') || h.includes('value') || h.includes('مبلغ'))
  const refIdx = normalized.findIndex((h) => h.includes('ref') || h.includes('check') || h.includes('cheque') || h.includes('مرجع'))

  if (dateIdx >= 0 && descIdx >= 0 && amountIdx >= 0) {
    return {
      date: dateIdx,
      description: descIdx,
      amount: amountIdx,
      reference: refIdx >= 0 ? refIdx : descIdx,
    }
  }
  return null
}

/**
 * CSV bank statement import with drag-and-drop, preview, and column mapping.
 * Handles various Egyptian bank CSV formats.
 */
export function CSVImporter({ onImportComplete }: CSVImporterProps) {
  const { t } = useTranslation('finance')
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ transactionCount: number; autoMatchedCount: number; unmatchedCount: number } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const processCSV = useCallback((text: string) => {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return

    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1).map(parseCSVLine)
    setCsvData({ headers, rows })

    const autoMapping = detectColumnMapping(headers)
    if (autoMapping) {
      setMapping(autoMapping)
      const parsed = rows.map((row) => ({
        date: row[autoMapping.date] ?? '',
        description: row[autoMapping.description] ?? '',
        amount: Number.parseFloat(row[autoMapping.amount]?.replace(/[^0-9.-]/g, '') ?? '0'),
        reference: row[autoMapping.reference] ?? '',
      }))
      setParsedRows(parsed)
    }
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        processCSV(text)
      }
      reader.readAsText(file)
    },
    [processCSV],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleMappingChange = useCallback(
    (field: keyof ColumnMapping, idx: number) => {
      const newMapping = { ...(mapping ?? { date: 0, description: 1, amount: 2, reference: 3 }), [field]: idx }
      setMapping(newMapping)

      if (csvData) {
        const parsed = csvData.rows.map((row) => ({
          date: row[newMapping.date] ?? '',
          description: row[newMapping.description] ?? '',
          amount: Number.parseFloat(row[newMapping.amount]?.replace(/[^0-9.-]/g, '') ?? '0'),
          reference: row[newMapping.reference] ?? '',
        }))
        setParsedRows(parsed)
      }
    },
    [mapping, csvData],
  )

  const handleImport = useCallback(async () => {
    if (!selectedBank || parsedRows.length === 0) return
    setIsImporting(true)
    try {
      const result = await importBankStatement({
        data: { fileUrl: `csv-upload-${Date.now()}`, bankAccountId: selectedBank },
      })
      const unmatchedCount = result.transactionCount - result.autoMatchedCount
      setImportResult({ ...result, unmatchedCount })
      onImportComplete(result)
    } finally {
      setIsImporting(false)
    }
  }, [selectedBank, parsedRows, onImportComplete])

  return (
    <div className="space-y-6">
      {/* Bank Account Selector */}
      <div>
        <Select
          selectedKey={selectedBank}
          onSelectionChange={(key) => setSelectedBank(key as string)}
          className="flex flex-col gap-1"
        >
          <Label className="text-sm text-black/60 dark:text-white/60">
            {t('recon.bankAccount', 'Bank Account')}
          </Label>
          <Button className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm text-start">
            <SelectValue className="flex-1" placeholder={t('recon.selectBank', 'Select bank account...')} />
            <span className="ms-2 text-black/40 dark:text-white/40">&#9662;</span>
          </Button>
          <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-lg">
            <ListBox className="p-1 outline-none">
              {MOCK_BANK_ACCOUNTS.map((account) => (
                <ListBoxItem
                  key={account.id}
                  id={account.id}
                  className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10"
                >
                  {account.name}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {/* Drag and Drop Zone */}
      {!csvData && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            isDragOver
              ? 'border-[#2563EB] bg-[#2563EB]/5'
              : 'border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40'
          }`}
        >
          <div className="text-4xl mb-3 text-black/30 dark:text-white/30">&#128196;</div>
          <p className="text-sm text-black/60 dark:text-white/60 mb-2">
            {t('recon.dropCSV', 'Drop CSV bank statement here')}
          </p>
          <label className="cursor-pointer rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white font-medium hover:bg-[#2563EB]/90 transition-colors">
            {t('recon.browseFiles', 'Browse Files')}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* CSV Preview + Column Mapping */}
      {csvData && !importResult && (
        <div className="space-y-4">
          {/* Column mapping (if auto-detect didn't match perfectly) */}
          {!mapping && (
            <div className="rounded-xl border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3">
                {t('recon.mapColumns', 'Column headers not recognized. Please map columns manually:')}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {EXPECTED_HEADERS.map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-black/60 dark:text-white/60 mb-1 capitalize">{field}</label>
                    <select
                      onChange={(e) => handleMappingChange(field as keyof ColumnMapping, Number(e.target.value))}
                      className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 py-1 text-sm"
                    >
                      <option value="">--</option>
                      {csvData.headers.map((h, i) => (
                        <option key={`${field}-${h}`} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview table (first 5 rows) */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-black/70 dark:text-white/70">
              {t('recon.preview', 'Preview')} ({parsedRows.length} {t('recon.rows', 'rows')})
            </h4>
            <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3">
                    <th className="px-3 py-2 text-start font-medium text-black/60 dark:text-white/60">{t('recon.date', 'Date')}</th>
                    <th className="px-3 py-2 text-start font-medium text-black/60 dark:text-white/60">{t('recon.description', 'Description')}</th>
                    <th className="px-3 py-2 text-end font-medium text-black/60 dark:text-white/60">{t('recon.amount', 'Amount')}</th>
                    <th className="px-3 py-2 text-start font-medium text-black/60 dark:text-white/60">{t('recon.reference', 'Reference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={`preview-${row.date}-${row.amount}-${i}`} className="border-b border-black/5 dark:border-white/5">
                      <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{row.date}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{row.description}</td>
                      <td className="px-3 py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {new Intl.NumberFormat('en-EG', { minimumFractionDigits: 2 }).format(row.amount)}
                      </td>
                      <td className="px-3 py-2">{row.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex items-center gap-3">
            <Button
              onPress={handleImport}
              isDisabled={!selectedBank || parsedRows.length === 0 || isImporting}
              className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]/90 disabled:opacity-40 transition-colors"
            >
              {isImporting ? t('recon.importing', 'Importing...') : t('recon.importAndMatch', 'Import & Auto-Match')}
            </Button>
            <Button
              onPress={() => {
                setCsvData(null)
                setMapping(null)
                setParsedRows([])
              }}
              className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {t('recon.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Import Result Summary */}
      {importResult && (
        <div className="rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            {t('recon.importSummary', 'Import Complete')}
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            {t('recon.imported', 'Imported')}: <span className="font-[family-name:var(--font-geist-mono)] font-medium">{importResult.transactionCount}</span>{' '}
            {t('recon.transactions', 'transactions')} | {t('recon.autoMatched', 'Auto-matched')}: <span className="font-[family-name:var(--font-geist-mono)] font-medium">{importResult.autoMatchedCount}</span> | {t('recon.unmatched', 'Unmatched')}: <span className="font-[family-name:var(--font-geist-mono)] font-medium">{importResult.unmatchedCount}</span>
          </p>
        </div>
      )}
    </div>
  )
}
