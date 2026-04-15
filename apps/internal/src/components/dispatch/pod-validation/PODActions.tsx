/**
 * Accept/Reject/Request Re-delivery as prominent buttons.
 * All disabled until checklist is complete.
 */
import { useState } from 'react'
import { Button, DialogTrigger, Dialog, Modal, Heading, Select, SelectValue, Popover, ListBox, ListBoxItem, Label, TextArea } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { confirmDeliveryPOD, flagDeliveryIssue } from '../../../lib/server/dispatch'
import type { PODValidationChecklist, DeliveryIssue } from '../../../types/dispatch'

interface PODActionsProps {
  deliveryId: string
  checklist: PODValidationChecklist
  onActionComplete: () => void
}

const ISSUE_TYPES: Array<{ value: DeliveryIssue['type']; label: string }> = [
  { value: 'partial', label: 'Partial Delivery' },
  { value: 'damage', label: 'Damage' },
  { value: 'wrong_items', label: 'Wrong Items' },
  { value: 'signature_issue', label: 'Signature Issue' },
  { value: 'customer_unavailable', label: 'Customer Unavailable' },
  { value: 'access_denied', label: 'Access Denied' },
  { value: 'other', label: 'Other' },
]

export function PODActions({ deliveryId, checklist, onActionComplete }: PODActionsProps) {
  const { t } = useTranslation('dispatch')
  const [loading, setLoading] = useState<string | null>(null)
  const [showFlagDialog, setShowFlagDialog] = useState(false)

  const allAnswered =
    checklist.photosOk !== undefined &&
    checklist.signatureOk !== undefined &&
    checklist.quantitiesOk !== undefined &&
    checklist.gpsOk !== undefined &&
    checklist.noDamage !== undefined

  const handleConfirm = async () => {
    setLoading('confirm')
    try {
      await confirmDeliveryPOD()
      onActionComplete()
    } finally {
      setLoading(null)
    }
  }

  const handleRedelivery = async () => {
    setLoading('redelivery')
    try {
      await confirmDeliveryPOD()
      onActionComplete()
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      await confirmDeliveryPOD()
      onActionComplete()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!allAnswered && (
        <p className="text-xs text-black/40 dark:text-white/40">
          {t('pod.actions.completeChecklist', 'Complete all checklist items to enable actions')}
        </p>
      )}

      <div className="flex gap-2">
        {/* Accept */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={handleConfirm}
          className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30 dark:bg-white dark:text-black"
        >
          {loading === 'confirm'
            ? t('pod.actions.confirming', 'Confirming...')
            : t('pod.actions.confirm', 'Accept')}
        </Button>

        {/* Flag */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={() => setShowFlagDialog(true)}
          className="rounded-lg border border-black/[0.08] px-4 py-2.5 text-sm font-medium text-black/70 transition-colors hover:bg-black/[0.03] disabled:opacity-30 dark:border-white/[0.08] dark:text-white/70 dark:hover:bg-white/[0.03]"
        >
          {t('pod.actions.flagIssue', 'Flag')}
        </Button>

        {/* Reject */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={handleReject}
          className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-30 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {loading === 'reject'
            ? t('pod.actions.rejecting', 'Rejecting...')
            : t('pod.actions.reject', 'Reject')}
        </Button>
      </div>

      {/* Re-delivery */}
      <Button
        isDisabled={!allAnswered || loading !== null}
        onPress={handleRedelivery}
        className="w-full rounded-lg border border-black/[0.08] px-4 py-2 text-sm text-black/50 transition-colors hover:bg-black/[0.03] disabled:opacity-30 dark:border-white/[0.08] dark:text-white/50 dark:hover:bg-white/[0.03]"
      >
        {loading === 'redelivery'
          ? t('pod.actions.requesting', 'Requesting...')
          : t('pod.actions.redelivery', 'Request Re-delivery')}
      </Button>

      {/* Flag Issue Dialog */}
      {showFlagDialog && (
        <FlagIssueDialog
          deliveryId={deliveryId}
          hasQuantityDiscrepancy={!checklist.quantitiesOk}
          onClose={() => setShowFlagDialog(false)}
          onSubmit={onActionComplete}
        />
      )}
    </div>
  )
}

function FlagIssueDialog({
  deliveryId,
  hasQuantityDiscrepancy,
  onClose,
  onSubmit,
}: {
  deliveryId: string
  hasQuantityDiscrepancy: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation('dispatch')
  const [issueType, setIssueType] = useState<DeliveryIssue['type'] | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!issueType || !description.trim()) return
    setSubmitting(true)
    try {
      await flagDeliveryIssue()
      onClose()
      onSubmit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogTrigger isOpen onOpenChange={(open) => { if (!open) onClose() }}>
      <Button className="hidden">trigger</Button>
      <Modal
        isDismissable
        isKeyboardDismissDisabled
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <Dialog className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white/95 p-6 shadow-xl outline-none dark:border-white/[0.08] dark:bg-black/95">
          <Heading slot="title" className="mb-4 text-lg font-semibold">
            {t('pod.flagDialog.title', 'Flag Delivery Issue')}
          </Heading>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-black/60 dark:text-white/60">
                {t('pod.flagDialog.issueType', 'Issue Type')}
              </Label>
              <Select
                selectedKey={issueType || null}
                onSelectionChange={(key) => setIssueType(key as DeliveryIssue['type'])}
                className="flex flex-col gap-1"
              >
                <Button className="flex items-center justify-between rounded-lg border border-black/[0.12] px-3 py-2 text-sm text-start dark:border-white/[0.12]">
                  <SelectValue className="text-sm" />
                  <svg className="h-4 w-4 text-black/30 dark:text-white/30" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </Button>
                <Popover className="w-[var(--trigger-width)] rounded-lg border border-black/[0.08] bg-white shadow-lg dark:border-white/[0.08] dark:bg-black">
                  <ListBox className="p-1 outline-none">
                    {ISSUE_TYPES.map((type) => (
                      <ListBoxItem
                        key={type.value}
                        id={type.value}
                        className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-black/[0.04] data-[focused]:bg-black/[0.04] dark:hover:bg-white/[0.04] dark:data-[focused]:bg-white/[0.04]"
                      >
                        {t(`pod.issueType.${type.value}`, type.label)}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            </div>

            {hasQuantityDiscrepancy && issueType === 'partial' && (
              <div className="rounded-lg bg-amber-50/60 px-3 py-2 dark:bg-amber-900/10">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t('pod.flagDialog.quantitySuggestion', 'Quantity discrepancy detected. Consider scheduling a re-delivery for remaining items.')}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-black/60 dark:text-white/60">
                {t('pod.flagDialog.description', 'Description')}
              </Label>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none rounded-lg border border-black/[0.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-white/[0.12]"
                placeholder={t('pod.flagDialog.descriptionPlaceholder', 'Describe the issue...')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onPress={onClose}
                className="rounded-lg px-4 py-2 text-sm text-black/50 transition-colors hover:bg-black/[0.04] dark:text-white/50 dark:hover:bg-white/[0.04]"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                isDisabled={!issueType || !description.trim() || submitting}
                onPress={handleSubmit}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30 dark:bg-white dark:text-black"
              >
                {submitting
                  ? t('pod.flagDialog.submitting', 'Submitting...')
                  : t('pod.flagDialog.submit', 'Submit Issue')}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </DialogTrigger>
  )
}
