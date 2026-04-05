import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
  Button,
  TextField,
  Input,
  TextArea,
  Label,
  FieldError,
} from 'react-aria-components'
import { addCustomer, getCustomerList } from '../../lib/server/sales-customers'
import { useSalesStore } from '../../stores/sales'

interface AddCustomerDialogProps {
  onCustomerCreated?: (customerId: string) => void
}

interface FormValues {
  phone: string
  companyName: string
  contactName: string
  deliveryAddress: string
  projectName: string
  notes: string
}

// Egyptian phone format: +20 or 0 prefix, mobile (01X) or landline (2-9)
const EGYPT_PHONE_REGEX = /^(\+20|0)(1[0125]\d{8}|[2-9]\d{7,8})$/

interface DuplicateWarning {
  type: 'phone' | 'company'
  customerName: string
  customerId: string
}

export function AddCustomerDialog({ onCustomerCreated }: AddCustomerDialogProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      phone: '',
      companyName: '',
      contactName: '',
      deliveryAddress: '',
      projectName: '',
      notes: '',
    },
  })

  // Creates record with status: 'unclaimed', auth_user_id: null -- no auth credentials
  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      addCustomer({
        phone: data.phone,
        companyName: data.companyName,
        contactName: data.contactName,
        deliveryAddress: data.deliveryAddress || undefined,
        projectName: data.projectName || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-list'] })
      queryClient.invalidateQueries({ queryKey: ['customer-360'] })
      reset()
      setDuplicateWarnings([])
      setIsOpen(false)

      // Navigate to Customer 360 for the newly created customer
      useSalesStore.getState().setSelectedCustomerId(result.customerId)
      useSalesStore.getState().setActiveTab('customer-360')

      if (onCustomerCreated) {
        onCustomerCreated(result.customerId)
      }
    },
  })

  const checkPhoneDuplicate = async (phone: string) => {
    if (!phone || !EGYPT_PHONE_REGEX.test(phone)) return
    try {
      const result = await getCustomerList({ search: phone, page: 1, limit: 5 })
      const matches = result.customers.filter((c) => c.phone === phone)
      setDuplicateWarnings((prev) => {
        const filtered = prev.filter((w) => w.type !== 'phone')
        if (matches.length > 0) {
          return [
            ...filtered,
            { type: 'phone', customerName: matches[0].companyName, customerId: matches[0].id },
          ]
        }
        return filtered
      })
    } catch {
      // Silently fail duplicate check
    }
  }

  const checkCompanyDuplicate = async (companyName: string) => {
    if (!companyName || companyName.length < 3) return
    try {
      const result = await getCustomerList({ search: companyName, page: 1, limit: 5 })
      const similar = result.customers.filter(
        (c) => c.companyName.toLowerCase().includes(companyName.toLowerCase()) ||
               companyName.toLowerCase().includes(c.companyName.toLowerCase()),
      )
      setDuplicateWarnings((prev) => {
        const filtered = prev.filter((w) => w.type !== 'company')
        if (similar.length > 0) {
          return [
            ...filtered,
            { type: 'company', customerName: similar[0].companyName, customerId: similar[0].id },
          ]
        }
        return filtered
      })
    } catch {
      // Silently fail duplicate check
    }
  }

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data)
  }

  const phoneWarning = duplicateWarnings.find((w) => w.type === 'phone')
  const companyWarning = duplicateWarnings.find((w) => w.type === 'company')

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#2563EB] border border-[#2563EB]/30 rounded-lg hover:bg-[#2563EB]/5 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50">
        + {t('sales.addCustomer.button')}
      </Button>
      <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <Modal className="w-full max-w-lg mx-4">
          <Dialog className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 shadow-2xl outline-none">
            {({ close }) => (
              <form onSubmit={handleSubmit(onSubmit)}>
                <Heading slot="title" className="text-lg font-bold text-black dark:text-white mb-4">
                  {t('sales.addCustomer.title')}
                </Heading>

                <div className="space-y-4">
                  {/* Phone - Required */}
                  <Controller
                    name="phone"
                    control={control}
                    rules={{
                      required: t('sales.addCustomer.phoneRequired'),
                      pattern: {
                        value: EGYPT_PHONE_REGEX,
                        message: t('sales.addCustomer.phoneInvalid'),
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        isInvalid={!!errors.phone}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          checkPhoneDuplicate(field.value)
                        }}
                      >
                        <Label className="text-sm font-medium text-black/70 dark:text-white/70">
                          {t('sales.addCustomer.phone')} *
                        </Label>
                        <Input
                          placeholder="+201001234567"
                          className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[invalid]:border-[#ef4444]"
                        />
                        {errors.phone && (
                          <FieldError className="text-xs text-[#ef4444] mt-1">
                            {errors.phone.message}
                          </FieldError>
                        )}
                      </TextField>
                    )}
                  />
                  {phoneWarning && (
                    <DuplicateWarningBanner
                      message={t('sales.addCustomer.phoneDuplicate', { name: phoneWarning.customerName })}
                      customerId={phoneWarning.customerId}
                    />
                  )}

                  {/* Company Name - Required */}
                  <Controller
                    name="companyName"
                    control={control}
                    rules={{
                      required: t('sales.addCustomer.companyRequired'),
                    }}
                    render={({ field }) => (
                      <TextField
                        isInvalid={!!errors.companyName}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          checkCompanyDuplicate(field.value)
                        }}
                      >
                        <Label className="text-sm font-medium text-black/70 dark:text-white/70">
                          {t('sales.addCustomer.companyName')} *
                        </Label>
                        <Input
                          className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[invalid]:border-[#ef4444]"
                        />
                        {errors.companyName && (
                          <FieldError className="text-xs text-[#ef4444] mt-1">
                            {errors.companyName.message}
                          </FieldError>
                        )}
                      </TextField>
                    )}
                  />
                  {companyWarning && (
                    <DuplicateWarningBanner
                      message={t('sales.addCustomer.companyDuplicate', { name: companyWarning.customerName })}
                      customerId={companyWarning.customerId}
                    />
                  )}

                  {/* Contact Name - Required */}
                  <Controller
                    name="contactName"
                    control={control}
                    rules={{
                      required: t('sales.addCustomer.contactRequired'),
                    }}
                    render={({ field }) => (
                      <TextField
                        isInvalid={!!errors.contactName}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      >
                        <Label className="text-sm font-medium text-black/70 dark:text-white/70">
                          {t('sales.addCustomer.contactName')} *
                        </Label>
                        <Input
                          className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[invalid]:border-[#ef4444]"
                        />
                        {errors.contactName && (
                          <FieldError className="text-xs text-[#ef4444] mt-1">
                            {errors.contactName.message}
                          </FieldError>
                        )}
                      </TextField>
                    )}
                  />

                  {/* Optional Fields */}
                  <div className="border-t border-black/5 dark:border-white/5 pt-4 mt-4">
                    <p className="text-xs text-black/40 dark:text-white/40 mb-3">
                      {t('sales.addCustomer.optional')}
                    </p>

                    <Controller
                      name="deliveryAddress"
                      control={control}
                      render={({ field }) => (
                        <TextField value={field.value} onChange={field.onChange} onBlur={field.onBlur}>
                          <Label className="text-sm font-medium text-black/70 dark:text-white/70">
                            {t('sales.addCustomer.deliveryAddress')}
                          </Label>
                          <TextArea
                            rows={2}
                            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 resize-none"
                          />
                        </TextField>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Controller
                        name="projectName"
                        control={control}
                        render={({ field }) => (
                          <TextField value={field.value} onChange={field.onChange} onBlur={field.onBlur}>
                            <Label className="text-sm font-medium text-black/70 dark:text-white/70">
                              {t('sales.addCustomer.projectName')}
                            </Label>
                            <Input
                              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                            />
                          </TextField>
                        )}
                      />

                      <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                          <TextField value={field.value} onChange={field.onChange} onBlur={field.onBlur}>
                            <Label className="text-sm font-medium text-black/70 dark:text-white/70">
                              {t('sales.addCustomer.notes')}
                            </Label>
                            <Input
                              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                            />
                          </TextField>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button
                    onPress={close}
                    className="px-4 py-2 text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded-lg"
                  >
                    {t('sales.addCustomer.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    isDisabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#2563EB]/90 disabled:opacity-40 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
                  >
                    {isSubmitting
                      ? t('sales.addCustomer.creating')
                      : t('sales.addCustomer.create')}
                  </Button>
                </div>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}

function DuplicateWarningBanner({
  message,
  customerId,
}: {
  message: string
  customerId: string
}) {
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#eab308]/10 border border-[#eab308]/20">
      <span className="text-xs text-[#eab308] flex-1">{message}</span>
      <button
        type="button"
        onClick={() => {
          useSalesStore.getState().setSelectedCustomerId(customerId)
          setActiveTab('customer-360')
        }}
        className="text-xs text-[#2563EB] hover:underline"
      >
        View
      </button>
    </div>
  )
}
