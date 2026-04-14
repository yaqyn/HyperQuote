/**
 * Profile settings section.
 * "Data is the design" — underline inputs, 11px uppercase labels, no decoration.
 * Phone read-only monospace. Profile photo 48px circle. Trade license minimal upload.
 * Save button dark bg, only when dirty.
 */
import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { TextField, Input, Label, Button, FileTrigger } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import {
  updateCustomerProfile,
  uploadTradeLicense,
  uploadProfilePhoto,
} from '../../lib/server/settings'
import type { CustomerProfile } from '../../types/settings'

interface ProfileSectionProps {
  profile: CustomerProfile
}

interface ProfileFormValues {
  companyName: string
  contactName: string
  email: string
}

const labelClass =
  'text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

const underlineInputClass =
  'w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] placeholder:text-[var(--color-text-subtle)]'

export function ProfileSection({ profile }: ProfileSectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()

  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    defaultValues: {
      companyName: profile.companyName,
      contactName: profile.contactName,
      email: profile.email ?? '',
    },
  })

  const watchedValues = useWatch({ control })

  const hasChanges =
    watchedValues.companyName !== profile.companyName ||
    watchedValues.contactName !== profile.contactName ||
    watchedValues.email !== (profile.email ?? '')

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormValues) =>
      updateCustomerProfile({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
      reset(watchedValues as ProfileFormValues)
    },
  })

  const licenseMutation = useMutation({
    mutationFn: (fileUrl: string) =>
      uploadTradeLicense({ data: { fileUrl } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
    },
  })

  const photoMutation = useMutation({
    mutationFn: (fileUrl: string) =>
      uploadProfilePhoto({ data: { fileUrl } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
    },
  })

  const [photoPreview, setPhotoPreview] = useState<string | undefined>(
    profile.profilePhotoUrl,
  )

  const onSubmit = handleSubmit((data) => {
    updateMutation.mutate(data)
  })

  function handleLicenseSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 5 * 1024 * 1024) return
    const url = URL.createObjectURL(file)
    licenseMutation.mutate(url)
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 2 * 1024 * 1024) return
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    photoMutation.mutate(url)
  }

  return (
    <div className="space-y-8">
      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <FileTrigger
          acceptedFileTypes={['image/jpeg', 'image/png']}
          onSelect={handlePhotoSelect}
        >
          <Button className="relative w-12 h-12 rounded-full border border-[var(--color-border)] overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={t('settings.profile.photo')}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-sm text-[var(--color-text-subtle)]">
                {profile.contactName?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            )}
          </Button>
        </FileTrigger>
        <div>
          <p className="text-[13px] text-[var(--color-text-subtle)]">
            JPG, PNG. {t('settings.profile.maxSize', { size: '2MB' })}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Company Name */}
        <Controller
          name="companyName"
          control={control}
          render={({ field }) => (
            <TextField
              value={field.value}
              onChange={field.onChange}
              className="space-y-1.5"
            >
              <Label className={labelClass}>
                {t('settings.profile.companyName')}
              </Label>
              <Input className={underlineInputClass} />
            </TextField>
          )}
        />

        {/* Contact Name */}
        <Controller
          name="contactName"
          control={control}
          render={({ field }) => (
            <TextField
              value={field.value}
              onChange={field.onChange}
              className="space-y-1.5"
            >
              <Label className={labelClass}>
                {t('settings.profile.contactName')}
              </Label>
              <Input className={underlineInputClass} />
            </TextField>
          )}
        />

        {/* Phone (read-only) */}
        <div className="space-y-1.5">
          <span className={labelClass}>
            {t('settings.profile.phone')}
          </span>
          <div className="border-b border-[var(--color-border)] py-2">
            <span className="font-mono text-sm text-[var(--color-text)]">
              {profile.phone}
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-text-subtle)]">
            {t('settings.profile.phoneNote')}
          </p>
        </div>

        {/* Email */}
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              value={field.value}
              onChange={field.onChange}
              type="email"
              className="space-y-1.5"
            >
              <Label className={labelClass}>
                {t('settings.profile.email')}
              </Label>
              <Input className={underlineInputClass} />
            </TextField>
          )}
        />

        {/* Save button — only when dirty */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Button
                type="submit"
                isDisabled={updateMutation.isPending}
                className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {updateMutation.isPending
                  ? t('settings.saving')
                  : t('settings.saveChanges')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Trade License */}
      <div className="space-y-3 pt-6 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <span className={labelClass}>
            {t('settings.profile.tradeLicense')}
          </span>
          <TradeLicenseBadge status={profile.tradeLicenseStatus} />
        </div>

        <FileTrigger
          acceptedFileTypes={['application/pdf', 'image/jpeg']}
          onSelect={handleLicenseSelect}
        >
          <Button className="w-full py-6 border border-dashed border-[var(--color-border)] text-[13px] text-[var(--color-text-subtle)] hover:border-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors">
            {t('settings.profile.uploadLicense')}
          </Button>
        </FileTrigger>
        <p className="text-[13px] text-[var(--color-text-subtle)]">
          PDF, JPG. {t('settings.profile.maxSize', { size: '5MB' })}
        </p>
      </div>
    </div>
  )
}

function TradeLicenseBadge({
  status,
}: {
  status: CustomerProfile['tradeLicenseStatus']
}) {
  const { t } = useTranslation('portal')

  const labels: Record<string, string> = {
    verified: t('settings.profile.verified'),
    under_review: t('settings.profile.underReview'),
  }

  const label = labels[status] ?? t('settings.profile.notUploaded')

  return (
    <span className="text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
      {label}
    </span>
  )
}
