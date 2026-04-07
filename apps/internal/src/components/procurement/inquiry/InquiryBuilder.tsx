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

// ─── Channel Toggle ──────────────────────────────────────

function ChannelPill({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <Button
      onPress={onToggle}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-all duration-150
        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40
        ${
          active
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-black/[0.04] text-[var(--color-text-muted)] data-[hovered]:bg-black/[0.06] dark:bg-white/[0.04] dark:data-[hovered]:bg-white/[0.06]'
        }`}
    >
      {label}
    </Button>
  )
}

// ─── Main Builder ────────────────────────────────────────

export function InquiryBuilder() {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const setSelectedInquiryId = useProcurementStore((s) => s.setSelectedInquiryId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [channels, setChannels] = useState({ email: true, portal: false, whatsapp: false })

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

  const toggleChannel = (ch: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }))
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      {/* Header */}
      <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-text)]">
        {t('procurement.inquiry.title')}
      </h2>

      <form
        onSubmit={handleSubmit(() => setConfirmOpen(true))}
        className="flex flex-col gap-5"
      >
        {/* ── Inline Fields: Quote Ref + Deadline ── */}
        <div className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
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
                  className="w-full border-b border-black/[0.08] bg-transparent py-1.5 text-[13px] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] dark:border-white/[0.08]"
                />
              )}
            />
          </div>

          <div className="flex w-40 flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
              {t('procurement.inquiry.responseDeadline')}
            </label>
            <Controller
              control={control}
              name="deadline"
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className="w-full border-b border-black/[0.08] bg-transparent py-1.5 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.08]"
                />
              )}
            />
          </div>
        </div>

        {/* ── Template Selector (pill group) ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
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
                  setValue('message', getTemplateMessage(val, watchedDeadline))
                }}
              />
            )}
          />
        </div>

        {/* ── Items Table (inline spreadsheet) ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                <th className="py-2 pe-4 text-start text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  {t('procurement.inquiry.product')}
                </th>
                <th className="py-2 pe-4 text-start text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  {t('procurement.inquiry.quantity')}
                </th>
                <th className="py-2 pe-4 text-start text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  {t('procurement.inquiry.uom')}
                </th>
                <th className="py-2 pe-4 text-start text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  {t('procurement.inquiry.specs')}
                </th>
                <th className="py-2 text-start text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  {t('procurement.inquiry.suppliers')}
                </th>
              </tr>
            </thead>
            <tbody>
              {watchedItems.map((item) => (
                <tr
                  key={item.productId}
                  className="border-b border-black/[0.03] dark:border-white/[0.03]"
                >
                  <td className="py-2.5 pe-4 font-medium text-[var(--color-text)]">
                    {item.productName}
                  </td>
                  <td className="py-2.5 pe-4">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-2.5 pe-4 text-[var(--color-text-muted)]">
                    {item.uom}
                  </td>
                  <td className="max-w-[200px] truncate py-2.5 pe-4 text-[var(--color-text-muted)]">
                    {item.specs}
                  </td>
                  <td className="py-2.5">
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

        {/* ── Message (border-bottom only textarea) ── */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            {t('procurement.inquiry.message')}
          </label>
          <Controller
            control={control}
            name="message"
            render={({ field }) => (
              <textarea
                {...field}
                rows={3}
                className="resize-none border-b border-black/[0.08] bg-transparent py-2 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] dark:border-white/[0.08]"
                placeholder={t('procurement.inquiry.messagePlaceholder')}
              />
            )}
          />
        </div>

        {/* ── Send Channels + Action ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <ChannelPill
              label={t('procurement.inquiry.sendViaEmail')}
              active={channels.email}
              onToggle={() => toggleChannel('email')}
            />
            <ChannelPill
              label={t('procurement.inquiry.sendViaPortal')}
              active={channels.portal}
              onToggle={() => toggleChannel('portal')}
            />
            <ChannelPill
              label={t('procurement.inquiry.sendViaWhatsApp')}
              active={channels.whatsapp}
              onToggle={() => toggleChannel('whatsapp')}
            />
          </div>

          <Button
            type="submit"
            isDisabled={watchedSupplierIds.length === 0 || mutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-[13px] font-semibold text-white outline-none transition-colors
              data-[hovered]:bg-[var(--color-primary)]/90
              data-[disabled]:opacity-40
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40 data-[focus-visible]:ring-offset-2"
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
            <Heading slot="title" className="mb-3 text-[15px] font-semibold tracking-tight">
              {t('procurement.inquiry.confirmTitle')}
            </Heading>
            <p className="mb-6 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              {t('procurement.inquiry.confirmMessage', { count: watchedSupplierIds.length })}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onPress={() => setConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--color-text-muted)] outline-none transition-colors
                  data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
                  data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
              >
                {t('procurement.inquiry.cancel')}
              </Button>
              <Button
                onPress={handleSubmit(onSubmit)}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white outline-none transition-colors
                  data-[hovered]:bg-[var(--color-primary)]/90
                  data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40 data-[focus-visible]:ring-offset-2"
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
