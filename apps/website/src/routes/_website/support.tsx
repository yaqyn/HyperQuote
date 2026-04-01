import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ContactCards } from '../../components/support/ContactCards'
import { ContactForm } from '../../components/support/ContactForm'
import { FAQAccordion } from '../../components/support/FAQAccordion'
import { FAQSearch } from '../../components/support/FAQSearch'

export const Route = createFileRoute('/_website/support')({
  head: () => ({
    meta: [
      { title: 'Support \u2014 HyperQuote' },
      {
        name: 'description',
        content:
          'Get help with HyperQuote. Contact us via WhatsApp, email, or phone. Browse frequently asked questions.',
      },
      { property: 'og:title', content: 'Support \u2014 HyperQuote' },
      {
        property: 'og:description',
        content:
          'Get help with HyperQuote. Contact us via WhatsApp, email, or phone.',
      },
    ],
  }),
  component: SupportPage,
})

function SupportPage() {
  const { t } = useTranslation('website')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12 lg:px-12 lg:py-12">
      {/* Heading */}
      <h1 className="mb-8 text-center text-[30px] font-bold leading-[1.2]">
        {t('support.heading')}
      </h1>

      {/* FAQ Search */}
      <div className="mb-10">
        <FAQSearch onSearchChange={setSearchQuery} />
      </div>

      {/* Contact Cards */}
      <div className="mb-12">
        <ContactCards />
      </div>

      {/* 2-column layout: Form + FAQ */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <ContactForm />
        </div>
        <div>
          <FAQAccordion searchQuery={searchQuery} />
        </div>
      </div>
    </section>
  )
}
