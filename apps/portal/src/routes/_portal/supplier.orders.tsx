/**
 * Supplier PO inbox with 3 tabs: Pending Action, Confirmed, History.
 * Confirmed tab has Update Status and Submit Invoice actions.
 * Uses uploadDeliveryNote server function for delivery status updates.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DropZone,
  FileTrigger,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
  Input,
  Label,
  Dialog,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { Package, Upload } from 'lucide-react'
import { useState } from 'react'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { POCard } from '../../components/supplier/POCard'
import { getSupplierPOs, uploadDeliveryNote } from '../../lib/server/supplier-orders'
import { toast } from '../../lib/toast'
import type { SupplierPO } from '../../types/supplier'

export const Route = createFileRoute('/_portal/supplier/orders')({
  component: SupplierOrdersWindow,
})

function SupplierOrdersWindow() {
  const { t, i18n } = useTranslation('portal')
  const locale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'

  return (
    <>
      <WindowShell title={t('supplier.purchaseOrdersTitle')}>
        <div className="flex flex-col gap-4 p-6">
          <Tabs defaultSelectedKey="pending" className="flex flex-col gap-4">
            <TabList className="flex gap-1 border-b border-[var(--color-border)]">
              <StyledTab id="pending">{t('supplier.pendingAction')}</StyledTab>
              <StyledTab id="confirmed">{t('supplier.confirmed')}</StyledTab>
              <StyledTab id="history">{t('supplier.history')}</StyledTab>
            </TabList>

            <TabPanel id="pending">
              <PendingTab locale={locale} />
            </TabPanel>
            <TabPanel id="confirmed">
              <ConfirmedTab locale={locale} />
            </TabPanel>
            <TabPanel id="history">
              <HistoryTab locale={locale} />
            </TabPanel>
          </Tabs>
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}

// ============================================================================
// Styled Tab
// ============================================================================

function StyledTab({
  id,
  children,
}: { id: string; children: React.ReactNode }) {
  return (
    <Tab
      id={id}
      className={({ isSelected }) =>
        [
          'px-4 py-2 text-sm cursor-pointer outline-none transition-colors -mb-px',
          isSelected
            ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-semibold'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        ].join(' ')
      }
    >
      {children}
    </Tab>
  )
}

// ============================================================================
// Pending Tab -- POs with status 'sent' or 'acknowledged'
// ============================================================================

function PendingTab({ locale }: { locale: 'ar' | 'en' }) {
  const { t } = useTranslation('portal')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-pos', 'pending'],
    queryFn: () => getSupplierPOs({ data: { status: 'sent', page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  if (isLoading) return <SkeletonCards />

  const pos = data?.purchaseOrders ?? []
  // Sort by urgency: oldest first (most urgent deadline)
  const sorted = [...pos].sort(
    (a, b) => new Date(a.responseDeadline).getTime() - new Date(b.responseDeadline).getTime(),
  )

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Package size={48} className="text-[var(--color-text-subtle)]" />}
        title={t('supplier.emptyPO')}
        body={t('supplier.emptyPOBody')}
      />
    )
  }

  return (
    <div className="flex flex-col">
      {sorted.map((po) => (
        <POCard key={po.id} po={po} locale={locale} />
      ))}
    </div>
  )
}

// ============================================================================
// Confirmed Tab -- POs confirmed/in_production/shipped with Update Status + Submit Invoice
// ============================================================================

function ConfirmedTab({ locale }: { locale: 'ar' | 'en' }) {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-pos', 'confirmed'],
    queryFn: () => getSupplierPOs({ data: { status: 'confirmed', page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  // Filter to include confirmed + in_production + shipped
  const allPos = data?.purchaseOrders ?? []
  const pos = allPos.filter((po) =>
    ['confirmed', 'in_production', 'shipped'].includes(po.status),
  )

  if (isLoading) return <SkeletonCards />

  if (pos.length === 0) {
    return (
      <EmptyState
        title={t('supplier.confirmed')}
        body={t('supplier.emptyPOBody')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {pos.map((po) => (
        <ConfirmedPOCard
          key={po.id}
          po={po}
          locale={locale}
          onSubmitInvoice={() =>
            navigate({ to: '/supplier/invoices', search: { poId: po.id } })
          }
          onStatusUpdated={() =>
            queryClient.invalidateQueries({ queryKey: ['supplier-pos'] })
          }
        />
      ))}
    </div>
  )
}

// ============================================================================
// Confirmed PO Card with Update Status + Submit Invoice buttons
// ============================================================================

function ConfirmedPOCard({
  po,
  locale,
  onSubmitInvoice,
  onStatusUpdated,
}: {
  po: SupplierPO
  locale: 'ar' | 'en'
  onSubmitInvoice: () => void
  onStatusUpdated: () => void
}) {
  const { t } = useTranslation('portal')
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [deliveryFileUrl, setDeliveryFileUrl] = useState('')
  const [deliveryFileName, setDeliveryFileName] = useState('')

  const deliveryNoteMutation = useMutation({
    mutationFn: () =>
      uploadDeliveryNote({
        data: {
          poId: po.id,
          fileUrl: deliveryFileUrl,
          deliveryDate: new Date().toISOString(),
          quantity: po.items.reduce((sum, item) => sum + item.quantityRequested, 0),
        },
      }),
    onSuccess: () => {
      toast.success(t('supplier.delivered'))
      setShowDeliveryModal(false)
      setDeliveryFileName('')
      setDeliveryFileUrl('')
      setTrackingNumber('')
      onStatusUpdated()
    },
  })

  const formattedDate = new Date(po.dateReceived).toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-transparent">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-semibold text-sm text-[var(--color-text)]">
          {po.reference}
        </span>
        <span className="font-mono text-[13px] text-[var(--color-text-muted)]">
          {formattedDate}
        </span>
      </div>

      <p className="text-[13px] text-[var(--color-text-muted)] mb-3">
        <span className="font-mono">{po.items.length}</span> {t('supplier.itemsSummary')}
        {' \u00B7 '}
        {t(`supplier.${po.status === 'in_production' ? 'inProduction' : po.status}`)}
      </p>

      <div className="flex gap-2">
        <Button
          onPress={() => setShowDeliveryModal(true)}
          className="h-9 px-4 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-text)] font-medium hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
        >
          {t('supplier.updateStatus')}
        </Button>
        <Button
          onPress={onSubmitInvoice}
          className="h-9 px-4 rounded-lg bg-[var(--color-primary)] text-white text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          {t('supplier.submitInvoice')}
        </Button>
      </div>

      {/* Delivery note modal */}
      <ModalOverlay
        isOpen={showDeliveryModal}
        onOpenChange={setShowDeliveryModal}
        isDismissable
        isKeyboardDismissDisabled
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      >
        <Modal className="w-[90vw] max-w-md">
          <Dialog
            className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl p-6 shadow-2xl outline-none"
            role="alertdialog"
          >
            {({ close }) => (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">
                  {t('supplier.updateStatus')}
                </h3>

                <TextField
                  value={trackingNumber}
                  onChange={setTrackingNumber}
                  className="flex flex-col gap-1"
                >
                  <Label className="text-[13px] text-[var(--color-text-muted)]">
                    {t('supplier.trackingNumber')}
                  </Label>
                  <Input className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] font-mono text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                </TextField>

                {/* Delivery note PDF upload */}
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-[var(--color-text-muted)]">
                    {t('supplier.uploadDeliveryNote')}
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
                            setDeliveryFileName(f.name)
                            setDeliveryFileUrl(`/delivery-notes/${f.name}`)
                          }
                        }
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors min-h-[100px]"
                  >
                    <Upload size={20} className="text-[var(--color-text-muted)]" />
                    {deliveryFileName ? (
                      <p className="text-sm font-mono text-[var(--color-text)]">
                        {deliveryFileName}
                      </p>
                    ) : (
                      <p className="text-[13px] text-[var(--color-text-muted)]">
                        {t('supplier.deliveryNote')} (PDF, max 10MB)
                      </p>
                    )}
                    <FileTrigger
                      acceptedFileTypes={['application/pdf']}
                      onSelect={(files) => {
                        if (files && files.length > 0) {
                          const f = files[0]
                          if (f.size <= 10 * 1024 * 1024) {
                            setDeliveryFileName(f.name)
                            setDeliveryFileUrl(`/delivery-notes/${f.name}`)
                          }
                        }
                      }}
                    >
                      <Button className="h-8 px-4 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-text)] font-medium cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                        {t('supplier.browseFiles')}
                      </Button>
                    </FileTrigger>
                  </DropZone>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    onPress={close}
                    className="px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  >
                    {t('supplier.goBack')}
                  </Button>
                  <Button
                    onPress={() => deliveryNoteMutation.mutate()}
                    isDisabled={deliveryNoteMutation.isPending}
                    className="px-6 py-2 rounded-xl bg-[var(--color-success)] text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {t('supplier.delivered')}
                  </Button>
                </div>
              </div>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  )
}

// ============================================================================
// History Tab -- POs delivered/rejected
// ============================================================================

function HistoryTab({ locale }: { locale: 'ar' | 'en' }) {
  const { t } = useTranslation('portal')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-pos', 'history'],
    queryFn: () => getSupplierPOs({ data: { page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  const allPos = data?.purchaseOrders ?? []
  const pos = allPos.filter((po) =>
    ['delivered', 'rejected'].includes(po.status),
  )

  if (isLoading) return <SkeletonCards />

  if (pos.length === 0) {
    return (
      <EmptyState
        title={t('supplier.history')}
        body={t('supplier.emptyPOBody')}
      />
    )
  }

  return (
    <div className="flex flex-col">
      {pos.map((po) => (
        <POCard key={po.id} po={po} locale={locale} />
      ))}
    </div>
  )
}

// ============================================================================
// Shared UI
// ============================================================================

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-[var(--color-surface)] p-4 animate-pulse"
        >
          <div className="h-4 w-28 bg-[var(--color-border)] rounded mb-2" />
          <div className="h-3 w-48 bg-[var(--color-border)] rounded mb-2" />
          <div className="h-3 w-20 bg-[var(--color-border)] rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon?: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      {icon}
      <p className="text-lg font-semibold text-[var(--color-text)]">{title}</p>
      <p className="text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  )
}
