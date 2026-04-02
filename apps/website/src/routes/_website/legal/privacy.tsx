import { createFileRoute } from '@tanstack/react-router'

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
      {/* Hero — understated, bureaucratic */}
      <header className="px-6 pb-10 pt-24 lg:px-12 lg:pb-14 lg:pt-32">
        <div className="mx-auto max-w-[800px]">
          <h1 className="text-[28px] font-normal tracking-[-0.02em] lg:text-[32px]">
            Privacy Policy
          </h1>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text)] opacity-25 tracking-wide">
            Effective: January 2026
          </p>
          <p className="mt-4 text-[14px] text-[var(--color-text-muted)] max-w-[480px] leading-relaxed">
            How we collect, store, and protect your data. Your privacy is not a feature — it is a commitment.
          </p>
        </div>
      </header>

      {/* Table of Contents — horizontal section numbers */}
      <nav className="px-6 pb-10 lg:px-12">
        <div className="mx-auto max-w-[800px]">
          <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
          <div className="flex flex-wrap gap-1 pt-5">
            {SECTIONS.map((section) => (
              <a
                key={section.number}
                href={`#privacy-${section.number}`}
                className="inline-block px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text)] opacity-30 transition-opacity hover:opacity-70"
              >
                {section.number}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Sections — document-style layout */}
      <div className="px-6 pb-24 lg:px-12">
        <div className="mx-auto max-w-[800px]">
          {SECTIONS.map((section, i) => (
            <section
              key={section.number}
              id={`privacy-${section.number}`}
              className={i > 0 ? 'mt-14' : ''}
            >
              <div className="mb-5 flex items-baseline gap-3">
                <sup className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-primary)] opacity-50 -top-1 relative">
                  {section.number}
                </sup>
                <h2 className="text-[16px] font-normal tracking-[-0.01em] text-[var(--color-text)]">
                  {section.title}
                </h2>
              </div>

              <div className="ps-7 space-y-4">
                {section.content.map((paragraph, j) => (
                  <p
                    key={j}
                    className="text-[14px] leading-[1.7] text-[var(--color-text-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {i < SECTIONS.length - 1 && (
                <div className="mt-14 h-px bg-[var(--color-text)] opacity-[0.05]" />
              )}
            </section>
          ))}
        </div>
      </div>

      {/* Footer — back to top + company info */}
      <footer className="px-6 pb-16 lg:px-12">
        <div className="mx-auto max-w-[800px]">
          <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
          <div className="flex items-start justify-between pt-8">
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text)] opacity-25 leading-[1.8]">
              <div>HyperQuote Technologies Ltd.</div>
              <div>Cairo, Egypt</div>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text)] opacity-30 transition-opacity hover:opacity-60"
            >
              Back to top
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
