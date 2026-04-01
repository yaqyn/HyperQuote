/**
 * TicketList: Displays support tickets in a React Aria ListBox.
 * Each ticket shows subject, category badge, status badge, and date.
 */
import { useTranslation } from 'react-i18next'
import { ListBox, ListBoxItem } from 'react-aria-components'
import type { Ticket, TicketStatus, TicketCategory } from '../../types/support'

interface TicketListProps {
  tickets: Ticket[]
  onSelect: (ticketId: string) => void
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
  pending: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  in_progress: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  resolved: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  closed: 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]',
}

export function TicketList({ tickets, onSelect }: TicketListProps) {
  const { t, i18n } = useTranslation('portal')
  const isArabic = i18n.language === 'ar'
  const dateFormatter = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  function getCategoryLabel(category: TicketCategory): string {
    return t(`support.category.${category}`)
  }

  function getStatusLabel(status: TicketStatus): string {
    return t(`support.status.${status}`)
  }

  return (
    <ListBox
      aria-label={t('support.ticketListLabel')}
      selectionMode="single"
      onSelectionChange={(keys) => {
        const selected = [...keys][0]
        if (selected) onSelect(String(selected))
      }}
      className="flex flex-col gap-2"
    >
      {tickets.map((ticket) => (
        <ListBoxItem
          key={ticket.id}
          id={ticket.id}
          textValue={ticket.subject}
          className="rounded-xl border border-[var(--color-border)] p-4 cursor-pointer outline-none hover:border-[var(--color-primary)]/30 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">
                {ticket.subject}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-block rounded-sm px-1.5 py-0.5 text-xs bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                  {getCategoryLabel(ticket.category)}
                </span>
                <span
                  className={`inline-block rounded-sm px-1.5 py-0.5 text-xs ${STATUS_STYLES[ticket.status]}`}
                >
                  {getStatusLabel(ticket.status)}
                </span>
                {ticket.relatedOrderRef && (
                  <span className="font-mono text-xs text-[var(--color-primary)]">
                    {ticket.relatedOrderRef}
                  </span>
                )}
              </div>
            </div>
            <span className="font-mono text-xs text-[var(--color-text-muted)] whitespace-nowrap">
              {dateFormatter.format(new Date(ticket.updatedAt))}
            </span>
          </div>
        </ListBoxItem>
      ))}
    </ListBox>
  )
}
