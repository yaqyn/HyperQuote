import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { z } from 'zod'
import { standardSchemaResolver } from '@hyperquote/forms'
import {
  TextField,
  Input,
  Label,
  FieldError,
  Button,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useLoginModal } from '../../hooks/useLoginModal'
import { createAccount } from '../../lib/auth'

const accountSchema = z.object({
  companyName: z.string().min(1).max(200),
  fullName: z.string().min(1).max(100),
})

type AccountFormData = z.infer<typeof accountSchema>

export function AccountCreation() {
  const { t } = useTranslation('website')
  const { phone, redirectTo, close } = useLoginModal()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: standardSchemaResolver(accountSchema),
    defaultValues: { companyName: '', fullName: '' },
  })

  // Use useWatch (NEVER watch()) per CLAUDE.md
  const companyName = useWatch({ control, name: 'companyName' })
  const fullName = useWatch({ control, name: 'fullName' })

  async function onSubmit(data: AccountFormData) {
    setLoading(true)
    setServerError(null)

    try {
      const result = await createAccount({
        data: {
          phone,
          companyName: data.companyName,
          fullName: data.fullName,
        },
      })

      if (!result.success) {
        setServerError(
          t(
            'login.createFailed',
            'Failed to create account. Please try again.',
          ),
        )
        return
      }

      // Close modal and redirect if needed
      close()
      if (redirectTo) {
        window.location.href = redirectTo
      }
    } catch {
      setServerError(
        t(
          'login.createFailed',
          'Failed to create account. Please try again.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Heading */}
      <h2 className="text-[30px] font-bold leading-[1.2]">
        {t('login.step3.heading')}
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Company Name */}
        <TextField isInvalid={!!errors.companyName}>
          <Label className="mb-1.5 block text-sm text-[var(--color-text-muted)]">
            {t('login.companyName')}
          </Label>
          <Input
            {...register('companyName')}
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {errors.companyName && (
            <FieldError className="mt-1 text-sm text-[var(--color-error)]">
              {errors.companyName.message}
            </FieldError>
          )}
        </TextField>

        {/* Full Name */}
        <TextField isInvalid={!!errors.fullName}>
          <Label className="mb-1.5 block text-sm text-[var(--color-text-muted)]">
            {t('login.fullName')}
          </Label>
          <Input
            {...register('fullName')}
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {errors.fullName && (
            <FieldError className="mt-1 text-sm text-[var(--color-error)]">
              {errors.fullName.message}
            </FieldError>
          )}
        </TextField>

        {/* Server error */}
        {serverError && (
          <p className="text-sm text-[var(--color-error)]">{serverError}</p>
        )}

        {/* Create Account button */}
        <Button
          type="submit"
          isDisabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] font-semibold text-white transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            t('login.createButton')
          )}
        </Button>

        {/* Legal agreement */}
        <p className="text-center text-xs text-[var(--color-text-subtle)]">
          {t('login.legalPrefix', 'By creating an account, you agree to our')}{' '}
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            {t('login.termsLink', 'Terms of Use')}
          </a>{' '}
          {t('login.and', 'and')}{' '}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            {t('login.privacyLink', 'Privacy Policy')}
          </a>
          .
        </p>
      </form>
    </div>
  )
}
