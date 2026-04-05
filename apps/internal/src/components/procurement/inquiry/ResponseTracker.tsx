import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trackInquiryResponses, remindSuppliers } from '../../../lib/server/procurement-inquiries'
import { useProcurementStore } from '../../../stores/procurement'
import { ResponseStatusBadge } from './ResponseStatusBadge'
import { DeadlineCountdown } from '../shared/DeadlineCountdown'
import type { ResponseTrackingRow } from '../../../types/procurement'

interface ResponseTrackerProps {
  inquiryId: string
}

export function ResponseTracker({ inquiryId }: ResponseTrackerProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const setSelectedInquiryId = useProcurementStore((s) => s.setSelectedInquiryId)

  const { data, isLoading } = useQuery({
    queryKey: ['procurement', 'responses', inquiryId],
    queryFn: () => trackInquiryResponses({ data: { inquiryId } }),
    staleTime: 15_000,
  })

  const responses: ResponseTrackingRow[] = data?.responses ?? []

  const nonResponders = responses.filter(
    (r) => r.status === 'sent' || r.status === 'opened',
  )

  const remindMutation = useMutation({
    mutationFn: (ids: string[]) => remindSuppliers({ data: { inquiryIds: ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'responses'] })
    },
  })

  const remindSingle = (row: ResponseTrackingRow) => {
    remindMutation.mutate([row.inquiryId])
  }

  const remindAll = () => {
    const ids = nonResponders.map((r) => r.inquiryId)
    if (ids.length > 0) remindMutation.mutate(ids)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onPress={() => setSelectedInquiryId(null)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            {t('procurement.response.back')}
          </Button>
          <h2 className="text-lg font-semibold">{t('procurement.response.title')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onPress={remindAll}
            isDisabled={nonResponders.length === 0 || remindMutation.isPending}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
          >
            {t('procurement.response.remindAll')} ({nonResponders.length})
          </Button>
          <Button
            onPress={() => {
              // Close inquiry and proceed with available responses
              setSelectedInquiryId(null)
            }}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]/90"
          >
            {t('procurement.response.closeAndProceed')}
          </Button>
        </div>
      </div>

      {/* Auto-reminder note */}
      <div className="flex items-center gap-2 rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2563EB]"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        <span className="text-sm text-[#2563EB]">{t('procurement.response.autoReminderNote')}</span>
      </div>

      {/* Response Table */}
      <div className="rounded-2xl border border-black/10 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.response.supplierName')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.response.sentDate')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.response.status')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.response.responseDate')}
                  </th>
                  <th className="px-5 py-3 text-start font-medium text-black/60 dark:text-white/60">
                    {t('procurement.response.action')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {responses.map((row) => (
                  <tr key={row.supplierId} className="border-b border-black/5 dark:border-white/5">
                    <td className="px-5 py-3 font-medium">{row.supplierName}</td>
                    <td className="px-5 py-3">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                        {new Date(row.sentDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <ResponseStatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3">
                      {row.responseDate ? (
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                          {new Date(row.responseDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {(row.status === 'sent' || row.status === 'opened') && (
                        <Button
                          onPress={() => remindSingle(row)}
                          isDisabled={remindMutation.isPending}
                          className="rounded-lg border border-black/10 px-3 py-1 text-xs transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          {t('procurement.response.remind')}
                        </Button>
                      )}
                      {row.status === 'responded' && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {t('procurement.response.reviewReady')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
