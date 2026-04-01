/**
 * Addresses settings section.
 * List of saved addresses with Edit/Delete/Set as Default.
 * Add New Address button opens React Aria Dialog (GlassElevated, isKeyboardDismissDisabled).
 * Governorate select with 27 Egyptian governorates.
 */
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Check, MapPin } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveAddress, deleteAddress } from '../../lib/server/settings'
import type { Address } from '../../types/settings'

const EGYPTIAN_GOVERNORATES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qalyubia',
  'Dakahlia',
  'Sharqia',
  'Gharbia',
  'Monufia',
  'Kafr El Sheikh',
  'Beheira',
  'Damietta',
  'Port Said',
  'Ismailia',
  'Suez',
  'North Sinai',
  'South Sinai',
  'Beni Suef',
  'Faiyum',
  'Minya',
  'Assiut',
  'Sohag',
  'Qena',
  'Luxor',
  'Aswan',
  'Red Sea',
  'New Valley',
  'Matrouh',
] as const

interface AddressesSectionProps {
  addresses: Address[]
}

interface AddressFormValues {
  label: string
  street: string
  city: string
  governorate: string
  postalCode: string
  isDefault: boolean
}

export function AddressesSection({ addresses }: AddressesSectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: (data: AddressFormValues & { id?: string }) =>
      saveAddress({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setShowForm(false)
      setEditingAddress(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) =>
      deleteAddress({ data: { addressId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setDeletingId(null)
    },
  })

  function handleEdit(address: Address) {
    setEditingAddress(address)
    setShowForm(true)
  }

  function handleAdd() {
    setEditingAddress(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {t('settings.addresses.title')}
        </h2>
        <Button
          onPress={handleAdd}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          {t('settings.addresses.addNew')}
        </Button>
      </div>

      {/* Address list */}
      <div className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="flex items-start justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]"
          >
            <div className="flex items-start gap-3">
              <MapPin
                size={18}
                className="mt-0.5 text-[var(--color-text-muted)]"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {address.label}
                  </span>
                  {address.isDefault && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs bg-[var(--color-success)]/10 text-[var(--color-success)]">
                      <Check size={10} />
                      {t('settings.addresses.default')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  {address.street}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {address.city}, {address.governorate}
                  {address.postalCode ? ` ${address.postalCode}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!address.isDefault && (
                <Button
                  onPress={() =>
                    saveMutation.mutate({
                      id: address.id,
                      label: address.label,
                      street: address.street,
                      city: address.city,
                      governorate: address.governorate,
                      postalCode: address.postalCode ?? '',
                      isDefault: true,
                    })
                  }
                  className="px-2 py-1 text-xs text-[var(--color-primary)] hover:underline cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
                >
                  {t('settings.addresses.setDefault')}
                </Button>
              )}
              <Button
                onPress={() => handleEdit(address)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label={t('settings.addresses.edit')}
              >
                <Pencil size={14} />
              </Button>
              <Button
                onPress={() => setDeletingId(address.id)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                aria-label={t('settings.addresses.delete')}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}

        {addresses.length === 0 && (
          <div className="text-center py-8">
            <MapPin
              size={32}
              className="mx-auto text-[var(--color-text-subtle)] mb-2"
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('settings.addresses.empty')}
            </p>
          </div>
        )}
      </div>

      {/* Address form dialog */}
      {showForm && (
        <AddressFormDialog
          address={editingAddress}
          onSave={(data) =>
            saveMutation.mutate({
              ...data,
              id: editingAddress?.id,
            })
          }
          onClose={() => {
            setShowForm(false)
            setEditingAddress(null)
          }}
          isPending={saveMutation.isPending}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => deleteMutation.mutate(deletingId)}
          onClose={() => setDeletingId(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

// ============================================================================
// Address Form Dialog
// ============================================================================

function AddressFormDialog({
  address,
  onSave,
  onClose,
  isPending,
}: {
  address: Address | null
  onSave: (data: AddressFormValues) => void
  onClose: () => void
  isPending: boolean
}) {
  const { t } = useTranslation('portal')

  const { control, handleSubmit } = useForm<AddressFormValues>({
    defaultValues: {
      label: address?.label ?? '',
      street: address?.street ?? '',
      city: address?.city ?? '',
      governorate: address?.governorate ?? '',
      postalCode: address?.postalCode ?? '',
      isDefault: address?.isDefault ?? false,
    },
  })

  const onSubmit = handleSubmit((data) => onSave(data))

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal
        isKeyboardDismissDisabled
        className="w-full max-w-md mx-4 rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)] mb-4">
            {address
              ? t('settings.addresses.editTitle')
              : t('settings.addresses.addTitle')}
          </Heading>

          <form onSubmit={onSubmit} className="space-y-4">
            <Controller
              name="label"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  isRequired
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.addresses.label')}
                  </Label>
                  <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                </TextField>
              )}
            />

            <Controller
              name="street"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  isRequired
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.addresses.street')}
                  </Label>
                  <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                </TextField>
              )}
            />

            <Controller
              name="city"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  isRequired
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.addresses.city')}
                  </Label>
                  <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                </TextField>
              )}
            />

            {/* Governorate Select */}
            <Controller
              name="governorate"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select
                  selectedKey={field.value || null}
                  onSelectionChange={(key) => field.onChange(key as string)}
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.addresses.governorate')}
                  </Label>
                  <Button className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer">
                    <SelectValue className="truncate" />
                  </Button>
                  <Popover className="w-[var(--trigger-width)] max-h-60 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                    <ListBox className="p-1">
                      {EGYPTIAN_GOVERNORATES.map((gov) => (
                        <ListBoxItem
                          key={gov}
                          id={gov}
                          textValue={gov}
                          className="px-3 py-2 text-sm text-[var(--color-text)] rounded-lg cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] data-[selected]:text-[var(--color-primary)] data-[selected]:font-medium"
                        >
                          {gov}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>
              )}
            />

            {/* Postal Code (optional) */}
            <Controller
              name="postalCode"
              control={control}
              render={({ field }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.addresses.postalCode')}
                  </Label>
                  <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                </TextField>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onPress={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {t('settings.cancel')}
              </Button>
              <Button
                type="submit"
                isDisabled={isPending}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {isPending
                  ? t('settings.saving')
                  : t('settings.saveChanges')}
              </Button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

// ============================================================================
// Delete Confirm Dialog
// ============================================================================

function DeleteConfirmDialog({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const { t } = useTranslation('portal')

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal
        isKeyboardDismissDisabled
        className="w-full max-w-sm mx-4 rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)] mb-2">
            {t('settings.addresses.deleteConfirm')}
          </Heading>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {t('settings.addresses.deleteBody')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              onPress={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {t('settings.cancel')}
            </Button>
            <Button
              onPress={onConfirm}
              isDisabled={isPending}
              className="px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {t('settings.addresses.deleteAction')}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
