import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { Button, DialogTrigger, Dialog, Modal, Heading } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendSupplierInquiry } from '../../../lib/server/procurement-inquiries'
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

export function InquiryBuilder() {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const setSelectedInquiryId = useProcurementStore((s) => s.setSelectedInquiryId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { control, handleSubmit, setValue, reset } = useForm<InquiryFormData>({
    defaultValues: {
      quoteRequestId: '',
      deadline: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      template: 'standard',
      message: '',
      items: DEFAULT_ITEMS,
      selectedSupplierIds: [],
    },
  })

  const watchedTemplate = useWatch({ control, name: 'template' })
  const watchedItems = useWatch({ control, name: 'items' })
  const watchedSupplierIds = useWatch({ control, name: 'selectedSupplierIds' })
  const watchedDeadline = useWatch({ control, name: 'deadline' })

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('procurement.inquiry.title')}</h2>
      </div>

      <form
        onSubmit={handleSubmit(() => setConfirmOpen(true))}
        className="flex flex-col gap-6"
      >
        {/* Quote Reference + Deadline Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black/60 dark:text-white/60">
              {t('procurement.inquiry.quoteReference')}
            </label>
            <Controller
              control={control}
              name="quoteRequestId"
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder={t('procurement.inquiry.quoteReferencePlaceholder')}
                  className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none backdrop-blur-xl transition-colors focus:border-[#2563EB] dark:border-white/10 dark:bg-black/60"
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black/60 dark:text-white/60">
              {t('procurement.inquiry.responseDeadline')}
            </label>
            <Controller
              control={control}
              name="deadline"
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm outline-none backdrop-blur-xl transition-colors focus:border-[#2563EB] dark:border-white/10 dark:bg-black/60"
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black/60 dark:text-white/60">
              {t('procurement.inquiry.template')}
            </label>
            <Controller
              control={control}
              name="template"
              render={({ field }) => (
                <InquiryTemplateSelector
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val)
                    // Auto-populate message from template
                    setValue('message', getTemplateMessage(val, watchedDeadline))
                  }}
                />
              )}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="rounded-2xl border border-black/10 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
          <div className="border-b border-black/10 px-5 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold">{t('procurement.inquiry.itemsToInquire')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-start dark:border-white/5">
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.inquiry.product')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.inquiry.quantity')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.inquiry.uom')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.inquiry.specs')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.inquiry.suppliers')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {watchedItems.map((item, idx) => (
                  <tr key={item.productId} className="border-b border-black/5 dark:border-white/5">
                    <td className="px-5 py-3 font-medium">{item.productName}</td>
                    <td className="px-5 py-3">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-black/60 dark:text-white/60">{item.uom}</td>
                    <td className="px-5 py-3 text-black/60 dark:text-white/60 max-w-[200px] truncate">
                      {item.specs}
                    </td>
                    <td className="px-5 py-3">
                      <SupplierSelector
                        productId={item.productId}
                        selectedIds={watchedSupplierIds}
                        onSelectionChange={(ids) => setValue('selectedSupplierIds', ids)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black/60 dark:text-white/60">
            {t('procurement.inquiry.message')}
          </label>
          <Controller
            control={control}
            name="message"
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none backdrop-blur-xl transition-colors focus:border-[#2563EB] dark:border-white/10 dark:bg-black/60"
                placeholder={t('procurement.inquiry.messagePlaceholder')}
              />
            )}
          />
        </div>

        {/* Send Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              isDisabled
              className="rounded-lg border border-black/10 px-4 py-2 text-sm text-black/40 dark:border-white/10 dark:text-white/40"
            >
              {t('procurement.inquiry.sendViaEmail')}
            </Button>
            <Button
              type="button"
              isDisabled
              className="rounded-lg border border-black/10 px-4 py-2 text-sm text-black/40 dark:border-white/10 dark:text-white/40"
            >
              {t('procurement.inquiry.sendViaPortal')}
            </Button>
            <Button
              type="button"
              isDisabled
              className="rounded-lg border border-black/10 px-4 py-2 text-sm text-black/40 dark:border-white/10 dark:text-white/40"
            >
              {t('procurement.inquiry.sendViaWhatsApp')}
            </Button>
          </div>
          <div className="ms-auto">
            <Button
              type="submit"
              isDisabled={watchedSupplierIds.length === 0 || mutation.isPending}
              className="rounded-lg bg-[#2563EB] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]/90 disabled:opacity-40"
            >
              {mutation.isPending
                ? t('procurement.inquiry.sending')
                : t('procurement.inquiry.sendToAllSelected')}
            </Button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <DialogTrigger isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Dialog
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl outline-none dark:bg-black/90"
            isKeyboardDismissDisabled
          >
            <Heading slot="title" className="mb-4 text-lg font-semibold">
              {t('procurement.inquiry.confirmTitle')}
            </Heading>
            <p className="mb-6 text-sm text-black/60 dark:text-white/60">
              {t('procurement.inquiry.confirmMessage', { count: watchedSupplierIds.length })}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onPress={() => setConfirmOpen(false)}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm dark:border-white/10"
              >
                {t('procurement.inquiry.cancel')}
              </Button>
              <Button
                onPress={handleSubmit(onSubmit)}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white"
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
