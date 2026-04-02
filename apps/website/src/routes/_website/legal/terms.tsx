import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

export const Route = createFileRoute('/_website/legal/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — HyperQuote' },
      {
        name: 'description',
        content:
          'HyperQuote terms of service. Read the conditions for using our B2B building materials platform in Egypt.',
      },
    ],
  }),
  component: TermsPage,
})

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const viewportOnce = { once: true, margin: '-60px' as const }

const SECTIONS = [
  {
    number: '01',
    title: 'Acceptance of Terms',
    content: [
      'By accessing or using the HyperQuote platform, you agree to be bound by these Terms of Service and all applicable Egyptian laws and regulations. If you are using the platform on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these terms.',
      'If you do not agree to these terms, you may not access or use the platform. We reserve the right to refuse service to anyone for any reason at any time.',
    ],
  },
  {
    number: '02',
    title: 'The Platform',
    content: [
      'HyperQuote is a B2B digital platform that connects contractors and construction companies with verified building materials suppliers across Egypt. We facilitate the request-for-quote (RFQ) process, supplier coordination, order management, delivery logistics, and payment processing.',
      'HyperQuote acts as an intermediary platform. We are not a supplier, manufacturer, or distributor of building materials. While we verify suppliers on our platform, we do not guarantee the quality, safety, or fitness of any materials. All material warranties and guarantees are the responsibility of the respective suppliers.',
      'We aim to deliver consolidated quotes within 4 hours of a valid RFQ submission during business hours (Sunday through Thursday, 9:00 AM to 5:00 PM Egypt Standard Time). This is a service target, not a guarantee. Complex or non-standard requests may require additional time.',
    ],
  },
  {
    number: '03',
    title: 'Accounts & Registration',
    content: [
      'To use the platform, you must register a business account with valid commercial registration, tax identification number, and authorized representative details. You are responsible for maintaining the accuracy of your account information and the confidentiality of your login credentials.',
      'Each account is tied to a single legal entity. You may not share accounts between companies or create multiple accounts for the same entity without prior written approval. You are responsible for all activity that occurs under your account, including actions taken by employees or agents you authorize.',
      'We reserve the right to suspend or terminate accounts that provide false registration information, engage in fraudulent activity, repeatedly fail to fulfill payment obligations, or violate these terms. Account suspension does not relieve you of outstanding payment obligations.',
    ],
  },
  {
    number: '04',
    title: 'Quote-Based Pricing',
    content: [
      'All pricing on HyperQuote is quote-based. We do not publish fixed prices. Quotes are generated based on current supplier availability, material specifications, quantities, delivery location, and market conditions. Quoted prices include applicable taxes unless explicitly stated otherwise.',
      'Quotes are valid for the period specified in each quote document, typically 48 to 72 hours. Prices may change after the validity period expires due to market fluctuations, supplier availability, or changes in applicable taxes. All prices are quoted in Egyptian Pounds (EGP) and include 14% Value Added Tax (VAT) as required by Egyptian tax law.',
      'Accepting a quote constitutes a binding order. Once a quote is accepted and confirmed, the quoted price is locked for that order regardless of subsequent market changes. Partial acceptance of multi-line quotes is permitted only where explicitly indicated.',
    ],
  },
  {
    number: '05',
    title: 'Orders & Delivery',
    content: [
      'Confirmed orders are processed and scheduled for delivery based on the timeline specified in the accepted quote. Delivery dates are estimates and may be affected by supplier lead times, material availability, weather conditions, and Cairo traffic regulations including the truck ban (6:00 AM to midnight within Cairo city limits).',
      'You must ensure that the delivery site is accessible and that an authorized representative is present to receive and inspect materials upon delivery. Failure to receive a scheduled delivery may result in additional charges for re-delivery, storage, or vehicle waiting time.',
      'Claims for damaged, defective, or incorrect materials must be reported within 24 hours of delivery with photographic evidence. We will coordinate with the supplier to resolve claims, but ultimate liability for material quality rests with the supplying party. Delivery confirmation is recorded digitally with GPS coordinates and timestamp.',
    ],
  },
  {
    number: '06',
    title: 'Payment Terms',
    content: [
      'Payment terms are specified in each accepted quote and may vary by supplier, order value, and account history. Standard payment methods include bank wire transfer, cheque, cash on delivery (for qualifying orders), and letters of credit for large orders. Mobile wallet payments are not accepted.',
      'Payment is due according to the terms specified in the invoice. Late payments are subject to a late payment fee as specified in the order confirmation. Under Egyptian law, issuing a cheque that is subsequently dishonored (bounced) is a criminal offense under Article 534 of the Egyptian Penal Code.',
      'All invoices are issued electronically in compliance with the Egyptian Tax Authority (ETA) e-invoicing system. Invoices include the required tax registration numbers, 14% VAT breakdown, and are submitted in real-time to the ETA in the mandated Arabic format. You are responsible for ensuring your tax registration information is current and accurate.',
    ],
  },
  {
    number: '07',
    title: 'Limitation of Liability',
    content: [
      'To the maximum extent permitted by Egyptian law, HyperQuote shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, project delays, business interruption, or cost of substitute materials, arising from your use of the platform.',
      'Our total liability for any claim arising from or related to these terms or the platform shall not exceed the total fees paid by you to HyperQuote in the twelve months preceding the claim. This limitation applies regardless of the legal theory on which the claim is based.',
      'We are not liable for delays, failures, or damages caused by force majeure events, including but not limited to natural disasters, government actions, civil unrest, pandemics, or disruptions to transportation infrastructure. We will notify affected parties promptly and work to minimize disruption.',
    ],
  },
  {
    number: '08',
    title: 'Egyptian Law & Jurisdiction',
    content: [
      'These terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any dispute arising from or relating to these terms or your use of the platform shall be subject to the exclusive jurisdiction of the Economic Courts in Cairo, Egypt.',
      'Both parties agree to attempt resolution of disputes through good-faith negotiation before initiating legal proceedings. If negotiation fails, either party may refer the dispute to arbitration under the rules of the Cairo Regional Centre for International Commercial Arbitration (CRCICA), or proceed directly to the competent Egyptian courts.',
      'Nothing in these terms shall be construed to limit any rights you may have under mandatory provisions of Egyptian consumer protection or commercial law that cannot be waived by contract.',
    ],
  },
  {
    number: '09',
    title: 'Changes to Terms',
    content: [
      'We may update these terms from time to time to reflect changes in our services, legal requirements, or business practices. We will notify registered users of material changes via email and platform notification at least 30 days before the changes take effect.',
      'Your continued use of the platform after the effective date of updated terms constitutes acceptance of the changes. If you do not agree to the updated terms, you must stop using the platform and may request account closure. Pending orders at the time of term changes will be governed by the terms in effect when the order was placed.',
    ],
  },
  {
    number: '10',
    title: 'Contact Us',
    content: [
      'For questions about these terms, account issues, or legal inquiries, contact us at legal@hyperquote.net or write to our registered office in Cairo, Egypt. Business hours are Sunday through Thursday, 9:00 AM to 5:00 PM Egypt Standard Time.',
      'For urgent order or delivery issues, contact our operations team directly through the platform support channel. We aim to respond to all inquiries within one business day.',
    ],
  },
]

function TermsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 pb-16 pt-24 lg:px-12 lg:pb-24 lg:pt-36"
      >
        <div className="mx-auto max-w-[1200px]">
          <h1
            className="font-bold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
          >
            Terms of Service
          </h1>
          <p className="mt-6 text-[15px] opacity-35 max-w-[480px] leading-[1.7]">
            Last updated April 1, 2026
          </p>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Sections */}
      {SECTIONS.map((section, i) => (
        <div key={section.number}>
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="px-6 py-20 lg:px-12 lg:py-28"
          >
            <div className="mx-auto max-w-[1200px]">
              <div className="mb-12 flex items-baseline gap-4">
                <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-primary)]">
                  {section.number}
                </span>
                <h2
                  className="font-bold tracking-[-0.02em]"
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
                >
                  {section.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24">
                {section.content.map((paragraph, j) => (
                  <p
                    key={j}
                    className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </motion.section>

          {i < SECTIONS.length - 1 && (
            <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
              <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
