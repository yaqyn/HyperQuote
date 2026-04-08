import { useState, useCallback } from 'react'
import { useForm, useWatch, Controller, useFieldArray } from 'react-hook-form'
import { DialogTrigger, Dialog, Modal, Heading } from 'react-aria-components'
import { Button, UnderlineInput, UnderlineTextArea } from '../../ui'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { sendSupplierInquiry } from '../../../lib/server/procurement-inquiries'
import { getSupplierDirectory } from '../../../lib/server/procurement-suppliers'
import { useProcurementStore } from '../../../stores/procurement'
import { SupplierSelector } from './SupplierSelector'
import { InquiryTemplateSelector } from './InquiryTemplateSelector'
import type { InquiryItem, InquiryTemplate } from '../../../types/procurement'

interface InquiryFormData {
  quoteRequestId: string
  deadline: string
  template: InquiryTemplate
  message: string
  items: InquiryItem[]
  selectedSupplierIds: string[]
}

const DEFAULT_ITEMS: InquiryItem[] = [
  { productId: 'prod-001', productName: 'Steel Rebar 16mm', quantity: 200, uom: 'ton', specs: 'Grade 60, 12m length, ES 262' },
  { productId: 'prod-002', productName: 'Steel Rebar 12mm', quantity: 150, uom: 'ton', specs: 'Grade 60, 12m length' },
  { productId: 'prod-003', productName: 'Steel Rebar 10mm', quantity: 100, uom: 'ton', specs: 'Grade 40, 6m length' },
]

let nextProductCounter = 4

// ─── Main Builder ────────────────────────────────────────

export function InquiryBuilder() {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const setSelectedInquiryId = useProcurementStore((s) => s.setSelectedInquiryId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [channels, setChannels] = useState({ email: true, portal: false, whatsapp: false })

  const { control, handleSubmit, setValue, reset, register } = useForm<InquiryFormData>({
    defaultValues: {
      quoteRequestId: '',
      deadline: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      template: 'standard',
      message: '',
      items: DEFAULT_ITEMS,
      selectedSupplierIds: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedTemplate = useWatch({ control, name: 'template' })
  const watchedItems = useWatch({ control, name: 'items' })
  const watchedSupplierIds = useWatch({ control, name: 'selectedSupplierIds' })
  const watchedDeadline = useWatch({ control, name: 'deadline' })
  const watchedMessage = useWatch({ control, name: 'message' })

  // Resolve supplier names for confirmation dialog
  const { data: supplierData } = useQuery({
    queryKey: ['procurement', 'suppliers', 'directory', 'all'],
    queryFn: () => getSupplierDirectory({ data: { page: 1, limit: 100 } }),
    staleTime: 60_000,
  })
  const allSuppliers = supplierData?.suppliers ?? []
  const selectedSupplierNames = allSuppliers
    .filter((s) => watchedSupplierIds.includes(s.supplierId))
    .map((s) => s.supplierName)

  // Add item row
  const [newItem, setNewItem] = useState<{ productName: string; quantity: string; uom: string; specs: string }>({ productName: '', quantity: '', uom: '', specs: '' })
  const addItem = useCallback(() => {
    if (!newItem.productName || !newItem.quantity) return
    append({
      productId: `prod-new-${nextProductCounter++}`,
      productName: newItem.productName,
      quantity: Number(newItem.quantity),
      uom: newItem.uom || 'unit',
      specs: newItem.specs,
    })
    setNewItem({ productName: '', quantity: '', uom: '', specs: '' })
  }, [newItem, append])

  const mutation = useMutation({
    mutationFn: (data: InquiryFormData) =>
      sendSupplierInquiry({
        data: {
          supplierIds: data.selectedSupplierIds,
          productIds: data.items.map((i) => i.productId),
          deadline: data.deadline,
          quoteRequestId: data.quoteRequestId || undefined,
          template: data.template,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['procurement'] })
      setSelectedInquiryId(result.inquiryId)
      reset()
    },
  })

  const onSubmit = (data: InquiryFormData) => {
    setConfirmOpen(false)
    mutation.mutate(data)
  }

  const toggleChannel = (ch: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }))
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <form
        onSubmit={handleSubmit(() => setConfirmOpen(true))}
        className="flex flex-col gap-6"
      >
        {/* ── Top Bar: Reference + Deadline + Template ── */}
        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <Controller
              control={control}
              name="quoteRequestId"
              render={({ field }) => (
                <UnderlineInput
                  value={field.value}
                  onChange={field.onChange}
                  label={t('procurement.inquiry.quoteReference')}
                  placeholder={t('procurement.inquiry.quoteReferencePlaceholder')}
                />
              )}
            />
          </div>

          <div className="w-36 shrink-0">
            <Controller
              control={control}
              name="deadline"
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  aria-label={t('procurement.inquiry.responseDeadline')}
                  className="w-full border-b border-black/[0.04] bg-transparent py-1.5 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums outline-none transition-colors focus:border-black/[0.12] dark:border-white/[0.04] dark:focus:border-white/[0.12]"
                />
              )}
            />
          </div>

          <div className="shrink-0">
            <Controller
              control={control}
              name="template"
              render={({ field }) => (
                <InquiryTemplateSelector
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val)
                    setValue('message', getTemplateMessage(val, watchedDeadline))
                  }}
                />
              )}
            />
          </div>
        </div>

        {/* ── Items Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                <th className="py-2.5 pe-4 text-start text-[12px] font-medium text-black/40 dark:text-white/40">
                  {t('procurement.inquiry.product')}
                </th>
                <th className="py-2.5 pe-4 text-end text-[12px] font-medium text-black/40 dark:text-white/40">
                  {t('procurement.inquiry.quantity')}
                </th>
                <th className="py-2.5 text-start text-[12px] font-medium text-black/40 dark:text-white/40">
                  {t('procurement.inquiry.suppliers')}
                </th>
                <th className="py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr
                  key={field.id}
                  className="border-b border-black/[0.03] dark:border-white/[0.03]"
                >
                  <td className="py-3.5 pe-4">
                    <span className="font-medium text-[var(--color-text)]">
                      {watchedItems[index]?.productName}
                    </span>
                    {watchedItems[index]?.specs && (
                      <span className="ms-2 text-[12px] text-black/40 dark:text-white/40">
                        {watchedItems[index].specs}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pe-4 text-end">
                    <Controller
                      control={control}
                      name={`items.${index}.quantity`}
                      render={({ field: qtyField }) => (
                        <input
                          type="number"
                          min={1}
                          value={qtyField.value}
                          onChange={(e) => qtyField.onChange(Number(e.target.value) || 0)}
                          className="w-20 border-b border-transparent bg-transparent py-0.5 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)] outline-none transition-colors focus:border-black/[0.12] dark:focus:border-white/[0.12]"
                        />
                      )}
                    />
                    <span className="ms-1 text-[12px] text-black/40 dark:text-white/40">
                      {watchedItems[index]?.uom}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <SupplierSelector
                      productId={watchedItems[index]?.productId}
                      selectedIds={watchedSupplierIds}
                      onSelectionChange={(ids) => setValue('selectedSupplierIds', ids)}
                    />
                  </td>
                  <td className="py-3.5 text-center">
                    <Button
                      variant="ghost"
                      onPress={() => remove(index)}
                      aria-label={`Remove ${watchedItems[index]?.productName}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-black/30 outline-none transition-colors data-[hovered]:text-black/60 dark:text-white/30 dark:data-[hovered]:text-white/60 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
                    >
                      ×
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Add Item Row ── */}
          <div className="flex items-center gap-2 px-1 py-2.5">
            <input
              type="text"
              value={newItem.productName}
              onChange={(e) => setNewItem((p) => ({ ...p, productName: e.target.value }))}
              placeholder={t('procurement.inquiry.product')}
              className="min-w-0 flex-1 border-b border-black/[0.04] bg-transparent py-1 text-[13px] outline-none transition-colors placeholder:text-black/25 focus:border-black/[0.12] dark:border-white/[0.04] dark:placeholder:text-white/25 dark:focus:border-white/[0.12]"
            />
            <input
              type="number"
              min={1}
              value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
              placeholder={t('procurement.inquiry.quantity')}
              className="w-20 border-b border-black/[0.04] bg-transparent py-1 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums outline-none transition-colors placeholder:text-black/25 focus:border-black/[0.12] dark:border-white/[0.04] dark:placeholder:text-white/25 dark:focus:border-white/[0.12]"
            />
            <input
              type="text"
              value={newItem.uom}
              onChange={(e) => setNewItem((p) => ({ ...p, uom: e.target.value }))}
              placeholder="UOM"
              className="w-16 border-b border-black/[0.04] bg-transparent py-1 text-[13px] outline-none transition-colors placeholder:text-black/25 focus:border-black/[0.12] dark:border-white/[0.04] dark:placeholder:text-white/25 dark:focus:border-white/[0.12]"
            />
            <input
              type="text"
              value={newItem.specs}
              onChange={(e) => setNewItem((p) => ({ ...p, specs: e.target.value }))}
              placeholder={t('procurement.inquiry.specsPlaceholder', 'Specs')}
              className="min-w-0 flex-1 border-b border-black/[0.04] bg-transparent py-1 text-[13px] outline-none transition-colors placeholder:text-black/25 focus:border-black/[0.12] dark:border-white/[0.04] dark:placeholder:text-white/25 dark:focus:border-white/[0.12]"
            />
            <Button
              variant="ghost"
              onPress={addItem}
              isDisabled={!newItem.productName || !newItem.quantity}
              className="shrink-0 text-[12px] font-medium text-[var(--color-primary)]"
            >
              + {t('procurement.inquiry.addItem', 'Add Item')}
            </Button>
          </div>
        </div>

        {/* ── Message ── */}
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <UnderlineTextArea
              value={field.value}
              onChange={field.onChange}
              label={t('procurement.inquiry.message')}
              placeholder={t('procurement.inquiry.messagePlaceholder')}
              rows={3}
              className="leading-relaxed"
            />
          )}
        />

        {/* ── Bottom Bar: Channels + Send ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {(Object.keys(channels) as Array<keyof typeof channels>).map((ch) => (
              <Button
                key={ch}
                onPress={() => toggleChannel(ch)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium outline-none transition-all
                  data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                  ${
                    channels[ch]
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-black/40 data-[hovered]:text-black/50 dark:text-white/40 dark:data-[hovered]:text-white/50'
                  }`}
              >
                {t(`procurement.inquiry.sendVia${ch.charAt(0).toUpperCase() + ch.slice(1)}` as any)}
              </Button>
            ))}
          </div>

          <Button
            variant="primary"
            type="submit"
            isDisabled={watchedSupplierIds.length === 0 || mutation.isPending}
          >
            {mutation.isPending
              ? t('procurement.inquiry.sending')
              : t('procurement.inquiry.sendToAllSelected')}
          </Button>
        </div>
      </form>

      {/* ── Confirmation Dialog ── */}
      <DialogTrigger isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Dialog
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl outline-none dark:bg-black/90"
            isKeyboardDismissDisabled
          >
            <Heading slot="title" className="mb-4 text-[15px] font-semibold tracking-tight">
              {t('procurement.inquiry.confirmTitle')}
            </Heading>

            {/* Supplier names */}
            <div className="mb-3">
              <span className="text-[12px] font-medium text-black/40 dark:text-white/40">
                {t('procurement.inquiry.sendingTo', 'Sending to')} ({watchedSupplierIds.length})
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedSupplierNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[12px] font-medium text-[var(--color-text)] dark:bg-white/[0.04]"
                  >
                    {name}
                  </span>
                ))}
                {selectedSupplierNames.length === 0 && (
                  <span className="text-[12px] text-black/30 dark:text-white/30">
                    {watchedSupplierIds.length} {t('procurement.inquiry.suppliersSelected', 'suppliers selected')}
                  </span>
                )}
              </div>
            </div>

            {/* Message preview */}
            {watchedMessage && (
              <div className="mb-3">
                <span className="text-[12px] font-medium text-black/40 dark:text-white/40">
                  {t('procurement.inquiry.messagePreview', 'Message preview')}
                </span>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-black/50 dark:text-white/50">
                  {watchedMessage}
                </p>
              </div>
            )}

            {/* Deadline */}
            <div className="mb-5">
              <span className="text-[12px] font-medium text-black/40 dark:text-white/40">
                {t('procurement.inquiry.responseDeadline', 'Deadline')}
              </span>
              <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                {watchedDeadline}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onPress={() => setConfirmOpen(false)}
              >
                {t('procurement.inquiry.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit(onSubmit)}
              >
                {t('procurement.inquiry.confirmSend')}
              </Button>
            </div>
          </Dialog>
        </Modal>
      </DialogTrigger>
    </div>
  )
}

function getTemplateMessage(template: InquiryTemplate, deadline: string): string {
  const templates: Record<InquiryTemplate, string> = {
    standard: `Dear Supplier,\n\nWe are requesting pricing for the items listed below. Please provide your best price, lead time, and availability by ${deadline}.\n\nThank you.`,
    urgent: `URGENT REQUEST\n\nDear Supplier,\n\nWe require immediate pricing for the items below. Please respond within 24 hours.\n\nDeadline: ${deadline}`,
    repeat: `Dear Supplier,\n\nThis is a repeat order inquiry. Please confirm current pricing and availability for the items below by ${deadline}.`,
    project_based: `Dear Supplier,\n\nWe are sourcing materials for a project. Please provide pricing, lead times, and delivery schedule for the items below.\n\nDeadline: ${deadline}`,
    negotiation_followup: `Dear Supplier,\n\nFollowing our previous discussion, please provide your revised pricing for the items below by ${deadline}.\n\nThank you.`,
  }
  return templates[template]
}
