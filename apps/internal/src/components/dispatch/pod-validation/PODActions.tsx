/**
 * POD action buttons: Confirm, Flag Issue, Request Re-delivery, Reject.
 * All disabled until all checklist items are answered.
 * Calls server functions confirmDeliveryPOD / flagDeliveryIssue.
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

  // All 5 checklist items must have a value
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
      <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">
        {t('pod.actions.title', 'Actions')}
      </h4>

      {!allAnswered && (
        <p className="text-xs text-black/50 dark:text-white/50">
          {t('pod.actions.completeChecklist', 'Complete all checklist items to enable actions')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Confirm Delivery */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={handleConfirm}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'confirm'
            ? t('pod.actions.confirming', 'Confirming...')
            : t('pod.actions.confirm', 'Confirm Delivery')}
        </Button>

        {/* Flag Issue */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={() => setShowFlagDialog(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('pod.actions.flagIssue', 'Flag Issue')}
        </Button>

        {/* Request Re-delivery */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={handleRedelivery}
          className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'redelivery'
            ? t('pod.actions.requesting', 'Requesting...')
            : t('pod.actions.redelivery', 'Request Re-delivery')}
        </Button>

        {/* Reject */}
        <Button
          isDisabled={!allAnswered || loading !== null}
          onPress={handleReject}
          className="rounded-lg px-4 py-2 text-sm font-medium text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'reject'
            ? t('pod.actions.rejecting', 'Rejecting...')
            : t('pod.actions.reject', 'Reject')}
        </Button>
      </div>

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

// ─── Flag Issue Dialog ──────────────────────────────────

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <Dialog className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-6 shadow-xl outline-none" isKeyboardDismissDisabled>
          <Heading slot="title" className="text-lg font-semibold mb-4">
            {t('pod.flagDialog.title', 'Flag Delivery Issue')}
          </Heading>

          <div className="flex flex-col gap-4">
            {/* Issue type select */}
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-black/60 dark:text-white/60">
                {t('pod.flagDialog.issueType', 'Issue Type')}
              </Label>
              <Select
                selectedKey={issueType || null}
                onSelectionChange={(key) => setIssueType(key as DeliveryIssue['type'])}
                className="flex flex-col gap-1"
              >
                <Button className="flex items-center justify-between rounded-lg border border-black/20 dark:border-white/20 px-3 py-2 text-sm text-start">
                  <SelectValue className="text-sm" />
                  <svg className="w-4 h-4 text-black/40 dark:text-white/40" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </Button>
                <Popover className="w-[var(--trigger-width)] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
                  <ListBox className="p-1 outline-none">
                    {ISSUE_TYPES.map((type) => (
                      <ListBoxItem
                        key={type.value}
                        id={type.value}
                        className="px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5 outline-none"
                      >
                        {t(`pod.issueType.${type.value}`, type.label)}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            </div>

            {/* Auto-suggestion for quantity discrepancy */}
            {hasQuantityDiscrepancy && issueType === 'partial' && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('pod.flagDialog.quantitySuggestion', 'Quantity discrepancy detected. Consider scheduling a re-delivery for remaining items.')}
                </p>
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-black/60 dark:text-white/60">
                {t('pod.flagDialog.description', 'Description')}
              </Label>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#2563EB] resize-none"
                placeholder={t('pod.flagDialog.descriptionPlaceholder', 'Describe the issue...')}
              />
            </div>

            {/* Dialog actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onPress={onClose}
                className="rounded-lg px-4 py-2 text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                isDisabled={!issueType || !description.trim() || submitting}
                onPress={handleSubmit}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
