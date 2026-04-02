import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

export const Route = createFileRoute('/_website/legal/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — HyperQuote' },
      {
        name: 'description',
        content:
          'HyperQuote privacy policy. Learn how we collect, use, and protect your data in compliance with Egyptian data protection law.',
      },
    ],
  }),
  component: PrivacyPage,
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
    title: 'Information We Collect',
    content: [
      'We collect information you provide directly when registering for an account, submitting quote requests, or communicating with our team. This includes your company name, commercial registration number, tax identification number, contact details (name, email, phone number), delivery addresses, and project specifications.',
      'When you use the platform, we automatically collect technical data including IP address, browser type, device information, pages visited, and interaction patterns. For delivery tracking, we collect GPS location data from driver devices with their explicit consent.',
      'For payment processing and ETA e-invoicing compliance, we collect banking details, tax registration information, and transaction records as required by Egyptian Tax Authority regulations.',
    ],
  },
  {
    number: '02',
    title: 'How We Use Your Information',
    content: [
      'We use your information to operate the HyperQuote platform: processing quote requests, coordinating with suppliers, arranging deliveries, generating invoices, and facilitating payments. Your material specifications and pricing data are used to improve our AI-powered quote matching system.',
      'We use contact information to send order updates, delivery notifications, payment confirmations, and platform announcements. Technical data helps us maintain platform security, diagnose issues, and improve performance.',
      'Transaction data is retained and reported as required by Egyptian tax law, including real-time submission to the Egyptian Tax Authority (ETA) electronic invoicing system. We use aggregated, anonymized data for market analysis and platform improvement.',
    ],
  },
  {
    number: '03',
    title: 'Data Sharing',
    content: [
      'We share relevant order details with suppliers who bid on your quote requests, including material specifications, quantities, and delivery locations. Supplier identity and pricing are shared with you as part of the quote process. We do not sell your personal data to third parties.',
      'We share data with delivery partners to fulfill orders, payment processors to handle transactions, and cloud infrastructure providers who host our platform. All service providers are contractually bound to protect your data and use it only for the services they provide to us.',
      'We disclose information when required by Egyptian law, including tax records to the Egyptian Tax Authority, and when necessary to comply with legal processes, enforce our terms, or protect the rights and safety of HyperQuote, our users, or the public.',
    ],
  },
  {
    number: '04',
    title: 'Data Storage & Security',
    content: [
      'Your data is stored on secure cloud infrastructure with encryption at rest and in transit. We use Cloudflare Workers and Supabase with data residency considerations appropriate for our operations. Database backups are encrypted and stored in geographically distributed locations.',
      'We implement industry-standard security measures including role-based access control, audit logging, two-factor authentication for administrative access, and regular security assessments. Payment information is handled in compliance with PCI DSS standards.',
      'We retain your account data for the duration of your account plus seven years as required by Egyptian commercial and tax law. Transaction records and tax invoices are retained for the statutory period mandated by the Egyptian Tax Authority. You may request deletion of non-legally-required data at any time.',
    ],
  },
  {
    number: '05',
    title: 'Your Rights',
    content: [
      'You have the right to access, correct, and update your personal information at any time through your account settings or by contacting our support team. You may request a copy of all personal data we hold about you in a machine-readable format.',
      'You may request deletion of your account and associated personal data, subject to our legal obligations to retain certain records under Egyptian commercial and tax law. We will process deletion requests within 30 days and notify you of any data we are legally required to retain.',
      'You may opt out of non-essential communications at any time. You may withdraw consent for optional data processing. These choices will not affect your ability to use core platform features or the processing of your existing orders.',
    ],
  },
  {
    number: '06',
    title: 'Egyptian Data Protection',
    content: [
      'HyperQuote operates in compliance with Egyptian data protection regulations, including Law No. 151 of 2020 on the Protection of Personal Data and its executive regulations. We process personal data on the legal basis of contractual necessity, legitimate business interest, and regulatory compliance.',
      'As a B2B platform handling commercial transactions, we comply with the Egyptian Commercial Code, the Egyptian Tax Procedures Law, and ETA e-invoicing requirements. All tax invoices are submitted in real-time to the Egyptian Tax Authority in the required Arabic format with 14% VAT applied where applicable.',
      'For cross-border data transfers, we ensure appropriate safeguards are in place as required by Egyptian law. Our data processing practices are subject to oversight by the Egyptian Data Protection Center established under Law No. 151 of 2020.',
    ],
  },
  {
    number: '07',
    title: 'Contact Us',
    content: [
      'For privacy-related inquiries, data access requests, or to exercise any of your rights under this policy, contact our Data Protection Officer at privacy@hyperquote.net or write to us at our registered office in Cairo, Egypt.',
      'We aim to respond to all privacy requests within 15 business days (Sunday through Thursday). If you are unsatisfied with our response, you have the right to lodge a complaint with the Egyptian Data Protection Center.',
    ],
  },
]

function PrivacyPage() {
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
            Privacy Policy
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
