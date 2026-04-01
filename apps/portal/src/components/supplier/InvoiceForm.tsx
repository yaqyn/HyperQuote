/**
 * Invoice submission form with RHF + Zod.
 * Auto-populates line items from selected PO via ComboBox.
 * VAT calculated at 14% using Math.round to avoid float precision issues.
 * Mismatch warning when total differs by > 1%.
 * Uses useWatch (NOT watch) for reactive calculations.
 * Uses standardSchemaResolver (NOT zodResolver).
 */
import { useState, useEffect } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  TextField,
  TextArea,
  NumberField,
  DatePicker,
  DateInput,
  DateSegment,
  Group,
  DropZone,
  FileTrigger,
} from 'react-aria-components'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Upload } from 'lucide-react'
import { toast } from '../../lib/toast'
import { getSupplierPOs } from '../../lib/server/supplier-orders'
import { submitSupplierInvoice } from '../../lib/server/supplier-invoices'
import type { SupplierPO } from '../../types/supplier'

const invoiceSchema = z.object({
  poId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  lineItems: z.array(
    z.object({
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
    }),
  ),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  fileUrl: z.string().min(1),
  notes: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface InvoiceFormProps {
  locale: 'ar' | 'en'
  preselectedPoId?: string
}

export function InvoiceForm({ locale, preselectedPoId }: InvoiceFormProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()
  const tz = getLocalTimeZone()

  // Fetch confirmed POs for ComboBox
  const { data: posData } = useQuery({
    queryKey: ['supplier-pos', 'confirmed-for-invoice'],
    queryFn: () =>
      getSupplierPOs({ data: { status: 'confirmed', page: 1, limit: 100 } }),
    staleTime: 60_000,
  })

  const availablePOs = posData?.purchaseOrders ?? []

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: standardSchemaResolver(invoiceSchema),
    defaultValues: {
      poId: preselectedPoId ?? '',
      invoiceNumber: '',
      invoiceDate: today(tz).toString(),
      lineItems: [],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      fileUrl: '',
      notes: '',
    },
  })

  // Watch fields for reactive calculations
  const watchedLineItems = useWatch({ control, name: 'lineItems' })
  const watchedSubtotal = useWatch({ control, name: 'subtotal' })
  const watchedTotal = useWatch({ control, name: 'total' })

  // Selected PO for auto-population
  const [selectedPO, setSelectedPO] = useState<SupplierPO | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [invoiceDateValue, setInvoiceDateValue] = useState(today(tz))

  // Auto-select preselected PO
  useEffect(() => {
    if (preselectedPoId && availablePOs.length > 0) {
      const po = availablePOs.find((p) => p.id === preselectedPoId)
      if (po) handlePOSelect(po)
    }
  }, [preselectedPoId, availablePOs.length])

  // Recalculate totals when line items change
  useEffect(() => {
    if (!watchedLineItems || watchedLineItems.length === 0) return
    const subtotal = watchedLineItems.reduce(
      (sum, item) => sum + (item.lineTotal || 0),
      0,
    )
    const taxAmount = Math.round(subtotal * 14) / 100
    const total = subtotal + taxAmount
    setValue('subtotal', subtotal)
    setValue('taxAmount', taxAmount)
    setValue('total', total)
  }, [watchedLineItems, setValue])

  // Check mismatch
  const calculatedTotal = watchedSubtotal + Math.round(watchedSubtotal * 14) / 100
  const hasMismatch =
    watchedTotal > 0 &&
    calculatedTotal > 0 &&
    Math.abs(watchedTotal - calculatedTotal) / calculatedTotal > 0.01

  const handlePOSelect = (po: SupplierPO) => {
    setSelectedPO(po)
    setValue('poId', po.id)

    const lineItems = po.items.map((item) => ({
      productName: locale === 'ar' ? item.productNameAr : item.productName,
      quantity: item.quantityRequested,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    }))
    setValue('lineItems', lineItems)
  }

  const submitMutation = useMutation({
    mutationFn: (data: InvoiceFormData) =>
      submitSupplierInvoice({
        data: {
          poId: data.poId,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          total: data.total,
          fileUrl: data.fileUrl,
          notes: data.notes,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-invoices'] })
      toast.success(t('supplier.invoiceSubmitted'))
      reset()
      setSelectedPO(null)
      setFileName('')
    },
  })

  const onSubmit = (data: InvoiceFormData) => {
    submitMutation.mutate(data)
  }

  const formatNum = (n: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(n)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Related PO - ComboBox */}
      <div className="flex flex-col gap-1">
        <ComboBox
          defaultInputValue={selectedPO?.reference ?? ''}
          onSelectionChange={(key) => {
            const po = availablePOs.find((p) => p.id === key)
            if (po) handlePOSelect(po)
          }}
          className="flex flex-col gap-1"
        >
          <Label className="text-xs text-[var(--color-text-muted)]">
            {t('supplier.relatedPO')}
          </Label>
          <Group className="flex items-center h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
            <Input className="flex-1 font-mono text-sm bg-transparent outline-none text-[var(--color-text)]" />
          </Group>
          <Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg overflow-hidden">
            <ListBox className="outline-none p-1 max-h-60 overflow-auto">
              {availablePOs.map((po) => (
                <ListBoxItem
                  key={po.id}
                  id={po.id}
                  className="px-3 py-2 text-sm cursor-pointer rounded hover:bg-[var(--color-surface)] outline-none"
                >
                  <span className="font-mono text-[var(--color-text)]">
                    {po.reference}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] ms-2">
                    {po.items.length} {t('supplier.itemsSummary')}
                  </span>
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </ComboBox>
      </div>

      {/* Invoice number */}
      <TextField
        value={undefined}
        className="flex flex-col gap-1"
      >
        <Label className="text-xs text-[var(--color-text-muted)]">
          {t('supplier.invoiceNumber')}
        </Label>
        <Input
          {...register('invoiceNumber')}
          className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] font-mono text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
        />
      </TextField>

      {/* Invoice date */}
      <DatePicker
        value={invoiceDateValue}
        onChange={(v) => {
          if (v) {
            setInvoiceDateValue(v)
            setValue('invoiceDate', v.toString())
          }
        }}
        className="flex flex-col gap-1"
      >
        <Label className="text-xs text-[var(--color-text-muted)]">
          {t('supplier.invoiceDate')}
        </Label>
        <Group className="flex items-center h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
          <DateInput className="flex font-mono text-sm">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="px-0.5 outline-none focus:bg-[var(--color-primary)]/10 rounded"
              />
            )}
          </DateInput>
        </Group>
      </DatePicker>

      {/* Line items (auto-populated from PO) */}
      {selectedPO && watchedLineItems && watchedLineItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('supplier.lineItems')}
          </h3>
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_100px_100px] items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-muted)]">
              <span>{t('supplier.productName')}</span>
              <span className="text-end">{t('supplier.qtyRequested')}</span>
              <span className="text-end">{t('supplier.unitPrice')}</span>
              <span className="text-end">{t('supplier.lineTotal')}</span>
            </div>
            {watchedLineItems.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_100px_100px] items-center gap-2 px-4 py-3 border-t border-[var(--color-border)]"
              >
                <span className="text-sm text-[var(--color-text)] truncate">
                  {item.productName}
                </span>
                <span className="font-mono text-sm text-[var(--color-text)] text-end">
                  {formatNum(item.quantity)}
                </span>
                <Controller
                  control={control}
                  name={`lineItems.${i}.unitPrice`}
                  render={({ field }) => (
                    <NumberField
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v)
                        // Recalculate line total
                        const newLineTotal = item.quantity * v
                        setValue(`lineItems.${i}.lineTotal`, newLineTotal)
                      }}
                      minValue={0}
                      className="flex justify-end"
                    >
                      <Input className="h-8 w-24 px-2 rounded border border-[var(--color-border)] bg-[var(--color-base)] font-mono text-sm text-[var(--color-text)] text-end outline-none focus:border-[var(--color-primary)]" />
                    </NumberField>
                  )}
                />
                <span className="font-mono text-sm text-[var(--color-text)] text-end">
                  {formatNum(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--color-surface)]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-muted)]">
            {t('supplier.subtotal')}
          </span>
          <span className="font-mono text-base font-semibold text-[var(--color-text)]">
            EGP {formatNum(watchedSubtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-muted)]">
            {t('supplier.vat')}
          </span>
          <span className="font-mono text-base font-semibold text-[var(--color-text)]">
            EGP {formatNum(Math.round(watchedSubtotal * 14) / 100)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {t('supplier.total')}
          </span>
          <span className="font-mono text-base font-semibold text-[var(--color-text)]">
            EGP {formatNum(watchedTotal)}
          </span>
        </div>
      </div>

      {/* Mismatch warning */}
      {hasMismatch && (
        <div className="bg-[var(--color-warning-bg)] text-[var(--color-warning)] rounded-lg p-3 text-sm">
          {t('supplier.invoiceMismatch')}
        </div>
      )}

      {/* PDF upload */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-text-muted)]">
          {t('supplier.uploadInvoicePDF')}
        </span>
        <DropZone
          onDrop={async (e) => {
            const files = e.items.filter(
              (item) => item.kind === 'file',
            )
            if (files.length > 0) {
              const file = files[0]
              if (file.kind === 'file') {
                const f = await file.getFile()
                if (f.size <= 10 * 1024 * 1024 && f.type === 'application/pdf') {
                  setFileName(f.name)
                  setValue('fileUrl', `/invoices/${f.name}`)
                }
              }
            }
          }}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors min-h-[120px]"
        >
          <Upload size={24} className="text-[var(--color-text-muted)]" />
          {fileName ? (
            <p className="text-sm font-mono text-[var(--color-text)]">
              {fileName}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('supplier.uploadInvoicePDF')}
            </p>
          )}
          <FileTrigger
            acceptedFileTypes={['application/pdf']}
            onSelect={(files) => {
              if (files && files.length > 0) {
                const f = files[0]
                if (f.size <= 10 * 1024 * 1024) {
                  setFileName(f.name)
                  setValue('fileUrl', `/invoices/${f.name}`)
                }
              }
            }}
          >
            <Button className="h-8 px-4 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] font-medium cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
              {t('supplier.browseFiles')}
            </Button>
          </FileTrigger>
        </DropZone>
      </div>

      {/* Notes */}
      <TextField
        value={undefined}
        className="flex flex-col gap-1"
      >
        <Label className="text-xs text-[var(--color-text-muted)]">
          {t('supplier.notes')}
        </Label>
        <TextArea
          {...register('notes')}
          className="min-h-[80px] px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] resize-y"
        />
      </TextField>

      {/* Submit */}
      <Button
        type="submit"
        isDisabled={submitMutation.isPending}
        className="flex items-center justify-center h-[44px] w-full rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {t('supplier.submitInvoice')}
      </Button>
    </form>
  )
}
