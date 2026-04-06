import { useState } from 'react'
import { NumberField, Input, Label, Switch } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { MINIMUM_WITHDRAWAL, useExternalDriverStore } from '@/stores/external-driver'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'

interface WithdrawalFormProps {
  availableBalance: number
  onSuccess: () => void
}

export function WithdrawalForm({ availableBalance, onSuccess }: WithdrawalFormProps) {
  const { t } = useTranslation('driver')
  const requestWithdrawal = useExternalDriverStore((s) => s.requestWithdrawal)

  const [amount, setAmount] = useState<number>(500)
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false)
  const [autoPayoutThreshold, setAutoPayoutThreshold] = useState<number>(2000)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const amountTooLow = amount < MINIMUM_WITHDRAWAL
  const amountTooHigh = amount > availableBalance
  const hasError = amountTooLow || amountTooHigh

  const handleSubmit = async () => {
    if (hasError) return

    setIsSubmitting(true)
    setError(null)
    try {
      // Using placeholder bank account ID until bank accounts are wired
      await requestWithdrawal(amount, 'default')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'An error occurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="text-2xl text-[var(--color-success)]" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
            <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm-4 30l-10-10 2.83-2.83L20 28.34l15.17-15.17L38 16 20 34z" />
          </svg>
        </span>
        <p className="font-medium">{t('earnings.withdrawalSuccess', 'Withdrawal requested!')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Amount input */}
      <NumberField
        value={amount}
        onChange={(val) => setAmount(val)}
        minValue={0}
        step={100}
        isInvalid={hasError}
      >
        <Label className="text-sm font-medium text-[var(--text-secondary)]">
          {t('earnings.withdrawalAmount', 'Withdrawal amount (EGP)')}
        </Label>
        <Input
          className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 font-[var(--font-mono)] text-2xl outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
        />
      </NumberField>

      {amountTooLow && (
        <p className="text-sm text-[var(--color-danger)]">
          {t('earnings.minWithdrawal', 'Minimum withdrawal: EGP {{amount}}', { amount: 500 })}
        </p>
      )}
      {amountTooHigh && (
        <p className="text-sm text-[var(--color-danger)]">
          {t('earnings.insufficientBalance', 'Insufficient available balance.')}
        </p>
      )}

      {/* Bank account placeholder */}
      <DriverCard>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('earnings.bankAccount', 'Bank Account')}</span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {t('earnings.addBankAccount', 'Bank account linking coming soon')}
          </span>
        </div>
      </DriverCard>

      {/* Payout methods */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {t('earnings.payoutMethods', 'Payout Methods')}
        </span>
        <DriverCard>
          <span className="text-sm">{t('earnings.bankTransfer', 'Bank transfer (1-2 business days)')}</span>
        </DriverCard>
        <DriverCard>
          <span className="text-sm">{t('earnings.cashOffice', 'Cash at HyperQuote office')}</span>
        </DriverCard>
        <DriverCard>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{t('earnings.autoPayout', 'Auto-payout')}</span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {t('earnings.autoPayoutDesc', 'Auto-withdraw when balance exceeds threshold')}
              </span>
            </div>
            <Switch
              isSelected={autoPayoutEnabled}
              onChange={setAutoPayoutEnabled}
              className="group flex items-center"
            >
              <div className="flex h-6 w-11 items-center rounded-full bg-[var(--border-color)] px-0.5 transition-colors group-data-[selected]:bg-[var(--color-blue)]">
                <span className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform group-data-[selected]:translate-x-5" />
              </div>
            </Switch>
          </div>
          {autoPayoutEnabled && (
            <div className="mt-3">
              <NumberField
                value={autoPayoutThreshold}
                onChange={(val) => setAutoPayoutThreshold(val)}
                minValue={500}
                step={100}
              >
                <Label className="text-xs text-[var(--text-secondary)]">
                  {t('earnings.autoThreshold', 'Threshold (EGP)')}
                </Label>
                <Input
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 font-[var(--font-mono)] text-base outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
                />
              </NumberField>
            </div>
          )}
        </DriverCard>
      </div>

      {/* Processing time info */}
      <p className="text-xs text-[var(--text-tertiary)]">
        {t('earnings.processingTime', '1-3 Egyptian business days (Sunday-Thursday)')}
      </p>

      {error && (
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      )}

      {/* Submit */}
      <DriverButton
        className="min-h-[56px]"
        isDisabled={hasError}
        isLoading={isSubmitting}
        onPress={handleSubmit}
      >
        {t('earnings.requestWithdrawal', 'Request Withdrawal')}
      </DriverButton>
    </div>
  )
}
