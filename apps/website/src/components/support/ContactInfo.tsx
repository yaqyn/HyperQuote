import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const PHONE_NUMBER = '+20 123 456 7890'
const PHONE_RAW = '+201234567890'
const WHATSAPP_URL = `https://wa.me/${PHONE_RAW.replace('+', '')}`
const EMAIL = 'support@hyperquote.net'

export function ContactInfo() {
  const { t } = useTranslation('website')

  return (
    <div className="lg:pt-2">
      {/* ── Channels: data-first, no icons ── */}
      <div className="flex flex-col">
        {/* WhatsApp */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between border-b border-[var(--color-text)]/[0.06] py-6"
        >
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.02em]">
              {t('support.whatsappLabel')}
            </div>
            <div className="mt-1 text-[13px] opacity-40">
              {t('support.whatsappDetail')}
            </div>
          </div>
          <ArrowUpRight
            size={18}
            className="shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-40 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>

        {/* Email */}
        <a
          href={`mailto:${EMAIL}`}
          className="group flex items-center justify-between border-b border-[var(--color-text)]/[0.06] py-6"
        >
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.02em]">
              {EMAIL}
            </div>
            <div className="mt-1 text-[13px] opacity-40">
              {t('support.emailLabel')}
            </div>
          </div>
          <ArrowUpRight
            size={18}
            className="shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-40 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>

        {/* Phone */}
        <a
          href={`tel:${PHONE_RAW}`}
          className="group flex items-center justify-between border-b border-[var(--color-text)]/[0.06] py-6"
        >
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[18px] font-semibold tracking-[-0.01em]">
              {PHONE_NUMBER}
            </div>
            <div className="mt-1 font-[family-name:var(--font-sans)] text-[13px] opacity-40">
              {t('support.phoneLabel')}
            </div>
          </div>
          <ArrowUpRight
            size={18}
            className="shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-40 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </div>

      {/* ── Address + Hours: inline footer ── */}
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
            {t('support.info.office')}
          </div>
          <a
            href="https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-pre-line text-[14px] leading-[1.7] opacity-60 transition-opacity hover:opacity-85"
          >
            {t('support.info.address')}
          </a>
        </div>
        <div>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
            {t('support.info.hours')}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] opacity-60">{t('support.info.weekdays')}</span>
              <span className="font-[family-name:var(--font-mono)] text-[13px] opacity-45">
                8:00 – 18:00
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] opacity-60">{t('support.info.weekends')}</span>
              <span className="text-[13px] opacity-30">
                {t('support.info.closed')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
