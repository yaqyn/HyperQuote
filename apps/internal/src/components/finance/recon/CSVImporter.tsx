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
 * "The Matcher" — CSV import with drag-drop, preview table, column mapper.
 * Clean, professional, handles Egyptian bank CSV formats.
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
    <div className="space-y-5">
      {/* ─── Bank Account Selector ──────────────────────── */}
      <div>
        <Select
          selectedKey={selectedBank}
          onSelectionChange={(key) => setSelectedBank(key as string)}
          className="flex flex-col gap-1"
        >
          <Label className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('recon.bankAccount', 'Bank Account')}
          </Label>
          <Button className="flex items-center justify-between rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-transparent px-3 py-2 text-xs text-start">
            <SelectValue className="flex-1" placeholder={t('recon.selectBank', 'Select bank account...')} />
            <span className="ms-2 text-black/20 dark:text-white/20 text-[10px]">&#9662;</span>
          </Button>
          <Popover className="w-[--trigger-width] rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-black/95 shadow-lg">
            <ListBox className="p-1 outline-none">
              {MOCK_BANK_ACCOUNTS.map((account) => (
                <ListBoxItem
                  key={account.id}
                  id={account.id}
                  className="rounded px-3 py-2 text-xs cursor-pointer outline-none data-[focused]:bg-[#2563EB]/[0.06]"
                >
                  {account.name}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {/* ─── Drag and Drop Zone ─────────────────────────── */}
      {!csvData && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 transition-colors ${
            isDragOver
              ? 'border-[#2563EB]/40 bg-[#2563EB]/[0.02]'
              : 'border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15]'
          }`}
        >
          <div className="text-black/10 dark:text-white/10 mb-2">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m.75-9H8.25m0 0-.375.375M8.25 3.375v1.5" />
            </svg>
          </div>
          <p className="text-xs text-black/30 dark:text-white/30 mb-3">
            {t('recon.dropCSV', 'Drop CSV bank statement here')}
          </p>
          <label className="cursor-pointer rounded-md bg-[#2563EB] px-3 py-1.5 text-xs text-white font-medium hover:bg-[#2563EB]/90 transition-colors">
            {t('recon.browseFiles', 'Browse')}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* ─── CSV Preview + Column Mapping ───────────────── */}
      {csvData && !importResult && (
        <div className="space-y-4">
          {/* Column mapping (if auto-detect failed) */}
          {!mapping && (
            <div className="rounded-md border border-yellow-500/20 bg-yellow-500/[0.03] px-4 py-3">
              <p className="text-xs text-black/50 dark:text-white/50 mb-3">
                {t('recon.mapColumns', 'Headers not recognized. Map columns manually:')}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {EXPECTED_HEADERS.map((field) => (
                  <div key={field}>
                    <label className="block text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-1">
                      {field}
                    </label>
                    <select
                      onChange={(e) => handleMappingChange(field as keyof ColumnMapping, Number(e.target.value))}
                      className="w-full rounded border border-black/[0.08] dark:border-white/[0.08] bg-transparent px-2 py-1 text-xs outline-none"
                    >
                      <option value="">--</option>
                      {csvData.headers.map((h, i) => (
                        <option key={`${field}-${h}`} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
                {t('recon.preview', 'Preview')}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/15 dark:text-white/15">
                {parsedRows.length} {t('recon.rows', 'rows')}
              </span>
            </div>

            <div className="border border-black/[0.06] dark:border-white/[0.06] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[90px_1fr_100px_120px] gap-0 px-3 py-1.5 text-[10px] tracking-wider uppercase text-black/25 dark:text-white/25 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>{t('recon.date', 'Date')}</div>
                <div>{t('recon.description', 'Description')}</div>
                <div className="text-end">{t('recon.amount', 'Amount')}</div>
                <div>{t('recon.reference', 'Reference')}</div>
              </div>
              {parsedRows.slice(0, 5).map((row, i) => (
                <div
                  key={`preview-${row.date}-${row.amount}-${i}`}
                  className="grid grid-cols-[90px_1fr_100px_120px] gap-0 px-3 py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
                >
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                    {row.date}
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50 truncate pe-3">
                    {row.description}
                  </span>
                  <span className="text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/60 dark:text-white/60">
                    {new Intl.NumberFormat('en-EG', { minimumFractionDigits: 2 }).format(row.amount)}
                  </span>
                  <span className="text-xs text-black/30 dark:text-white/30 truncate">
                    {row.reference}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Import button */}
          <div className="flex items-center gap-2">
            <Button
              onPress={handleImport}
              isDisabled={!selectedBank || parsedRows.length === 0 || isImporting}
              className="rounded-md bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-40 transition-colors"
            >
              {isImporting ? t('recon.importing', 'Importing...') : t('recon.importAndMatch', 'Import & Auto-Match')}
            </Button>
            <Button
              onPress={() => { setCsvData(null); setMapping(null); setParsedRows([]) }}
              className="rounded-md px-3 py-1.5 text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
            >
              {t('recon.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Import Result ──────────────────────────────── */}
      {importResult && (
        <div className="flex items-center gap-4 py-3 px-4 rounded-md border border-green-500/15 bg-green-500/[0.03]">
          <span className="size-2 rounded-full bg-green-500" />
          <div className="text-xs text-black/50 dark:text-white/50">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">{importResult.transactionCount}</span> imported
            <span className="mx-2 text-black/15 dark:text-white/15">|</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-green-600 dark:text-green-400">{importResult.autoMatchedCount}</span> matched
            <span className="mx-2 text-black/15 dark:text-white/15">|</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-red-600 dark:text-red-400">{importResult.unmatchedCount}</span> unmatched
          </div>
        </div>
      )}
    </div>
  )
}
