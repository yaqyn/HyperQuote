#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATE_DIR = join(process.cwd(), 'supabase/templates/auth')
const EXPECTED_TEMPLATE_COUNT = 13

const WEBSITE_URL = 'https://hyperquote.net'
const SUPPORT_URL = `${WEBSITE_URL}/support#contact`
const PORTAL_URL = 'https://portal.hyperquote.net'
const OFFICE_URL =
	'https://maps.google.com/?q=Arkan%20Plaza%2C%20Sheikh%20Zayed%2C%20Egypt'
const OFFICE_ADDRESS = 'Arkan Plaza, Sheikh Zayed, Egypt'
const EMAIL_ASSET_URL = 'https://pub-cbfbae308dae4797b95916396d2ff713.r2.dev'

const SUPPORT_PHONE_URL = SUPPORT_URL
const SUPPORT_WHATSAPP_URL = SUPPORT_URL
const CUSTOMER_NAME =
	'{{ if .Data.company_name }}{{ .Data.company_name }}{{ else if .Data.name }}{{ .Data.name }}{{ else if .Data.contact_name }}{{ .Data.contact_name }}{{ else }}there{{ end }}'

const imageUrls = {
	footerIcons: {
		call: emailAssetUrl('email/footer-icons/call.png'),
		email: emailAssetUrl('email/footer-icons/email.png'),
		portal: emailAssetUrl('email/footer-icons/portal.png'),
		whatsapp: emailAssetUrl('email/footer-icons/whatsapp.png'),
	},
	icons: {
		alternate_email: emailAssetUrl('email/auth-icons/alternate_email.png'),
		key: emailAssetUrl('email/auth-icons/key.png'),
		link: emailAssetUrl('email/auth-icons/link.png'),
		link_off: emailAssetUrl('email/auth-icons/link_off.png'),
		mark_email_read: emailAssetUrl('email/auth-icons/mark_email_read.png'),
		mfa: emailAssetUrl('email/auth-icons/mfa.png'),
		otp: emailAssetUrl('email/auth-icons/otp.png'),
		person_add: emailAssetUrl('email/auth-icons/person_add.png'),
		phone: emailAssetUrl('email/auth-icons/phone.png'),
		security: emailAssetUrl('email/auth-icons/security.png'),
	},
	logo: emailAssetUrl('logos/lyon-black-v2.png'),
}

const templates = [
	{
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Confirm email' }],
		file: 'confirmation.html',
		icon: 'mark_email_read',
		kicker: 'Secure email confirmation',
		link: '{{ .ConfirmationURL }}',
		message:
			'This is the HyperQuote Support team. We received a request to confirm this email for your account. Use the button below to finish.',
		preheader: 'Confirm your HyperQuote email address.',
		title: 'Confirm your email.',
		utilityNote:
			'This link expires soon. If you did not request it, no action is needed.',
	},
	{
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Confirm new email' }],
		file: 'email_change.html',
		icon: 'alternate_email',
		kicker: 'Secure email change',
		link: '{{ .ConfirmationURL }}',
		message:
			'This is the HyperQuote Support team. We received a request to change your email to <strong>{{ .NewEmail }}</strong>. Use the button below to confirm it.',
		preheader: 'Confirm your new HyperQuote email address.',
		title: 'Confirm the new email.',
		utilityNote:
			'This link expires soon. If you did not request this change, contact support.',
	},
	{
		buttons: [
			{
				href: '{{ .RedirectTo }}?type=recovery&amp;token_hash={{ .TokenHash }}',
				label: 'Reset password',
			},
		],
		file: 'recovery.html',
		icon: 'key',
		kicker: 'Secure account recovery',
		link: '{{ .RedirectTo }}?type=recovery&amp;token_hash={{ .TokenHash }}',
		message:
			'This is the HyperQuote Support team. We received a request to reset your password. Use the button below to choose a new one.',
		preheader: 'Choose a new password for your HyperQuote account.',
		title: 'Reset your password.',
		utilityNote:
			'This link expires soon. If you did not request it, no action is needed.',
	},
	{
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Sign in' }],
		file: 'magic_link.html',
		icon: 'link',
		kicker: 'Secure sign-in link',
		link: '{{ .ConfirmationURL }}',
		message:
			'This is the HyperQuote Support team. We received a request to sign in to HyperQuote. Use the button below to open your account.',
		preheader: 'Your HyperQuote sign-in link.',
		title: 'Open HyperQuote.',
		utilityNote:
			'This link expires soon. If you did not request it, no action is needed.',
	},
	{
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Accept invitation' }],
		file: 'invite.html',
		icon: 'person_add',
		kicker: 'HyperQuote invitation',
		link: '{{ .ConfirmationURL }}',
		message:
			'This is the HyperQuote Support team. You have been invited to HyperQuote. Use the button below to accept the invitation and set up your account.',
		preheader: 'You were invited to HyperQuote.',
		title: 'Accept your invitation.',
		utilityNote:
			'This invitation link expires soon. If this was unexpected, no action is needed.',
	},
	{
		code: '{{ .Token }}',
		file: 'reauthentication.html',
		icon: 'otp',
		kicker: 'Sensitive action',
		message:
			'This is the HyperQuote Support team. Use this code to verify your account action.',
		preheader: 'Your HyperQuote verification code is {{ .Token }}.',
		title: 'Verification code.',
		utilityNote:
			'This code expires soon. HyperQuote will never ask you to share it by email or phone.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'password_changed_notification.html',
		icon: 'key',
		kicker: 'Security notification',
		message:
			'This is the HyperQuote Support team. Your password was changed. If this was you, no action is needed.',
		preheader: 'Your HyperQuote password was changed.',
		title: 'Your password was changed.',
		utilityNote: 'If this was not you, contact support.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'email_changed_notification.html',
		icon: 'alternate_email',
		kicker: 'Security notification',
		message:
			'This is the HyperQuote Support team. Your account email was changed. If this was you, no action is needed.',
		preheader: 'Your HyperQuote email was changed.',
		title: 'Your email was changed.',
		utilityNote: 'If this was not you, contact support.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'phone_changed_notification.html',
		icon: 'phone',
		kicker: 'Security notification',
		message:
			'This is the HyperQuote Support team. Your account phone number was changed. If this was you, no action is needed.',
		preheader: 'Your HyperQuote phone number was changed.',
		title: 'Your phone number was changed.',
		utilityNote: 'If this was not you, contact support.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'mfa_factor_enrolled_notification.html',
		icon: 'mfa',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A new verification method was added to your account. If this was you, no action is needed.',
		preheader: 'A verification method was added to your HyperQuote account.',
		title: 'Verification method added.',
		utilityNote: 'If this was not you, contact support.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'mfa_factor_unenrolled_notification.html',
		icon: 'mfa',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A verification method was removed from your account. If this was you, no action is needed.',
		preheader:
			'A verification method was removed from your HyperQuote account.',
		title: 'Verification method removed.',
		utilityNote: 'If this was not you, contact support.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'identity_linked_notification.html',
		icon: 'link',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A new sign-in method was linked to your account. If this was you, no action is needed.',
		preheader: 'A sign-in method was linked to your HyperQuote account.',
		title: 'Sign-in method linked.',
		utilityNote: 'If this was not you, contact support.',
	},
	{
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		file: 'identity_unlinked_notification.html',
		icon: 'link_off',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A sign-in method was removed from your account. If this was you, no action is needed.',
		preheader: 'A sign-in method was removed from your HyperQuote account.',
		title: 'Sign-in method removed.',
		utilityNote: 'If this was not you, contact support.',
	},
]

if (templates.length !== EXPECTED_TEMPLATE_COUNT) {
	throw new Error(
		`Expected ${EXPECTED_TEMPLATE_COUNT} auth templates, received ${templates.length}`,
	)
}

mkdirSync(TEMPLATE_DIR, { recursive: true })

for (const template of templates) {
	writeFileSync(join(TEMPLATE_DIR, template.file), renderEmail(template))
}

function renderEmail(template) {
	const contentBlocks = [
		renderGreeting(),
		renderMessage(template.message),
		template.code ? renderCode(template.code) : '',
		template.buttons ? renderButtons(template.buttons) : '',
	]
		.filter(Boolean)
		.join('\n')

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${template.title}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #171717;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", Arial, sans-serif;
      }

      a {
        color: inherit;
      }

      .email {
        width: min(100%, 960px);
        margin: 0 auto;
        background: #ffffff;
      }

      .preheader {
        display: none;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
      }

      .top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 92px;
        gap: 28px;
        align-items: center;
        padding: 56px 56px 36px;
        border-bottom: 1px solid #e7ebf0;
      }

      .eyebrow {
        margin: 0 0 12px;
        color: #2563eb;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: #090909;
        font-size: 36px;
        line-height: 1.12;
        font-weight: 800;
        letter-spacing: 0;
      }

      .icon-frame {
        display: grid;
        width: 92px;
        height: 92px;
        place-items: center;
      }

      .icon-frame img {
        display: block;
        width: 92px;
        height: 92px;
        border: 0;
        outline: none;
        text-decoration: none;
      }

      .main {
        padding: 44px 56px 96px;
      }

      .message {
        max-width: 790px;
        margin: 0 auto;
      }

      .lead {
        margin: 0;
        color: #090909;
        font-size: 18px;
        line-height: 1.65;
        font-weight: 650;
      }

      .copy {
        margin: 12px 0 0;
        color: #343a46;
        font-size: 16px;
        line-height: 1.65;
      }

      .action {
        margin: 96px 0 0;
        text-align: center;
      }

      .button {
        display: inline-block;
        min-width: 230px;
        margin: 0 6px 10px;
        padding: 17px 28px;
        border: 1px solid #2563eb;
        border-radius: 999px;
        background: #2563eb;
        color: #ffffff;
        font-size: 16px;
        font-weight: 800;
        line-height: 1;
        text-align: center;
        text-decoration: none;
      }

      .button.secondary {
        border-color: #e7ebf0;
        background: #ffffff;
        color: #090909;
      }

      .code {
        display: inline-block;
        border: 1px solid #e7ebf0;
        border-radius: 18px;
        background: #f8faff;
        padding: 22px 30px;
        color: #090909;
        font-size: 44px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0.18em;
      }

      .safe-note {
        max-width: 680px;
        margin: 0 auto;
        color: #5f6b7a;
        font-size: 13px;
        line-height: 1.6;
        text-align: center;
      }

      .fallback {
        max-width: 620px;
        margin: 7px auto 0;
        text-align: center;
      }

      .fallback-title {
        margin: 0;
        color: #5f6b7a;
        font-size: 12px;
        font-weight: 500;
      }

      .fallback-title a {
        color: #2563eb;
        font-weight: 650;
        text-decoration: none;
      }

      .footer-note {
        padding: 0 56px 34px;
      }

      .footer {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(320px, 360px);
        gap: 36px;
        align-items: center;
        padding: 38px 56px 44px;
        border-top: 1px solid #e7ebf0;
        background: #ffffff;
        color: #090909;
      }

      .footer-left {
        display: flex;
        gap: 20px;
        align-items: center;
        min-width: 0;
      }

      .brand-mark {
        flex: 0 0 auto;
        display: inline-flex;
        color: #ffffff;
        text-decoration: none;
      }

      .brand-mark img {
        display: block;
        width: 86px;
        height: 86px;
        border: 0;
        outline: none;
        text-decoration: none;
      }

      .brand-copy {
        min-width: 0;
      }

      .brand-name {
        display: block;
        color: #090909;
        font-size: 24px;
        font-weight: 850;
        line-height: 1.15;
        text-decoration: none;
      }

      .brand-address {
        display: block;
        margin-top: 7px;
        color: #5f6b7a;
        font-size: 13px;
        line-height: 1.45;
        text-decoration: none;
      }

      .footer-links {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .footer-links a {
        display: inline-flex;
        gap: 9px;
        align-items: center;
        justify-content: flex-start;
        min-height: 44px;
        padding: 10px 12px;
        border: 1px solid #e7ebf0;
        border-radius: 14px;
        color: #090909;
        font-size: 13px;
        font-weight: 750;
        text-decoration: none;
      }

      .footer-links img {
        flex: 0 0 auto;
        display: block;
        width: 21px;
        height: 21px;
        border: 0;
        outline: none;
        text-decoration: none;
      }

      .footer-icon-slot {
        display: inline-flex;
        flex: 0 0 21px;
        align-items: center;
        justify-content: center;
        width: 21px;
        height: 21px;
      }

      @media (max-width: 760px) {
        .top {
          grid-template-columns: 1fr;
          justify-items: center;
          padding: 34px 24px 28px;
          text-align: center;
        }

        .icon-frame {
          width: 76px;
          height: 76px;
        }

        .icon-frame img {
          width: 76px;
          height: 76px;
        }

        h1 {
          font-size: 30px;
        }

        .copy {
          font-size: 16px;
        }

        .main {
          padding: 34px 24px 72px;
        }

        .message {
          text-align: center;
        }

        .action {
          margin-top: 72px;
        }

        .footer-note {
          padding: 0 24px 30px;
        }

        .footer {
          grid-template-columns: 1fr;
          gap: 28px;
          padding: 30px 24px;
          justify-items: center;
        }

        .footer-links {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          width: 100%;
          max-width: 360px;
          justify-self: center;
          margin: 0 auto;
        }

        .footer-left {
          justify-content: center;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <div class="preheader">${template.preheader}</div>
    <article class="email" aria-label="HyperQuote ${template.title} email">
      <header class="top">
        <div>
          <p class="eyebrow">${template.kicker}</p>
          <h1>${template.title}</h1>
        </div>
        <div class="icon-frame" aria-hidden="true">
          ${renderIcon(template.icon)}
        </div>
      </header>

      <main class="main">
        <section class="message">
          ${contentBlocks}
        </section>
      </main>

      ${renderFooter()}
      ${renderFooterNote(template)}
    </article>
  </body>
</html>
`
}

function renderGreeting() {
	return `<p class="lead">Welcome, ${CUSTOMER_NAME}.</p>`
}

function renderMessage(message) {
	return `<p class="copy">${message}</p>`
}

function renderButtons(buttons) {
	const anchors = buttons
		.map((button) => {
			const className = button.secondary ? 'button secondary' : 'button'
			return `<a class="${className}" href="${button.href}">${button.label}</a>`
		})
		.join('\n            ')

	return `<div class="action">
            ${anchors}
          </div>`
}

function renderCode(code) {
	return `<div class="action">
            <div class="code">${code}</div>
          </div>`
}

function renderIcon(icon) {
	const src = imageUrls.icons[icon] ?? imageUrls.icons.security
	return `<img src="${src}" width="92" height="92" alt="">`
}

function renderFooter() {
	return `<footer class="footer">
        <div class="footer-left">
          <a class="brand-mark" href="${WEBSITE_URL}" aria-label="Open HyperQuote website">
            <img src="${imageUrls.logo}" width="86" height="86" alt="">
          </a>
          <div class="brand-copy">
            <a class="brand-name" href="${WEBSITE_URL}">HyperQuote</a>
            <a class="brand-address" href="${OFFICE_URL}">${OFFICE_ADDRESS}</a>
          </div>
        </div>
        <nav class="footer-links" aria-label="Important links">
          ${footerLink('Support', SUPPORT_URL, 'email')}
          ${footerLink('Call', SUPPORT_PHONE_URL, 'call')}
          ${footerLink('WhatsApp', SUPPORT_WHATSAPP_URL, 'whatsapp')}
          ${footerLink('Portal', PORTAL_URL, 'portal')}
        </nav>
      </footer>`
}

function renderFooterNote(template) {
	if (!template.utilityNote && !template.link) return ''

	const lines = []
	if (template.utilityNote) {
		lines.push(`<p class="safe-note">${template.utilityNote}</p>`)
	}
	if (template.link) {
		lines.push(`<div class="fallback">
          <p class="fallback-title">Trouble opening the button? <a href="${template.link}">Use this link.</a></p>
        </div>`)
	}

	return `<div class="footer-note">
        ${lines.join('\n        ')}
      </div>`
}

function footerLink(label, href, icon) {
	const src = imageUrls.footerIcons[icon] ?? imageUrls.footerIcons.email
	return `<a href="${href}">
            <span class="footer-icon-slot"><img src="${src}" width="21" height="21" alt=""></span>
            <span>${label}</span>
          </a>`
}

function emailAssetUrl(fileName) {
	return `${EMAIL_ASSET_URL}/${fileName}`
}

console.log(
	`Generated ${templates.length} auth email templates in ${TEMPLATE_DIR}`,
)
