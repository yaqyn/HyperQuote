/**
 * Profile settings section.
 * Company name, contact name (editable with Save button on change).
 * Phone (read-only, Geist Mono). Email (editable).
 * Trade license upload with status badges. Profile photo 64px circle.
 * Uses React Hook Form with useWatch() for detecting changes.
 */
import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { TextField, Input, Label, Button, FileTrigger } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Upload, Camera, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
    if (file.size > 5 * 1024 * 1024) return // Max 5MB
    const url = URL.createObjectURL(file)
    licenseMutation.mutate(url)
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 2 * 1024 * 1024) return // Max 2MB
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    photoMutation.mutate(url)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">
        {t('settings.profile.title')}
      </h2>

      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden flex items-center justify-center">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={t('settings.profile.photo')}
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera size={24} className="text-[var(--color-text-muted)]" />
            )}
          </div>
          <FileTrigger
            acceptedFileTypes={['image/jpeg', 'image/png']}
            onSelect={handlePhotoSelect}
          >
            <Button className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
              <Camera size={12} />
            </Button>
          </FileTrigger>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.profile.photo')}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            JPG, PNG. {t('settings.profile.maxSize', { size: '2MB' })}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Company Name */}
        <Controller
          name="companyName"
          control={control}
          render={({ field }) => (
            <TextField
              value={field.value}
              onChange={field.onChange}
              className="space-y-1"
            >
              <Label className="text-sm text-[var(--color-text-muted)]">
                {t('settings.profile.companyName')}
              </Label>
              <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
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
              className="space-y-1"
            >
              <Label className="text-sm text-[var(--color-text-muted)]">
                {t('settings.profile.contactName')}
              </Label>
              <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
            </TextField>
          )}
        />

        {/* Phone (read-only) */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">
            {t('settings.profile.phone')}
          </label>
          <div className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <span className="font-mono text-sm text-[var(--color-text)]">
              {profile.phone}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
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
              className="space-y-1"
            >
              <Label className="text-sm text-[var(--color-text-muted)]">
                {t('settings.profile.email')}
              </Label>
              <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
            </TextField>
          )}
        />

        {/* Save button - only shown when changes detected */}
        {hasChanges && (
          <Button
            type="submit"
            isDisabled={updateMutation.isPending}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {updateMutation.isPending
              ? t('settings.saving')
              : t('settings.saveChanges')}
          </Button>
        )}
      </form>

      {/* Trade License Upload */}
      <div className="space-y-2 pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.profile.tradeLicense')}
          </h3>
          <TradeLicenseBadge status={profile.tradeLicenseStatus} />
        </div>

        <FileTrigger
          acceptedFileTypes={['application/pdf', 'image/jpeg']}
          onSelect={handleLicenseSelect}
        >
          <Button className="w-full flex items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors">
            <Upload size={20} />
            <span>{t('settings.profile.uploadLicense')}</span>
          </Button>
        </FileTrigger>
        <p className="text-xs text-[var(--color-text-muted)]">
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

  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-[var(--color-success)]/10 text-[var(--color-success)]">
          <CheckCircle size={12} />
          {t('settings.profile.verified')}
        </span>
      )
    case 'under_review':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
          <Clock size={12} />
          {t('settings.profile.underReview')}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-[var(--color-text-subtle)]/10 text-[var(--color-text-muted)]">
          <AlertCircle size={12} />
          {t('settings.profile.notUploaded')}
        </span>
      )
  }
}
