/**
 * TicketList — rows with bottom borders. No cards.
 * Status as tiny uppercase. Date in monospace. Accessible via ListBox.
 */
import { useTranslation } from 'react-i18next'
import { ListBox, ListBoxItem } from 'react-aria-components'
import type { Ticket, TicketStatus } from '../../types/support'

function statusLabel(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    open: 'OPEN',
    pending: 'PENDING',
    in_progress: 'IN PROGRESS',
    resolved: 'RESOLVED',
    closed: 'CLOSED',
  }
  return map[status] ?? status.toUpperCase()
}

interface TicketListProps {
  tickets: Ticket[]
  onSelect: (ticketId: string) => void
}

export function TicketList({ tickets, onSelect }: TicketListProps) {
  const { t, i18n } = useTranslation('portal')
  const isArabic = i18n.language === 'ar'

  return (
    <ListBox
      aria-label={t('support.ticketListLabel')}
      selectionMode="single"
      onSelectionChange={(keys) => {
        const selected = [...keys][0]
        if (selected) onSelect(String(selected))
      }}
      className="flex flex-col"
    >
      {tickets.map((ticket) => {
        const date = new Date(ticket.updatedAt)
        const formattedDate = date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-GB', {
          month: 'short',
          day: 'numeric',
        })

        return (
          <ListBoxItem
            key={ticket.id}
            id={ticket.id}
            textValue={ticket.subject}
            className="flex items-center justify-between py-4 border-b border-[var(--color-border)] cursor-pointer outline-none transition-colors hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded-sm -mx-2 px-2"
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-sm text-[var(--color-text)] truncate">
                {ticket.subject}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
                  {statusLabel(ticket.status)}
                </span>
                {ticket.relatedOrderRef && (
                  <span className="font-mono text-[13px] text-[var(--color-text-muted)]">
                    {ticket.relatedOrderRef}
                  </span>
                )}
              </div>
            </div>
            <span className="font-mono text-[13px] text-[var(--color-text-subtle)] shrink-0 ms-4">
              {formattedDate}
            </span>
          </ListBoxItem>
        )
      })}
    </ListBox>
  )
}
