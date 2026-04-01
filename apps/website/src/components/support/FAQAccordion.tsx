import { useMemo } from 'react'
import Fuse from 'fuse.js'
import {
  DisclosureGroup,
  Disclosure,
  DisclosurePanel,
  Button,
  Heading,
} from 'react-aria-components'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FAQItem {
  id: string
  question: string
  question_ar: string
  answer: string
  answer_ar: string
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do quotes work on HyperQuote?',
    question_ar: 'كيف تعمل عروض الاسعار على هايبركوت؟',
    answer: 'Submit your material list through our platform. We source competitive prices from verified suppliers and deliver a quote within 4 hours. You can accept, negotiate, or request changes.',
    answer_ar: 'ارسل قائمة المواد عبر منصتنا. نوفر اسعار تنافسية من موردين معتمدين ونرسل لك عرض سعر خلال ٤ ساعات. يمكنك القبول او التفاوض او طلب تعديلات.',
  },
  {
    id: 'faq-2',
    question: 'What are the delivery times?',
    question_ar: 'ما هي مواعيد التوصيل؟',
    answer: 'Delivery times depend on material availability and your location. Most orders within Cairo are delivered within 24-48 hours. We provide real-time tracking for all deliveries.',
    answer_ar: 'تعتمد مواعيد التوصيل على توفر المواد وموقعك. معظم الطلبات داخل القاهرة تصل خلال ٢٤-٤٨ ساعة. نوفر تتبع فوري لجميع التوصيلات.',
  },
  {
    id: 'faq-3',
    question: 'What payment methods do you accept?',
    question_ar: 'ما هي طرق الدفع المقبولة؟',
    answer: 'We accept wire transfers, post-dated cheques, cash on delivery, and letters of credit. All payments are offline as per Egyptian B2B standards.',
    answer_ar: 'نقبل التحويل البنكي والشيكات المؤجلة والدفع عند الاستلام وخطابات الاعتماد. جميع المدفوعات تتم بشكل غير الكتروني وفق معايير التجارة بين الشركات في مصر.',
  },
  {
    id: 'faq-4',
    question: 'How do I create an account?',
    question_ar: 'كيف انشئ حسابا؟',
    answer: 'Click "Get a Quote" or sign in with your Egyptian phone number via WhatsApp OTP. You only need your company name and full name to get started.',
    answer_ar: 'اضغط "احصل على عرض سعر" او سجل دخولك برقم هاتفك المصري عبر واتساب. تحتاج فقط اسم شركتك واسمك الكامل للبدء.',
  },
  {
    id: 'faq-5',
    question: 'Can I see prices before creating an account?',
    question_ar: 'هل يمكنني رؤية الاسعار بدون حساب؟',
    answer: 'Yes, our product catalog shows price ranges for all materials. Exact pricing is provided in your personalized quote based on quantity, delivery location, and payment terms.',
    answer_ar: 'نعم، يعرض كتالوج المنتجات نطاقات الاسعار لجميع المواد. الاسعار الدقيقة تظهر في عرض السعر المخصص حسب الكمية وموقع التوصيل وشروط الدفع.',
  },
  {
    id: 'faq-6',
    question: 'Does the platform support Arabic?',
    question_ar: 'هل المنصة تدعم العربية؟',
    answer: 'Yes, HyperQuote is fully bilingual with Arabic as the primary language. All interfaces, documents, and invoices are available in Arabic with right-to-left layout.',
    answer_ar: 'نعم، هايبركوت ثنائية اللغة بالكامل والعربية هي اللغة الاساسية. جميع الواجهات والمستندات والفواتير متاحة بالعربية مع تنسيق من اليمين لليسار.',
  },
  {
    id: 'faq-7',
    question: 'What building materials are available?',
    question_ar: 'ما هي مواد البناء المتاحة؟',
    answer: 'We offer a wide range including cement, steel, aggregates, bricks, tiles, timber, insulation, pipes, electrical materials, paint, and more. Browse our catalog for the full list.',
    answer_ar: 'نوفر مجموعة واسعة تشمل الاسمنت والحديد والركام والطوب والبلاط والاخشاب والعزل والمواسير والمواد الكهربائية والدهانات والمزيد. تصفح الكتالوج للقائمة الكاملة.',
  },
  {
    id: 'faq-8',
    question: 'What is your returns policy?',
    question_ar: 'ما هي سياسة الارجاع؟',
    answer: 'Returns are accepted within 7 days for defective or incorrect materials. Custom-cut or special-order items may not be eligible. Contact support to initiate a return.',
    answer_ar: 'نقبل الارجاع خلال ٧ ايام للمواد المعيبة او الخاطئة. المواد المقطعة حسب الطلب او الطلبات الخاصة قد لا تكون مؤهلة. تواصل مع الدعم لبدء عملية ارجاع.',
  },
  {
    id: 'faq-9',
    question: 'How fast do you respond to support requests?',
    question_ar: 'ما سرعة الرد على طلبات الدعم؟',
    answer: 'We aim to respond to all support requests within 2 hours during business hours (Sun-Thu, 8AM-6PM). WhatsApp messages typically get faster responses.',
    answer_ar: 'نهدف للرد على جميع طلبات الدعم خلال ساعتين في اوقات العمل (الاحد-الخميس، ٨ صباحا - ٦ مساء). رسائل واتساب عادة تحصل على رد اسرع.',
  },
  {
    id: 'faq-10',
    question: 'Can I order in bulk?',
    question_ar: 'هل يمكنني الطلب بالجملة؟',
    answer: 'Absolutely. Bulk orders often qualify for better pricing. Submit your material list with quantities and we will provide volume-based pricing in your quote.',
    answer_ar: 'بالتاكيد. الطلبات بالجملة غالبا تحصل على اسعار افضل. ارسل قائمة المواد بالكميات وسنوفر اسعار بناء على الحجم في عرض السعر.',
  },
]

interface FAQAccordionProps {
  searchQuery: string
}

export function FAQAccordion({ searchQuery }: FAQAccordionProps) {
  const { t, i18n } = useTranslation('website')
  const isArabic = i18n.language === 'ar'

  const fuse = useMemo(
    () =>
      new Fuse(FAQ_DATA, {
        threshold: 0.4,
        keys: ['question', 'question_ar'],
      }),
    [],
  )

  const matchingIds = useMemo(() => {
    if (!searchQuery.trim()) return null // null = show all
    const results = fuse.search(searchQuery)
    return new Set(results.map((r) => r.item.id))
  }, [searchQuery, fuse])

  const hasResults = matchingIds === null || matchingIds.size > 0

  return (
    <div>
      <h2 className="mb-6 text-[16px] font-bold">
        {t('support.faq.heading')}
      </h2>

      {!hasResults && (
        <p className="text-center text-[14px] text-[var(--color-text-muted)]">
          {t('support.faq.noResults')}
        </p>
      )}

      <DisclosureGroup allowsMultipleExpanded>
        {FAQ_DATA.map((item) => {
          const isMatch = matchingIds === null || matchingIds.has(item.id)

          return (
            <Disclosure
              key={item.id}
              id={item.id}
              className={`mb-2 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] transition-opacity ${
                isMatch ? 'opacity-100' : 'opacity-30'
              }`}
              aria-hidden={!isMatch}
            >
              <Heading level={3}>
                <Button className="flex w-full items-center justify-between px-4 py-3 text-start text-[14px] font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-[#2563EB]">
                  <span>{isArabic ? item.question_ar : item.question}</span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 transition-transform duration-200 data-[expanded]:rotate-180"
                  />
                </Button>
              </Heading>
              <DisclosurePanel className="px-4 pb-4 text-[14px] text-[var(--color-text-muted)]">
                {isArabic ? item.answer_ar : item.answer}
              </DisclosurePanel>
            </Disclosure>
          )
        })}
      </DisclosureGroup>
    </div>
  )
}
