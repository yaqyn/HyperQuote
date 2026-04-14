/**
 * Security settings section.
 * "Data is the design" — sessions as rows with bottom borders.
 * Device name, location, time in monospace. Current device badge tiny uppercase.
 * Sign out as text link. MFA section minimal.
 */
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOutSession } from '../../lib/server/settings'
import type { ActiveSession } from '../../types/settings'

interface SecuritySectionProps {
  sessions: ActiveSession[]
}

const labelClass =
  'text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

export function SecuritySection({ sessions }: SecuritySectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()

  const signOutMutation = useMutation({
    mutationFn: (sessionId: string) =>
      signOutSession({ data: { sessionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
    },
  })

  return (
    <div className="space-y-8">
      {/* Active Sessions */}
      <div>
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between py-4 border-b border-[var(--color-border)]"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-[var(--color-text)]">
                  {session.device}
                </span>
                {session.isCurrent && (
                  <span className={labelClass}>
                    {t('settings.security.currentSession')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-mono text-[var(--color-text-subtle)]">
                  {session.location}
                </span>
                <span className="text-[13px] font-mono text-[var(--color-text-subtle)]">
                  {new Date(session.lastActive).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Sign out — text link, hidden for current */}
            {!session.isCurrent && (
              <Button
                onPress={() => signOutMutation.mutate(session.id)}
                isDisabled={signOutMutation.isPending}
                className="text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded disabled:opacity-50"
              >
                {t('settings.security.signOut')}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Two-Factor Authentication */}
      <div className="space-y-3 pt-6 border-t border-[var(--color-border)]">
        <span className={labelClass}>
          {t('settings.security.mfaTitle')}
        </span>
        <p className="text-[13px] text-[var(--color-text-subtle)]">
          {t('settings.security.mfaDescription')}
        </p>
        <Button className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2">
          {t('settings.security.enableMfa')}
        </Button>
      </div>
    </div>
  )
}
