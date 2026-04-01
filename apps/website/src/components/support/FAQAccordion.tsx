import { useState, useEffect, useRef } from 'react'
import {
  Disclosure,
  DisclosurePanel,
  Button,
  Heading,
} from 'react-aria-components'
import { Plus, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface FAQItem {
  id: string
  question: string
  question_ar: string
  answer: string
  answer_ar: string
  tag: string
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    tag: 'Quotes',
    question: 'How long does it take to receive a quote?',
    question_ar: '\u0643\u0645 \u064A\u0633\u062A\u063A\u0631\u0642 \u0627\u0633\u062A\u0644\u0627\u0645 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631\u061F',
    answer:
      'We deliver quotes within 4 hours during business hours (Sunday\u2013Thursday, 8 AM\u20136 PM). Submit your material list through the platform or via WhatsApp. Each quote includes unit pricing, delivery timeline, and payment terms. You can accept, negotiate quantities, swap materials, or request changes\u2014all from your dashboard.',
    answer_ar:
      '\u0646\u0642\u062F\u0645 \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u062E\u0644\u0627\u0644 \u0664 \u0633\u0627\u0639\u0627\u062A \u0641\u064A \u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0639\u0645\u0644 (\u0627\u0644\u0623\u062D\u062F\u2013\u0627\u0644\u062E\u0645\u064A\u0633\u060C \u0668 \u0635\u0628\u0627\u062D\u0627\u064B\u2013\u0666 \u0645\u0633\u0627\u0621\u064B). \u0623\u0631\u0633\u0644 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0639\u0628\u0631 \u0627\u0644\u0645\u0646\u0635\u0629 \u0623\u0648 \u0648\u0627\u062A\u0633\u0627\u0628. \u064A\u0634\u0645\u0644 \u0643\u0644 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629 \u0648\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A \u0644\u0644\u062A\u0648\u0635\u064A\u0644 \u0648\u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0642\u0628\u0648\u0644 \u0623\u0648 \u0627\u0644\u062A\u0641\u0627\u0648\u0636 \u0623\u0648 \u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0645\u0648\u0627\u062F \u0623\u0648 \u0637\u0644\u0628 \u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645.',
  },
  {
    id: 'faq-2',
    tag: 'Delivery',
    question: 'When can you deliver within Greater Cairo?',
    question_ar: '\u0645\u062A\u0649 \u064A\u0645\u0643\u0646\u0643\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u062F\u0627\u062E\u0644 \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0627\u0644\u0643\u0628\u0631\u0649\u061F',
    answer:
      'Most Cairo orders arrive within 24\u201348 hours. Heavy materials (steel, cement, aggregates) are delivered during permitted hours due to the Cairo truck ban that restricts heavy vehicles between 6 AM and midnight. Every delivery includes real-time GPS tracking and SMS status updates.',
    answer_ar:
      '\u0645\u0639\u0638\u0645 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u062A\u0635\u0644 \u062E\u0644\u0627\u0644 \u0662\u0664\u2013\u0664\u0668 \u0633\u0627\u0639\u0629. \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u062B\u0642\u064A\u0644\u0629 (\u0627\u0644\u062D\u062F\u064A\u062F \u0648\u0627\u0644\u0623\u0633\u0645\u0646\u062A \u0648\u0627\u0644\u0631\u0643\u0627\u0645) \u062A\u0648\u0635\u0644 \u062E\u0644\u0627\u0644 \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0645\u0633\u0645\u0648\u062D\u0629 \u0628\u0633\u0628\u0628 \u062D\u0638\u0631 \u0627\u0644\u0634\u0627\u062D\u0646\u0627\u062A \u0641\u064A \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0645\u0646 \u0666 \u0635\u0628\u0627\u062D\u0627\u064B \u062D\u062A\u0649 \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u0644\u064A\u0644. \u0643\u0644 \u062A\u0648\u0635\u064A\u0644\u0629 \u062A\u0634\u0645\u0644 \u062A\u062A\u0628\u0639 GPS \u0641\u0648\u0631\u064A \u0648\u0625\u0634\u0639\u0627\u0631\u0627\u062A SMS.',
  },
  {
    id: 'faq-3',
    tag: 'Payment',
    question: 'What payment methods do you accept?',
    question_ar: '\u0645\u0627 \u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u0642\u0628\u0648\u0644\u0629\u061F',
    answer:
      'Wire transfers, post-dated cheques, cash on delivery, and letters of credit. We follow Egyptian B2B standards\u2014no online payments or mobile wallets. All invoices include 14% VAT and are ETA e-invoicing compliant. Payment terms are negotiable for established accounts.',
    answer_ar:
      '\u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0628\u0646\u0643\u064A \u0648\u0627\u0644\u0634\u064A\u0643\u0627\u062A \u0627\u0644\u0645\u0624\u062C\u0644\u0629 \u0648\u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062E\u0637\u0627\u0628\u0627\u062A \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F. \u0646\u062A\u0628\u0639 \u0645\u0639\u0627\u064A\u064A\u0631 B2B \u0627\u0644\u0645\u0635\u0631\u064A\u0629\u2014\u0644\u0627 \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629 \u0623\u0648 \u0645\u062D\u0627\u0641\u0638 \u0645\u062D\u0645\u0648\u0644\u0629. \u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u062A\u0634\u0645\u0644 \u0661\u0664\u066A \u0636\u0631\u064A\u0628\u0629 \u0642\u064A\u0645\u0629 \u0645\u0636\u0627\u0641\u0629 \u0648\u0645\u062A\u0648\u0627\u0641\u0642\u0629 \u0645\u0639 \u0627\u0644\u0641\u0648\u062A\u0631\u0629 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629. \u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0641\u0627\u0648\u0636 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629.',
  },
  {
    id: 'faq-4',
    tag: 'Account',
    question: 'How do I sign up?',
    question_ar: '\u0643\u064A\u0641 \u0623\u0633\u062C\u0644\u061F',
    answer:
      'Enter your Egyptian mobile number and verify via WhatsApp OTP\u2014no email or password needed. Add your company name and full name to complete registration. The whole process takes under 60 seconds. You can browse the product catalog without an account, but submitting quotes requires sign-in.',
    answer_ar:
      '\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641\u0643 \u0627\u0644\u0645\u0635\u0631\u064A \u0648\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 OTP\u2014\u0644\u0627 \u062D\u0627\u062C\u0629 \u0644\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631. \u0623\u0636\u0641 \u0627\u0633\u0645 \u0634\u0631\u0643\u062A\u0643 \u0648\u0627\u0633\u0645\u0643 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0633\u062C\u064A\u0644. \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0643\u0644\u0647\u0627 \u062A\u0623\u062E\u0630 \u0623\u0642\u0644 \u0645\u0646 \u0666\u0660 \u062B\u0627\u0646\u064A\u0629. \u064A\u0645\u0643\u0646\u0643 \u062A\u0635\u0641\u062D \u0643\u062A\u0627\u0644\u0648\u062C \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0628\u062F\u0648\u0646 \u062D\u0633\u0627\u0628\u060C \u0644\u0643\u0646 \u0637\u0644\u0628 \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u064A\u062A\u0637\u0644\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644.',
  },
  {
    id: 'faq-5',
    tag: 'Materials',
    question: 'What building materials do you supply?',
    question_ar: '\u0645\u0627 \u0645\u0648\u0627\u062F \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062A\u064A \u062A\u0648\u0641\u0631\u0648\u0646\u0647\u0627\u061F',
    answer:
      'Over 500 products across cement, reinforcing steel, aggregates, bricks, ceramic tiles, timber, insulation, plumbing, electrical, paint, and waterproofing. All sourced from verified Egyptian suppliers. The catalog shows price ranges and specifications\u2014exact pricing is calculated per quote based on quantity and delivery location.',
    answer_ar:
      '\u0623\u0643\u062B\u0631 \u0645\u0646 \u0665\u0660\u0660 \u0645\u0646\u062A\u062C \u0639\u0628\u0631 \u0627\u0644\u0623\u0633\u0645\u0646\u062A \u0648\u062D\u062F\u064A\u062F \u0627\u0644\u062A\u0633\u0644\u064A\u062D \u0648\u0627\u0644\u0631\u0643\u0627\u0645 \u0648\u0627\u0644\u0637\u0648\u0628 \u0648\u0627\u0644\u0628\u0644\u0627\u0637 \u0648\u0627\u0644\u0623\u062E\u0634\u0627\u0628 \u0648\u0627\u0644\u0639\u0632\u0644 \u0648\u0627\u0644\u0633\u0628\u0627\u0643\u0629 \u0648\u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0648\u0627\u0644\u062F\u0647\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u0645\u0627\u0626\u064A. \u0643\u0644\u0647\u0627 \u0645\u0646 \u0645\u0648\u0631\u062F\u064A\u0646 \u0645\u0635\u0631\u064A\u064A\u0646 \u0645\u0639\u062A\u0645\u062F\u064A\u0646. \u0627\u0644\u0643\u062A\u0627\u0644\u0648\u062C \u064A\u0639\u0631\u0636 \u0646\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A\u2014\u0627\u0644\u062A\u0633\u0639\u064A\u0631 \u0627\u0644\u062F\u0642\u064A\u0642 \u064A\u062D\u0633\u0628 \u0641\u064A \u0643\u0644 \u0639\u0631\u0636 \u062D\u0633\u0628 \u0627\u0644\u0643\u0645\u064A\u0629 \u0648\u0645\u0648\u0642\u0639 \u0627\u0644\u062A\u0648\u0635\u064A\u0644.',
  },
  {
    id: 'faq-6',
    tag: 'Delivery',
    question: 'Do you deliver outside Cairo?',
    question_ar: '\u0647\u0644 \u062A\u0648\u0635\u0644\u0648\u0646 \u062E\u0627\u0631\u062C \u0627\u0644\u0642\u0627\u0647\u0631\u0629\u061F',
    answer:
      'Yes\u2014Alexandria, the Delta, and Upper Egypt. Delivery takes 24\u201372 hours depending on distance. Remote locations may require minimum order quantities. Contact us for a delivery estimate to your specific construction site.',
    answer_ar:
      '\u0646\u0639\u0645\u2014\u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629 \u0648\u0627\u0644\u062F\u0644\u062A\u0627 \u0648\u0635\u0639\u064A\u062F \u0645\u0635\u0631. \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u064A\u0633\u062A\u063A\u0631\u0642 \u0662\u0664\u2013\u0667\u0662 \u0633\u0627\u0639\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0633\u0627\u0641\u0629. \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0646\u0627\u0626\u064A\u0629 \u0642\u062F \u062A\u062A\u0637\u0644\u0628 \u062D\u062F \u0623\u062F\u0646\u0649 \u0644\u0644\u0637\u0644\u0628. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0644\u062A\u0642\u062F\u064A\u0631 \u0645\u0648\u0639\u062F \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0628\u0646\u0627\u0621.',
  },
  {
    id: 'faq-7',
    tag: 'Payment',
    question: 'How does invoicing work?',
    question_ar: '\u0643\u064A\u0641 \u062A\u0639\u0645\u0644 \u0627\u0644\u0641\u0648\u062A\u0631\u0629\u061F',
    answer:
      'Every order generates an Arabic e-invoice compliant with the Egyptian Tax Authority\u2019s real-time system. Invoices break down 14% VAT, itemized materials, delivery charges, and payment terms. Available in your dashboard and sent via email and WhatsApp automatically.',
    answer_ar:
      '\u0643\u0644 \u0637\u0644\u0628 \u064A\u0646\u0634\u0626 \u0641\u0627\u062A\u0648\u0631\u0629 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u062A\u0648\u0627\u0641\u0642\u0629 \u0645\u0639 \u0646\u0638\u0627\u0645 \u0627\u0644\u0647\u064A\u0626\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u0636\u0631\u0627\u0626\u0628 \u0627\u0644\u0641\u0648\u0631\u064A. \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u062A\u0641\u0635\u0644 \u0661\u0664\u066A \u0636\u0631\u064A\u0628\u0629 \u0642\u064A\u0645\u0629 \u0645\u0636\u0627\u0641\u0629 \u0648\u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0631\u0633\u0648\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0648\u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639. \u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0648\u062A\u0631\u0633\u0644 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0648\u0648\u0627\u062A\u0633\u0627\u0628 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.',
  },
  {
    id: 'faq-8',
    tag: 'Bulk',
    question: 'Do you offer volume pricing for large projects?',
    question_ar: '\u0647\u0644 \u062A\u0642\u062F\u0645\u0648\u0646 \u0623\u0633\u0639\u0627\u0631 \u062E\u0627\u0635\u0629 \u0644\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0643\u0628\u064A\u0631\u0629\u061F',
    answer:
      'Yes. Bulk orders get priority pricing from our supplier network. For projects exceeding EGP 500,000, we assign a dedicated account manager who handles quoting, delivery scheduling across multiple sites, and consolidated invoicing.',
    answer_ar:
      '\u0646\u0639\u0645. \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0628\u0627\u0644\u062C\u0645\u0644\u0629 \u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0623\u0633\u0639\u0627\u0631 \u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u0646 \u0634\u0628\u0643\u0629 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646. \u0644\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u062A\u064A \u062A\u062A\u062C\u0627\u0648\u0632 \u0665\u0660\u0660\u066C\u0660\u0660\u0660 \u062C\u0646\u064A\u0647\u060C \u0646\u0639\u064A\u0651\u0646 \u0645\u062F\u064A\u0631 \u062D\u0633\u0627\u0628 \u0645\u062E\u0635\u0635 \u064A\u062A\u0648\u0644\u0649 \u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u062C\u062F\u0648\u0644\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0639\u0628\u0631 \u0645\u0648\u0627\u0642\u0639 \u0645\u062A\u0639\u062F\u062F\u0629 \u0648\u0627\u0644\u0641\u0648\u062A\u0631\u0629 \u0627\u0644\u0645\u0648\u062D\u062F\u0629.',
  },
  {
    id: 'faq-9',
    tag: 'Returns',
    question: 'What is your returns policy?',
    question_ar: '\u0645\u0627 \u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u0625\u0631\u062C\u0627\u0639\u061F',
    answer:
      'Defective or incorrect materials can be returned within 7 days of delivery. We arrange pickup at no extra cost. Custom-cut items and special orders are non-returnable unless defective. Refunds are processed within 5 business days after inspection.',
    answer_ar:
      '\u064A\u0645\u0643\u0646 \u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0639\u064A\u0628\u0629 \u0623\u0648 \u0627\u0644\u062E\u0627\u0637\u0626\u0629 \u062E\u0644\u0627\u0644 \u0667 \u0623\u064A\u0627\u0645 \u0645\u0646 \u0627\u0644\u062A\u0648\u0635\u064A\u0644. \u0646\u0631\u062A\u0628 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0628\u062F\u0648\u0646 \u062A\u0643\u0644\u0641\u0629 \u0625\u0636\u0627\u0641\u064A\u0629. \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0642\u0637\u0639\u0629 \u062D\u0633\u0628 \u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0625\u0631\u062C\u0627\u0639 \u0625\u0644\u0627 \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0645\u0639\u064A\u0628\u0629. \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u062E\u0644\u0627\u0644 \u0665 \u0623\u064A\u0627\u0645 \u0639\u0645\u0644 \u0628\u0639\u062F \u0627\u0644\u0641\u062D\u0635.',
  },
  {
    id: 'faq-10',
    tag: 'Platform',
    question: 'Is the platform fully available in Arabic?',
    question_ar: '\u0647\u0644 \u0627\u0644\u0645\u0646\u0635\u0629 \u0645\u062A\u0627\u062D\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629\u061F',
    answer:
      'Arabic is our primary language. Every screen, invoice, and document uses native right-to-left layout. Numbers display in Arabic-Indic numerals (\u0661\u0662\u0663) when using Arabic. You can switch between Arabic and English at any time from the header.',
    answer_ar:
      '\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0647\u064A \u0644\u063A\u062A\u0646\u0627 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629. \u0643\u0644 \u0634\u0627\u0634\u0629 \u0648\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u0645\u0633\u062A\u0646\u062F \u064A\u0633\u062A\u062E\u062F\u0645 \u062A\u0646\u0633\u064A\u0642 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0644\u0644\u064A\u0633\u0627\u0631. \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u062A\u0639\u0631\u0636 \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0639\u0631\u0628\u064A\u0629-\u0627\u0644\u0647\u0646\u062F\u064A\u0629 (\u0661\u0662\u0663) \u0639\u0646\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0639\u0631\u0628\u064A\u0629. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0628\u064A\u0646 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0641\u064A \u0623\u064A \u0648\u0642\u062A \u0645\u0646 \u0627\u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u0639\u0644\u0648\u064A.',
  },
]

interface FAQAccordionProps {
  expandId?: string | null
}

export function FAQAccordion({ expandId }: FAQAccordionProps) {
  const { i18n } = useTranslation('website')
  const isArabic = i18n.language === 'ar'
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // React to expandId prop from parent
  useEffect(() => {
    if (!expandId) return
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.add(expandId)
      return next
    })
    setHighlightId(expandId)
    setTimeout(() => {
      itemRefs.current[expandId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    setTimeout(() => setHighlightId(null), 2500)
  }, [expandId])

  function toggleItem(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      {FAQ_DATA.map((item) => {
        const isOpen = openIds.has(item.id)

        return (
          <div
            key={item.id}
            ref={(el) => { itemRefs.current[item.id] = el }}
            className={`border-b border-[var(--color-text)]/[0.07] transition-[border-color] duration-700 ${
              highlightId === item.id ? 'border-[var(--color-primary)]/25' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-8 py-8 text-start outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className={`text-[17px] font-semibold leading-snug tracking-[-0.015em] transition-colors duration-700 ${
                highlightId === item.id ? 'text-[var(--color-primary)]' : ''
              }`}>
                {isArabic ? item.question_ar : item.question}
              </span>
              <span className={`shrink-0 transition-colors duration-200 ${
                isOpen ? 'text-[var(--color-primary)]' : 'opacity-25'
              }`}>
                {isOpen ? (
                  <Minus size={16} strokeWidth={1.5} />
                ) : (
                  <Plus size={16} strokeWidth={1.5} />
                )}
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows,opacity] duration-250 ease-out"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <div className="pb-9 pe-16 text-[15px] leading-[1.8] opacity-65">
                  {isArabic ? item.answer_ar : item.answer}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
