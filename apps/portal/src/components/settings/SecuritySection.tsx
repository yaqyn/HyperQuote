/**
 * Security settings section.
 * Active sessions list: device, last active (Geist Mono), location, Sign Out.
 * Current session highlighted, no sign-out button.
 * MFA heading + placeholder toggle for TOTP.
 */
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Monitor, Smartphone, Shield, LogOut } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOutSession } from '../../lib/server/settings'
import type { ActiveSession } from '../../types/settings'

interface SecuritySectionProps {
  sessions: ActiveSession[]
}

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

  function getDeviceIcon(device: string) {
    if (
      device.toLowerCase().includes('iphone') ||
      device.toLowerCase().includes('android') ||
      device.toLowerCase().includes('mobile')
    ) {
      return Smartphone
    }
    return Monitor
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {t('settings.security.activeSessions')}
        </h2>

        <div className="space-y-3">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.device)
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-xl border bg-[var(--color-base)] ${
                  session.isCurrent
                    ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DeviceIcon
                    size={18}
                    className="text-[var(--color-text-muted)]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {session.device}
                      </span>
                      {session.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded-sm text-xs bg-[var(--color-success)]/10 text-[var(--color-success)]">
                          {t('settings.security.currentSession')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {session.location}
                      </span>
                      <span className="text-xs text-[var(--color-text-subtle)]">
                        &middot;
                      </span>
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">
                        {new Date(session.lastActive).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sign out button - hidden for current session */}
                {!session.isCurrent && (
                  <Button
                    onPress={() => signOutMutation.mutate(session.id)}
                    isDisabled={signOutMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] disabled:opacity-50"
                  >
                    <LogOut size={12} />
                    {t('settings.security.signOut')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[var(--color-text)]" />
          <h3 className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.security.mfaTitle')}
          </h3>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('settings.security.mfaDescription')}
        </p>
        <Button className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
          {t('settings.security.enableMfa')}
        </Button>
      </div>
    </div>
  )
}
