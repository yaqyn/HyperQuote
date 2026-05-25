#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATE_DIR = join(process.cwd(), 'supabase/templates/auth')
const EXPECTED_TEMPLATE_COUNT = 13

const BRAND_BLUE = '#2563EB'
const BLACK = '#090909'
const WHITE = '#FFFFFF'
const MUTED = '#5F6B7A'
const LINE = '#E7EBF0'
const WEBSITE_URL = 'https://hyperquote.net'
const SUPPORT_URL = `${WEBSITE_URL}/support#contact`
const PORTAL_URL = 'https://portal.hyperquote.net'
const OFFICE_URL = 'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'
const OFFICE_ADDRESS = 'Arkan Plaza, Sheikh Zayed, Egypt'
const EMAIL_ASSET_URL = 'https://pub-cbfbae308dae4797b95916396d2ff713.r2.dev'

const SUPPORT_PHONE_URL = SUPPORT_URL
const SUPPORT_WHATSAPP_URL = SUPPORT_URL
const CUSTOMER_NAME =
	'{{ if .Data.company_name }}{{ .Data.company_name }}{{ else if .Data.name }}{{ .Data.name }}{{ else if .Data.contact_name }}{{ .Data.contact_name }}{{ else }}there{{ end }}'

const imageUrls = {
	logo: emailAssetUrl('logos/lyon-black.png'),
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
	footerIcons: {
		call: emailAssetUrl('email/footer-icons/call.png'),
		email: emailAssetUrl('email/footer-icons/email.png'),
		portal: emailAssetUrl('email/footer-icons/portal.png'),
		whatsapp: emailAssetUrl('email/footer-icons/whatsapp.png'),
	},
}

const templates = [
	{
		file: 'confirmation.html',
		icon: 'mark_email_read',
		preheader: 'Confirm your HyperQuote email address.',
		title: 'Confirm your email.',
		kicker: 'Secure account access',
		message:
			'This is the HyperQuote Support team. We received a request to confirm this email for your account. Use the button below to finish.',
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Confirm email' }],
		link: '{{ .ConfirmationURL }}',
		utilityNote:
			'This link expires soon. If you did not request it, no action is needed.',
	},
	{
		file: 'email_change.html',
		icon: 'alternate_email',
		preheader: 'Confirm your new HyperQuote email address.',
		title: 'Confirm the new email.',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. We received a request to change your email to <strong>{{ .NewEmail }}</strong>. Use the button below to confirm it.',
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Confirm new email' }],
		link: '{{ .ConfirmationURL }}',
		utilityNote:
			'This link expires soon. If you did not request this change, contact support.',
	},
	{
		file: 'recovery.html',
		icon: 'key',
		preheader: 'Reset your HyperQuote password.',
		title: 'Reset your password.',
		kicker: 'Recovery request',
		message:
			'This is the HyperQuote Support team. We received a request to reset your password. Use the button below to choose a new one.',
		buttons: [
			{
				href: '{{ .RedirectTo }}?type=recovery&amp;token_hash={{ .TokenHash }}',
				label: 'Reset password',
			},
		],
		link: '{{ .RedirectTo }}?type=recovery&amp;token_hash={{ .TokenHash }}',
		utilityNote:
			'This link expires soon. If you did not request it, no action is needed.',
	},
	{
		file: 'magic_link.html',
		icon: 'link',
		preheader: 'Your HyperQuote sign-in link.',
		title: 'Open HyperQuote.',
		kicker: 'Sign-in link',
		message:
			'This is the HyperQuote Support team. We received a request to sign in to HyperQuote. Use the button below to open your account.',
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Sign in' }],
		link: '{{ .ConfirmationURL }}',
		utilityNote:
			'This link expires soon. If you did not request it, no action is needed.',
	},
	{
		file: 'invite.html',
		icon: 'person_add',
		preheader: 'You were invited to HyperQuote.',
		title: 'Accept your invitation.',
		kicker: 'Invitation',
		message:
			'This is the HyperQuote Support team. You have been invited to HyperQuote. Use the button below to accept the invitation and set up your account.',
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Accept invitation' }],
		link: '{{ .ConfirmationURL }}',
		utilityNote:
			'This invitation link expires soon. If this was unexpected, no action is needed.',
	},
	{
		file: 'reauthentication.html',
		icon: 'otp',
		preheader: 'Your HyperQuote verification code is {{ .Token }}.',
		title: 'Verification code.',
		kicker: 'Sensitive action',
		message:
			'This is the HyperQuote Support team. Use this code to verify your account action.',
		code: '{{ .Token }}',
		utilityNote:
			'This code expires soon. HyperQuote will never ask you to share it by email or phone.',
	},
	{
		file: 'password_changed_notification.html',
		icon: 'key',
		preheader: 'Your HyperQuote password was changed.',
		title: 'Your password was changed.',
		kicker: 'Security notification',
		message:
			'This is the HyperQuote Support team. Your password was changed. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		utilityNote: 'If this was not you, contact support.',
	},
	{
		file: 'email_changed_notification.html',
		icon: 'alternate_email',
		preheader: 'Your HyperQuote email was changed.',
		title: 'Your email was changed.',
		kicker: 'Security notification',
		message:
			'This is the HyperQuote Support team. Your account email was changed. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		utilityNote: 'If this was not you, contact support.',
	},
	{
		file: 'phone_changed_notification.html',
		icon: 'phone',
		preheader: 'Your HyperQuote phone number was changed.',
		title: 'Your phone number was changed.',
		kicker: 'Security notification',
		message:
			'This is the HyperQuote Support team. Your account phone number was changed. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		utilityNote: 'If this was not you, contact support.',
	},
	{
		file: 'mfa_factor_enrolled_notification.html',
		icon: 'mfa',
		preheader: 'A verification method was added to your HyperQuote account.',
		title: 'Verification method added.',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A new verification method was added to your account. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		utilityNote: 'If this was not you, contact support.',
	},
	{
		file: 'mfa_factor_unenrolled_notification.html',
		icon: 'mfa',
		preheader:
			'A verification method was removed from your HyperQuote account.',
		title: 'Verification method removed.',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A verification method was removed from your account. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		utilityNote: 'If this was not you, contact support.',
	},
	{
		file: 'identity_linked_notification.html',
		icon: 'link',
		preheader: 'A sign-in method was linked to your HyperQuote account.',
		title: 'Sign-in method linked.',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A new sign-in method was linked to your account. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
		utilityNote: 'If this was not you, contact support.',
	},
	{
		file: 'identity_unlinked_notification.html',
		icon: 'link_off',
		preheader: 'A sign-in method was removed from your HyperQuote account.',
		title: 'Sign-in method removed.',
		kicker: 'Account security',
		message:
			'This is the HyperQuote Support team. A sign-in method was removed from your account. If this was you, no action is needed.',
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
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
		.join('')

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="color-scheme" content="light">
	<meta name="supported-color-schemes" content="light">
	<title>${template.title}</title>
	<style>
		@media only screen and (max-width: 720px) {
			.email-shell { width: 100% !important; max-width: 100% !important; }
			.email-pad { padding-left: 24px !important; padding-right: 24px !important; }
			.email-title-cell, .email-icon-cell, .email-body-cell, .email-footer-brand, .email-footer-links { display: block !important; width: 100% !important; text-align: center !important; }
			.email-title-cell { padding-right: 0 !important; }
			.email-title { font-size: 30px !important; }
			.email-icon-cell { padding-top: 26px !important; }
			.email-icon { width: 76px !important; height: 76px !important; margin: 0 auto !important; }
			.email-main-pad { padding-bottom: 72px !important; }
			.email-body-action { margin-top: 72px !important; }
			.email-footer-brand-table, .email-footer-links-table { margin-left: auto !important; margin-right: auto !important; }
			.email-footer-links { padding-top: 28px !important; }
			.email-footer-note { padding-left: 24px !important; padding-right: 24px !important; text-align: center !important; }
			.email-footer-link { text-align: center !important; }
		}
	</style>
</head>
<body style="margin:0;padding:0;background:${WHITE};color:${BLACK};font-family:Arial,Helvetica,sans-serif;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${template.preheader}</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:${WHITE};margin:0;padding:0;">
		<tr>
			<td align="center" style="padding:44px 18px 0;">
				<table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:960px;margin:0 auto;background:${WHITE};">
					<tr>
						<td class="email-pad" style="padding:0 56px 36px;border-bottom:1px solid ${LINE};">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
								<tr>
									<td class="email-title-cell" style="vertical-align:middle;padding:0 28px 0 0;">
										<p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_BLUE};">${template.kicker}</p>
										<h1 class="email-title" style="margin:0;font-size:36px;line-height:1.12;font-weight:800;letter-spacing:0;color:${BLACK};">${template.title}</h1>
									</td>
									<td class="email-icon-cell" align="right" style="width:92px;vertical-align:middle;">
										${renderIcon(template.icon)}
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td class="email-pad email-main-pad" style="padding:44px 56px 96px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:790px;margin:0 auto;">
								<tr>
									<td class="email-body-cell" style="text-align:left;">
										${contentBlocks}
									</td>
								</tr>
							</table>
						</td>
					</tr>
					${renderFooter()}
					${renderFooterNote(template)}
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
`
}

function renderGreeting() {
	return `<p style="margin:0;font-size:18px;line-height:1.65;font-weight:650;color:${BLACK};">Welcome, ${CUSTOMER_NAME}.</p>`
}

function renderMessage(message) {
	return `<p style="margin:12px 0 0;font-size:16px;line-height:1.65;color:#343A46;">${message}</p>`
}

function renderButtons(buttons) {
	const anchors = buttons
		.map((button) => {
			const background = button.secondary ? WHITE : BRAND_BLUE
			const color = button.secondary ? BLACK : WHITE
			const border = button.secondary
				? `1px solid ${LINE}`
				: `1px solid ${BRAND_BLUE}`
			return `<a href="${button.href}" style="display:inline-block;margin:0 6px;padding:17px 28px;border:${border};border-radius:999px;background:${background};color:${color};font-size:16px;font-weight:800;line-height:1;text-align:center;text-decoration:none;">${button.label}</a>`
		})
		.join('')
	return `<div class="email-body-action" style="margin:96px 0 0;text-align:center;">${anchors}</div>`
}

function renderCode(code) {
	return `<div class="email-body-action" style="margin:72px auto 0;text-align:center;"><div style="display:inline-block;border:1px solid ${LINE};border-radius:18px;background:#F8FAFF;padding:22px 30px;font-size:44px;line-height:1;font-weight:800;letter-spacing:0.18em;color:${BLACK};">${code}</div></div>`
}

function renderIcon(name) {
	const src = imageUrls.icons[name] ?? imageUrls.icons.security
	return `<img class="email-icon" src="${src}" width="92" height="92" alt="" style="display:block;width:92px;height:92px;border:0;outline:none;text-decoration:none;">`
}

function renderFooter() {
	return `<tr>
	<td class="email-pad" style="padding:38px 56px 44px;border-top:1px solid ${LINE};background:${WHITE};">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
			<tr>
				<td class="email-footer-brand" style="vertical-align:middle;">
					<table role="presentation" class="email-footer-brand-table" cellspacing="0" cellpadding="0">
						<tr>
							<td style="width:86px;vertical-align:middle;">
								<a href="${WEBSITE_URL}" style="display:inline-block;text-decoration:none;">
									<table role="presentation" width="86" height="86" cellspacing="0" cellpadding="0" style="width:86px;height:86px;border:1px solid ${LINE};border-radius:18px;background:#F6F8FB;">
										<tr>
											<td align="center" valign="middle">
												<img src="${imageUrls.logo}" width="72" height="72" alt="HyperQuote logo" style="display:block;width:72px;height:72px;border:0;outline:none;text-decoration:none;">
											</td>
										</tr>
									</table>
								</a>
							</td>
							<td style="padding-left:20px;vertical-align:middle;">
								<a href="${WEBSITE_URL}" style="display:block;color:${BLACK};font-size:24px;font-weight:850;line-height:1.15;text-decoration:none;">HyperQuote</a>
								<a href="${OFFICE_URL}" style="display:block;margin-top:7px;color:${MUTED};font-size:13px;line-height:1.45;text-decoration:none;">${OFFICE_ADDRESS}</a>
							</td>
						</tr>
					</table>
				</td>
				<td class="email-footer-links" align="right" style="vertical-align:middle;text-align:right;">
					<table role="presentation" class="email-footer-links-table" cellspacing="0" cellpadding="0" align="right" style="width:100%;max-width:360px;">
						<tr>
							${footerLink('Support', SUPPORT_URL, 'email')}
							${footerLink('Call', SUPPORT_PHONE_URL, 'call')}
						</tr>
						<tr>
							${footerLink('WhatsApp', SUPPORT_WHATSAPP_URL, 'whatsapp')}
							${footerLink('Portal App', PORTAL_URL, 'portal')}
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</td>
</tr>`
}

function renderFooterNote(template) {
	if (!template.utilityNote && !template.link) return ''
	const lines = []
	if (template.utilityNote) {
		lines.push(
			`<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">${template.utilityNote}</p>`,
		)
	}
	if (template.link) {
		lines.push(
			`<p style="margin:7px 0 0;font-size:12px;line-height:1.6;font-weight:500;color:${MUTED};">Trouble opening the button? <a href="${template.link}" style="color:${BRAND_BLUE};font-weight:650;text-decoration:none;">Use this link.</a></p>`,
		)
	}
	const content = lines.join('\n\t\t')

	return `<tr>
	<td class="email-footer-note" style="padding:0 56px 34px;text-align:center;">
		${content}
	</td>
</tr>`
}

function footerLink(label, href, icon) {
	return `<td style="padding:6px;">
	<a class="email-footer-link" href="${href}" style="display:block;min-height:22px;padding:10px 12px;border:1px solid ${LINE};border-radius:14px;color:${BLACK};font-size:13px;font-weight:750;line-height:22px;text-align:left;text-decoration:none;white-space:nowrap;">
		${renderFooterIcon(icon)}
		<span style="vertical-align:middle;">${label}</span>
	</a>
</td>`
}

function renderFooterIcon(icon) {
	const src = imageUrls.footerIcons[icon] ?? imageUrls.footerIcons.email
	return `<img src="${src}" width="17" height="17" alt="" style="display:inline-block;width:17px;height:17px;margin-right:9px;border:0;outline:none;text-decoration:none;vertical-align:-3px;">`
}

function emailAssetUrl(fileName) {
	return `${EMAIL_ASSET_URL}/${fileName}`
}

console.log(
	`Generated ${templates.length} auth email templates in ${TEMPLATE_DIR}`,
)
