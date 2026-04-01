import { MessageCircle, Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const PHONE_NUMBER = '+201234567890'
const WHATSAPP_URL = `https://wa.me/${PHONE_NUMBER.replace('+', '')}`
const EMAIL = 'support@hyperquote.net'

export function ContactCards() {
  const { t } = useTranslation('website')

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* WhatsApp Card */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition-shadow hover:shadow-md"
      >
        <MessageCircle size={32} color="#25D366" />
        <span className="text-[16px] font-bold">{t('support.whatsappLabel')}</span>
        <span className="inline-flex h-10 items-center rounded-lg bg-[#25D366] px-6 text-[14px] font-bold text-white">
          {t('support.whatsappLabel')}
        </span>
      </a>

      {/* Email Card */}
      <a
        href={`mailto:${EMAIL}`}
        className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition-shadow hover:shadow-md"
      >
        <Mail size={32} color="#2563EB" />
        <span className="text-[16px] font-bold">{t('support.emailLabel')}</span>
        <span className="text-[14px] text-[var(--color-text-muted)]">{EMAIL}</span>
      </a>

      {/* Phone Card */}
      <a
        href={`tel:${PHONE_NUMBER}`}
        className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition-shadow hover:shadow-md"
      >
        <Phone size={32} color="#2563EB" />
        <span className="text-[16px] font-bold">{t('support.phoneLabel')}</span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[14px] text-[var(--color-text-muted)]">
          {PHONE_NUMBER}
        </span>
      </a>
    </div>
  )
}
