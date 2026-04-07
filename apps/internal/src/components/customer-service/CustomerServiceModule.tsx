import { useCustomerServiceStore } from '../../stores/customer-service'
import { CustomerServiceTabStrip } from './CustomerServiceTabStrip'
import { CustomerServiceShortcuts } from './CustomerServiceShortcuts'
import { TicketList } from './tickets/TicketList'
import { TicketDetail } from './tickets/TicketDetail'

/**
 * Customer Service — "The Conversation"
 * iMessage-level chat, thread-first. Support is about conversations, not tickets.
 * WhatsApp merged into Conversations tab with channel filter pills.
 * Knowledge Base is a slide-in panel within TicketDetail (toggled via sidebar button).
 */
export function CustomerServiceModule() {
  const activeTab = useCustomerServiceStore((s) => s.activeTab)
  const selectedTicketId = useCustomerServiceStore((s) => s.selectedTicketId)

  const tabContent: Record<string, React.ReactNode> = {
    conversations: selectedTicketId ? <TicketDetail /> : <TicketList />,
  }

  return (
    <div className="flex flex-col h-full">
      <CustomerServiceShortcuts />

      <div className="shrink-0 pt-1 pb-2">
        <CustomerServiceTabStrip />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}
