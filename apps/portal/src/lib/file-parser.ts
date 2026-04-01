/**
 * Client-side CSV and Excel file parsing.
 * Uses PapaParse for CSV (auto-delimiter, BOM handling).
 * Uses SheetJS for .xlsx/.xls files.
 * Handles Arabic column headers.
 */
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ============================================================================
// Types
// ============================================================================

export interface ParsedRow {
  productName?: string
  sku?: string
  quantity?: number
  uom?: string
  notes?: string
  rowNumber: number
}

export interface ParseError {
  rowNumber: number
  field: string
  value: string
  expected: string
}

export interface ParseResult {
  items: ParsedRow[]
  errors: ParseError[]
  totalRows: number
}

// ============================================================================
// Column header mapping (English + Arabic)
// ============================================================================

const PRODUCT_HEADERS = [
  'product name',
  'product',
  'name',
  'item',
  'material',
  'description',
  '\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c',
  '\u0627\u0644\u0645\u0646\u062a\u062c',
  '\u0627\u0644\u0627\u0633\u0645',
  '\u0627\u0644\u0645\u0627\u062f\u0629',
  '\u0627\u0644\u0648\u0635\u0641',
]

const SKU_HEADERS = [
  'sku',
  'code',
  'product code',
  'item code',
  '\u0627\u0644\u0631\u0645\u0632',
  '\u0643\u0648\u062f',
  '\u0631\u0645\u0632 \u0627\u0644\u0645\u0646\u062a\u062c',
]

const QUANTITY_HEADERS = [
  'quantity',
  'qty',
  'amount',
  'count',
  '\u0627\u0644\u0643\u0645\u064a\u0629',
  '\u0643\u0645\u064a\u0629',
  '\u0627\u0644\u0639\u062f\u062f',
]

const UOM_HEADERS = [
  'uom',
  'unit',
  'unit of measure',
  'measure',
  '\u0627\u0644\u0648\u062d\u062f\u0629',
  '\u0648\u062d\u062f\u0629',
  '\u0648\u062d\u062f\u0629 \u0627\u0644\u0642\u064a\u0627\u0633',
]

const NOTES_HEADERS = [
  'notes',
  'note',
  'remarks',
  'comment',
  'comments',
  '\u0645\u0644\u0627\u062d\u0638\u0627\u062a',
  '\u0645\u0644\u0627\u062d\u0638\u0629',
]

/**
 * Find the value for a column from a row using header mapping.
 */
function findColumnValue(
  row: Record<string, string>,
  headerList: string[],
): string | undefined {
  for (const key of Object.keys(row)) {
    const normalized = key.trim().toLowerCase().replace(/^\ufeff/, '')
    if (headerList.includes(normalized)) {
      return row[key]?.trim()
    }
  }
  return undefined
}

// ============================================================================
// parseCSV
// ============================================================================

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete(results) {
        const items: ParsedRow[] = []
        const errors: ParseError[] = []

        const data = results.data as Array<Record<string, string>>

        data.forEach((row, index) => {
          const rowNumber = index + 2 // +2: 1-indexed + header row

          const productName = findColumnValue(row, PRODUCT_HEADERS)
          const sku = findColumnValue(row, SKU_HEADERS)
          const rawQty = findColumnValue(row, QUANTITY_HEADERS)
          const uom = findColumnValue(row, UOM_HEADERS)
          const notes = findColumnValue(row, NOTES_HEADERS)

          // Validate: must have product name or SKU
          if (!productName && !sku) {
            errors.push({
              rowNumber,
              field: 'Product',
              value: '',
              expected: 'Product name or SKU required',
            })
          }

          // Validate quantity
          const qty = rawQty ? parseFloat(rawQty.replace(/,/g, '')) : undefined
          if (qty === undefined || isNaN(qty) || qty <= 0) {
            errors.push({
              rowNumber,
              field: 'Quantity',
              value: rawQty ?? '',
              expected: 'Number greater than 0',
            })
          }

          items.push({
            productName: productName ?? '',
            sku: sku ?? '',
            quantity: qty && !isNaN(qty) ? qty : 0,
            uom: uom ?? '',
            notes: notes ?? '',
            rowNumber,
          })
        })

        resolve({ items, errors, totalRows: data.length })
      },
      error() {
        resolve({ items: [], errors: [], totalRows: 0 })
      },
    })
  })
}

// ============================================================================
// parseExcel
// ============================================================================

export function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          resolve({ items: [], errors: [], totalRows: 0 })
          return
        }

        const sheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(
          sheet,
          { defval: '' },
        )

        const items: ParsedRow[] = []
        const errors: ParseError[] = []

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2 // +2: 1-indexed + header row

          const productName = findColumnValue(row, PRODUCT_HEADERS)
          const sku = findColumnValue(row, SKU_HEADERS)
          const rawQty = findColumnValue(row, QUANTITY_HEADERS)
          const uom = findColumnValue(row, UOM_HEADERS)
          const notes = findColumnValue(row, NOTES_HEADERS)

          if (!productName && !sku) {
            errors.push({
              rowNumber,
              field: 'Product',
              value: '',
              expected: 'Product name or SKU required',
            })
          }

          const qty = rawQty
            ? parseFloat(String(rawQty).replace(/,/g, ''))
            : undefined
          if (qty === undefined || isNaN(qty) || qty <= 0) {
            errors.push({
              rowNumber,
              field: 'Quantity',
              value: String(rawQty ?? ''),
              expected: 'Number greater than 0',
            })
          }

          items.push({
            productName: productName ?? '',
            sku: sku ?? '',
            quantity: qty && !isNaN(qty) ? qty : 0,
            uom: uom ?? '',
            notes: notes ?? '',
            rowNumber,
          })
        })

        resolve({ items, errors, totalRows: jsonData.length })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

// ============================================================================
// detectFileType
// ============================================================================

export function detectFileType(file: File): 'csv' | 'xlsx' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv' || ext === 'tsv') return 'csv'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'

  // Check MIME type as fallback
  if (
    file.type === 'text/csv' ||
    file.type === 'text/tab-separated-values'
  ) {
    return 'csv'
  }
  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  ) {
    return 'xlsx'
  }

  return 'unknown'
}

// ============================================================================
// parseFile — auto-detect and parse
// ============================================================================

export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = detectFileType(file)

  switch (fileType) {
    case 'csv':
      return parseCSV(file)
    case 'xlsx':
      return parseExcel(file)
    default:
      return {
        items: [],
        errors: [
          {
            rowNumber: 0,
            field: 'file',
            value: file.name,
            expected: 'CSV or Excel (.xlsx) file',
          },
        ],
        totalRows: 0,
      }
  }
}
