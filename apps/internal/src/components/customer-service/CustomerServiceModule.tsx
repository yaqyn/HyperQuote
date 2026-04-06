import { useCustomerServiceStore } from '../../stores/customer-service'
import { CustomerServiceTabStrip } from './CustomerServiceTabStrip'
import { CustomerServiceShortcuts } from './CustomerServiceShortcuts'
import { CSHome } from './home/CSHome'
import { WhatsAppInbox } from './whatsapp/WhatsAppInbox'
import { TicketList } from './tickets/TicketList'
import { TicketDetail } from './tickets/TicketDetail'
import { ReturnsClaims } from './returns/ReturnsClaims'
import { KnowledgeBase } from './knowledge-base/KnowledgeBase'

/**
 * Root customer service module component.
 * Switches between 5 tabs + ticket detail drill-down.
 */
export function CustomerServiceModule() {
  const activeTab = useCustomerServiceStore((s) => s.activeTab)
  const selectedTicketId = useCustomerServiceStore((s) => s.selectedTicketId)

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <CSHome />
      case 'whatsapp':
        return <WhatsAppInbox />
      case 'tickets':
        return selectedTicketId ? <TicketDetail /> : <TicketList />
      case 'returns':
        return <ReturnsClaims />
      case 'knowledge-base':
        return <KnowledgeBase />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <CustomerServiceShortcuts />
      <CustomerServiceTabStrip />
      <div className="flex-1 overflow-auto">
        {renderTab()}
      </div>
    </div>
  )
}
