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
const SOFT_BLUE = '#EFF6FF'
const WEBSITE_URL = 'https://hyperquote.net'
const SUPPORT_URL = `${WEBSITE_URL}/support#contact`
const PORTAL_URL = 'https://portal.hyperquote.net'
const OFFICE_URL = 'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'
const OFFICE_ADDRESS = 'Arkan Plaza, Sheikh Zayed, Egypt'
const LOGO_URL = `${WEBSITE_URL}/LyonBlack.svg`

const SUPPORT_PHONE_URL = SUPPORT_URL
const SUPPORT_WHATSAPP_URL = SUPPORT_URL
const CUSTOMER_NAME =
	'{{ if .Data.company_name }}{{ .Data.company_name }}{{ else if .Data.name }}{{ .Data.name }}{{ else if .Data.contact_name }}{{ .Data.contact_name }}{{ else }}there{{ end }}'

const icons = {
	alternate_email:
		'M12 12.713q.825 0 1.413-.588T14 10.713q0-.825-.587-1.413T12 8.713q-.825 0-1.412.587T10 10.713q0 .825.588 1.412t1.412.588Zm0 8q-1.85 0-3.488-.7t-2.862-1.925q-1.225-1.225-1.925-2.862T3.035 11.738q0-1.85.7-3.488T5.66 5.388q1.225-1.225 2.862-1.925T12.01 2.763q1.85 0 3.488.7t2.862 1.925q1.225 1.225 1.925 2.862t.7 3.488v1.475q0 1.375-.962 2.337t-2.338.963q-.825 0-1.537-.375t-1.138-1.025q-.55.65-1.325 1.025t-1.675.375q-1.625 0-2.713-1.087T8.21 12.713q0-1.625 1.087-2.713T12.01 8.913q1.625 0 2.713 1.087t1.087 2.713v1.5q0 .625.438 1.062t1.062.438q.625 0 1.063-.438t.437-1.062v-1.475q0-2.85-1.975-4.825T12.01 5.938q-2.85 0-4.825 1.975T5.21 12.738q0 2.85 1.975 4.825t4.825 1.975h4v1.175h-4Z',
	key: 'M12 17q.825 0 1.413-.588T14 15q0-.825-.587-1.412T12 13q-.825 0-1.412.588T10 15q0 .825.588 1.412T12 17Zm-6 5q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.538T12 1q2.075 0 3.538 1.462T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22H6Zm3-14h6V6q0-1.25-.875-2.125T12 3q-1.25 0-2.125.875T9 6v2Z',
	link: 'M7 17q-2.075 0-3.537-1.463T2 12q0-2.075 1.463-3.537T7 7h4v2H7q-1.25 0-2.125.875T4 12q0 1.25.875 2.125T7 15h4v2H7Zm1-4v-2h8v2H8Zm5 4v-2h4q1.25 0 2.125-.875T20 12q0-1.25-.875-2.125T17 9h-4V7h4q2.075 0 3.538 1.463T22 12q0 2.075-1.462 3.537T17 17h-4Z',
	link_off:
		'M17 7q2.075 0 3.538 1.463T22 12q0 1.05-.4 1.975T20.475 15.6L19.05 14.175q.45-.4.7-.95T20 12q0-1.25-.875-2.125T17 9h-4V7h4ZM2.1 3.5 3.5 2.1l18.4 18.4-1.4 1.4-3.575-3.575Q16.475 18.65 16 18.825T15 19h-4v-2h4q.125 0 .238-.013t.237-.062L13.55 15H7q-1.25 0-2.125-.875T4 12q0-1.25.875-2.125T7 9h.55L5.7 7.15Q4.1 7.6 3.05 8.925T2 12q0 2.075 1.463 3.537T7 17h1v2H7q-2.925 0-4.962-2.037T0 12q0-2.25 1.3-4.025T4.7 5.45L2.1 3.5ZM8 13v-2h2.55l2 2H8Zm8-2v2h-.55l-2-2H16Z',
	mark_email_read:
		'M20 4H4q-.825 0-1.412.588T2 6v12q0 .825.588 1.413T4 20h8v-2H4V8l8 5 8-5v4h2V6q0-.825-.587-1.412T20 4Zm-8 7L4 6h16l-8 5Zm6.2 9.5 3.55-3.55-1.4-1.4-2.15 2.15-.9-.9-1.4 1.4 2.3 2.3ZM19 23q-2.075 0-3.537-1.463T14 18q0-2.075 1.463-3.537T19 13q2.075 0 3.538 1.463T24 18q0 2.075-1.462 3.537T19 23Z',
	person_add:
		'M15 12q-1.65 0-2.825-1.175T11 8q0-1.65 1.175-2.825T15 4q1.65 0 2.825 1.175T19 8q0 1.65-1.175 2.825T15 12Zm-8 8q-.825 0-1.412-.587T5 18q0-1.275.638-2.363T7.35 14q1.725-.875 3.663-1.312T15 12.25q.45 0 .888.025t.862.075q-.25.5-.375 1.05T16.25 14.5q0 1.8 1.225 3.025T20.5 18.75q.325 0 .625-.05t.575-.15q-.55.675-1.35 1.063T18.625 20H7Zm13-3v-2h-2v-2h2v-2h2v2h2v2h-2v2h-2Z',
	security:
		'M12 22q-3.475-.875-5.737-3.988T4 11.1V5l8-3 8 3v6.1q0 3.8-2.263 6.912T12 22Zm-1-6h2v-2h-2v2Zm0-4h2V7h-2v5Z',
	verified_user:
		'M10.95 15.55 17.6 8.9l-1.4-1.4-5.25 5.25-2.15-2.15-1.4 1.4 3.55 3.55ZM12 22q-3.475-.875-5.737-3.988T4 11.1V5l8-3 8 3v6.1q0 3.8-2.263 6.912T12 22Z',
}

const footerIcons = {
	call: 'M19.95 21q-3.125 0-6.175-1.362t-5.55-3.863q-2.5-2.5-3.862-5.55T3 4.05q0-.45.3-.75t.75-.3H8.1q.35 0 .625.238t.325.562l.65 3.5q.05.4-.075.675T9.25 8.45L6.8 10.9q.5.925 1.187 1.788t1.513 1.662q.775.775 1.625 1.438T12.9 17l2.35-2.35q.225-.225.588-.337t.712-.063l3.65.75q.35.1.575.363t.225.612v4q0 .45-.3.738t-.75.287Z',
	email:
		'M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20H4Zm8-7 8-5V6l-8 5-8-5v2l8 5Z',
	portal:
		'M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7v2H5v14h7v2H5Zm11-4-1.4-1.45L17.15 13H9v-2h8.15L14.6 8.45 16 7l5 5-5 5Z',
	whatsapp:
		'M12.04 2q-4.14 0-7.07 2.92T2.04 12q0 1.85.7 3.54L2 22l6.64-.72q1.62.62 3.4.62 4.12 0 7.04-2.92T22 11.94q0-4.12-2.92-7.03T12.04 2Zm4.15 13.64q-.27.76-1.54 1.38-.42.2-.96.2-.72 0-1.72-.36-1.37-.5-2.54-1.5-1.18-1-1.95-2.2-.82-1.28-1.02-2.32-.2-1.05.2-1.74.35-.62.8-.98.32-.26.68-.26h.5q.28 0 .46.38l.72 1.74q.12.32.02.56-.15.34-.46.7l-.24.28q-.14.16-.03.38.38.74 1.1 1.42.7.66 1.62 1.1.28.14.47-.08l.65-.78q.2-.24.48-.18.18.04.48.18l1.56.74q.42.2.48.43.05.25-.03.49Z',
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
		icon: 'verified_user',
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
		icon: 'security',
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
		icon: 'verified_user',
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
		icon: 'security',
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
	const path = icons[name] ?? icons.security
	return `<svg class="email-icon" xmlns="http://www.w3.org/2000/svg" width="92" height="92" viewBox="0 0 24 24" aria-hidden="true" style="display:block;">
	<circle cx="12" cy="12" r="12" fill="${SOFT_BLUE}"/>
	<path fill="${BRAND_BLUE}" d="${path}"/>
</svg>`
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
									<img src="${LOGO_URL}" width="86" height="86" alt="HyperQuote logo" style="display:block;width:86px;height:86px;border:0;">
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
	const path = footerIcons[icon] ?? footerIcons.email
	return `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style="display:inline-block;margin-right:9px;vertical-align:-3px;">
	<path fill="${BRAND_BLUE}" d="${path}"/>
</svg>`
}

console.log(
	`Generated ${templates.length} auth email templates in ${TEMPLATE_DIR}`,
)
