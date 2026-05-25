#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATE_DIR = join(process.cwd(), 'supabase/templates/auth')

const BRAND_BLUE = '#2563EB'
const BLACK = '#090909'
const WHITE = '#FFFFFF'
const WEBSITE_URL = 'https://hyperquote.net'
const SUPPORT_URL = `${WEBSITE_URL}/support#contact`
const PORTAL_URL = 'https://portal.hyperquote.net'
const OFFICE_URL = 'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'
const OFFICE_ADDRESS = 'Arkan Plaza, Sheikh Zayed, Egypt'
const LOGO_URL = `${WEBSITE_URL}/LyonWhite.svg`

const SUPPORT_PHONE_URL = SUPPORT_URL
const SUPPORT_WHATSAPP_URL = SUPPORT_URL

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

const templates = [
	{
		file: 'confirmation.html',
		icon: 'mark_email_read',
		preheader: 'Confirm your HyperQuote email address.',
		title: 'Confirm your email.',
		kicker: 'Secure account access',
		body: [
			'Use the button below to confirm this email address for your HyperQuote account.',
			'Your phone number remains the required sign-in method until email is confirmed.',
		],
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Confirm email' }],
		link: '{{ .ConfirmationURL }}',
		securityNote: 'If you did not request this, you can ignore this email.',
	},
	{
		file: 'email_change.html',
		icon: 'alternate_email',
		preheader: 'Confirm your new HyperQuote email address.',
		title: 'Confirm the new email.',
		kicker: 'Account security',
		body: [
			'You requested to use <strong>{{ .NewEmail }}</strong> for HyperQuote email and password login.',
			'Confirm this change before the new email becomes active.',
		],
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Confirm new email' }],
		link: '{{ .ConfirmationURL }}',
		securityNote:
			'If you did not request this change, do not click the link and contact HyperQuote support.',
	},
	{
		file: 'recovery.html',
		icon: 'key',
		preheader: 'Reset your HyperQuote password.',
		title: 'Reset your password.',
		kicker: 'Recovery request',
		body: [
			'Use this secure link to choose a new password for your confirmed HyperQuote email login.',
			'The link expires shortly and can only be used once.',
		],
		buttons: [
			{
				href: '{{ .RedirectTo }}?type=recovery&amp;token_hash={{ .TokenHash }}',
				label: 'Reset password',
			},
		],
		link: '{{ .RedirectTo }}?type=recovery&amp;token_hash={{ .TokenHash }}',
		securityNote:
			'If you did not request a reset, ignore this email and keep your current password.',
	},
	{
		file: 'magic_link.html',
		icon: 'link',
		preheader: 'Your HyperQuote sign-in link.',
		title: 'Open HyperQuote.',
		kicker: 'Sign-in link',
		body: [
			'This one-time link signs you in to HyperQuote.',
			'It expires shortly and can only be used once.',
		],
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Sign in' }],
		link: '{{ .ConfirmationURL }}',
		securityNote:
			'If you did not request this sign-in link, you can ignore this email.',
	},
	{
		file: 'invite.html',
		icon: 'person_add',
		preheader: 'You were invited to HyperQuote.',
		title: 'Accept your invitation.',
		kicker: 'Invitation',
		body: [
			'You have been invited to access HyperQuote.',
			'Accept the invitation to finish setting up your account.',
		],
		buttons: [{ href: '{{ .ConfirmationURL }}', label: 'Accept invitation' }],
		link: '{{ .ConfirmationURL }}',
	},
	{
		file: 'reauthentication.html',
		icon: 'verified_user',
		preheader: 'Your HyperQuote verification code is {{ .Token }}.',
		title: 'Verification code.',
		kicker: 'Sensitive action',
		body: [
			'Use this code to verify a sensitive account action.',
			'HyperQuote support will never ask you to share this code.',
		],
		code: '{{ .Token }}',
	},
	{
		file: 'password_changed_notification.html',
		icon: 'key',
		preheader: 'Your HyperQuote password was changed.',
		title: 'Your password was changed.',
		kicker: 'Security notification',
		body: [
			'The password on your HyperQuote account was changed.',
			'If this was you, no action is needed. If not, reset your password and contact support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
	{
		file: 'email_changed_notification.html',
		icon: 'alternate_email',
		preheader: 'Your HyperQuote email was changed.',
		title: 'Your email was changed.',
		kicker: 'Security notification',
		body: [
			'The email address on your HyperQuote account was changed.',
			'If this was not you, contact HyperQuote support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
	{
		file: 'phone_changed_notification.html',
		icon: 'security',
		preheader: 'Your HyperQuote phone number was changed.',
		title: 'Your phone number was changed.',
		kicker: 'Security notification',
		body: [
			'The phone number on your HyperQuote account was changed.',
			'If this was not you, contact HyperQuote support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
	{
		file: 'mfa_factor_enrolled_notification.html',
		icon: 'verified_user',
		preheader: 'A verification method was added to your HyperQuote account.',
		title: 'Verification method added.',
		kicker: 'Account security',
		body: [
			'A new verification method was added to your HyperQuote account.',
			'If this was not you, contact HyperQuote support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
	{
		file: 'mfa_factor_unenrolled_notification.html',
		icon: 'security',
		preheader:
			'A verification method was removed from your HyperQuote account.',
		title: 'Verification method removed.',
		kicker: 'Account security',
		body: [
			'A verification method was removed from your HyperQuote account.',
			'If this was not you, contact HyperQuote support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
	{
		file: 'identity_linked_notification.html',
		icon: 'link',
		preheader: 'A sign-in method was linked to your HyperQuote account.',
		title: 'Sign-in method linked.',
		kicker: 'Account security',
		body: [
			'A new sign-in method was linked to your HyperQuote account.',
			'If this was not you, contact HyperQuote support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
	{
		file: 'identity_unlinked_notification.html',
		icon: 'link_off',
		preheader: 'A sign-in method was removed from your HyperQuote account.',
		title: 'Sign-in method removed.',
		kicker: 'Account security',
		body: [
			'A sign-in method was removed from your HyperQuote account.',
			'If this was not you, contact HyperQuote support immediately.',
		],
		buttons: [
			{ href: PORTAL_URL, label: 'Open portal' },
			{ href: SUPPORT_URL, label: 'Contact support', secondary: true },
		],
	},
]

mkdirSync(TEMPLATE_DIR, { recursive: true })

for (const template of templates) {
	writeFileSync(join(TEMPLATE_DIR, template.file), renderEmail(template))
}

function renderEmail(template) {
	const contentBlocks = [
		renderParagraphs(template.body),
		template.code ? renderCode(template.code) : '',
		template.buttons ? renderButtons(template.buttons) : '',
		template.link ? renderRawLink(template.link) : '',
		template.securityNote ? renderSecurityNote(template.securityNote) : '',
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
			.email-pad { padding-left: 22px !important; padding-right: 22px !important; }
			.email-title { font-size: 32px !important; }
			.email-icon-cell { width: 64px !important; }
			.email-icon { width: 56px !important; height: 56px !important; }
			.email-footer-brand, .email-footer-links { display: block !important; width: 100% !important; text-align: left !important; }
			.email-footer-links { padding-top: 22px !important; }
			.email-footer-link { display: inline-block !important; margin: 0 14px 12px 0 !important; }
		}
	</style>
</head>
<body style="margin:0;padding:0;background:${WHITE};color:${BLACK};font-family:Arial,Helvetica,sans-serif;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${template.preheader}</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:${WHITE};margin:0;padding:0;">
		<tr>
			<td align="center" style="padding:44px 18px 0;">
				<table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:860px;margin:0 auto;background:${WHITE};">
					<tr>
						<td class="email-pad" style="padding:0 34px 30px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
								<tr>
									<td style="vertical-align:top;padding:0 24px 0 0;">
										<p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND_BLUE};">${template.kicker}</p>
										<h1 class="email-title" style="margin:0;font-size:44px;line-height:1.04;font-weight:800;letter-spacing:0;color:${BLACK};">${template.title}</h1>
									</td>
									<td class="email-icon-cell" align="right" style="width:92px;vertical-align:top;">
										${renderIcon(template.icon)}
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td class="email-pad" style="padding:0 34px 46px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">
								<tr>
									<td align="center" style="padding:46px 0;">
										<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;margin:0 auto;">
											<tr>
												<td style="font-size:18px;line-height:1.76;color:#2A2A2A;text-align:left;">
													${contentBlocks}
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					${renderFooter()}
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
`
}

function renderParagraphs(paragraphs) {
	return paragraphs
		.map(
			(text) =>
				`<p style="margin:0 0 20px;font-size:18px;line-height:1.76;color:#2A2A2A;">${text}</p>`,
		)
		.join('')
}

function renderButtons(buttons) {
	const anchors = buttons
		.map((button) => {
			const background = button.secondary ? WHITE : BRAND_BLUE
			const color = button.secondary ? BLACK : WHITE
			const border = button.secondary
				? '1px solid #D9DDE5'
				: `1px solid ${BRAND_BLUE}`
			return `<a href="${button.href}" style="display:inline-block;margin:0 6px 12px;padding:15px 22px;border:${border};border-radius:999px;background:${background};color:${color};font-size:15px;font-weight:800;line-height:1;text-decoration:none;">${button.label}</a>`
		})
		.join('')
	return `<div style="margin:30px 0 12px;text-align:center;">${anchors}</div>`
}

function renderCode(code) {
	return `<div style="margin:32px auto;text-align:center;"><div style="display:inline-block;border:1px solid #E5E7EB;border-radius:18px;background:#F8FAFF;padding:22px 30px;font-size:44px;line-height:1;font-weight:800;letter-spacing:0.18em;color:${BLACK};">${code}</div></div>`
}

function renderRawLink(link) {
	return `<p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#666666;">If the button does not open, paste this link into your browser:<br><span style="word-break:break-all;color:#2A2A2A;">${link}</span></p>`
}

function renderSecurityNote(note) {
	return `<p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#666666;">${note}</p>`
}

function renderIcon(name) {
	const path = icons[name] ?? icons.security
	return `<svg class="email-icon" xmlns="http://www.w3.org/2000/svg" width="76" height="76" viewBox="0 0 24 24" aria-hidden="true" style="display:block;">
	<circle cx="12" cy="12" r="12" fill="#EFF6FF"/>
	<path fill="${BRAND_BLUE}" d="${path}"/>
</svg>`
}

function renderFooter() {
	return `<tr>
	<td style="background:${BLACK};padding:0;">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BLACK};">
			<tr>
				<td class="email-pad" style="padding:30px 34px;">
					<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
						<tr>
							<td class="email-footer-brand" style="vertical-align:middle;">
								<a href="${WEBSITE_URL}" style="display:inline-block;color:${WHITE};text-decoration:none;">
									<img src="${LOGO_URL}" width="34" height="34" alt="HyperQuote logo" style="display:inline-block;width:34px;height:34px;border:0;vertical-align:middle;">
									<span style="display:inline-block;margin-left:12px;font-size:21px;line-height:1;font-weight:800;color:${WHITE};vertical-align:middle;">HyperQuote</span>
								</a>
							</td>
							<td class="email-footer-links" align="right" style="vertical-align:middle;text-align:right;">
								${footerLink('Support', SUPPORT_URL)}
								${footerLink('Call', SUPPORT_PHONE_URL)}
								${footerLink('WhatsApp', SUPPORT_WHATSAPP_URL)}
								${footerLink('Our Office', OFFICE_URL)}
								${footerLink('Portal App', PORTAL_URL)}
							</td>
						</tr>
						<tr>
							<td colspan="2" style="padding-top:18px;font-size:12px;line-height:1.7;color:#BDBDBD;">
								${OFFICE_ADDRESS}
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</td>
</tr>`
}

function footerLink(label, href) {
	return `<a class="email-footer-link" href="${href}" style="margin-left:18px;color:${WHITE};font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">${label}</a>`
}

console.log(
	`Generated ${templates.length} auth email templates in ${TEMPLATE_DIR}`,
)
