alter table public.quote_requests
	add column preferred_delivery_window text,
	add column request_contact_email text,
	add column request_contact_phone text,
	add column agreement_version text,
	add column agreement_accepted_at timestamptz;

alter table public.quote_requests
	add constraint quote_requests_preferred_delivery_window_check
	check (
		preferred_delivery_window is null
		or preferred_delivery_window in (
			'08:00-13:00',
			'13:00-17:00',
			'17:00-20:00',
			'00:00-06:00'
		)
	),
	add constraint quote_requests_contact_email_check
	check (
		request_contact_email is null
		or (
			char_length(request_contact_email) between 3 and 254
			and request_contact_email = lower(trim(request_contact_email))
			and position('@' in request_contact_email) > 1
		)
	),
	add constraint quote_requests_contact_phone_check
	check (
		request_contact_phone is null
		or request_contact_phone ~ '^\+20(10|11|12|15)[0-9]{8}$'
	),
	add constraint quote_requests_agreement_acceptance_check
	check (
		(agreement_version is null and agreement_accepted_at is null)
		or (
			agreement_version is not null
			and agreement_accepted_at is not null
		)
	);

comment on column public.quote_requests.preferred_delivery_window is
	'The customer requested this delivery window; operations confirms the final schedule after quoting.';

comment on column public.quote_requests.request_contact_email is
	'Contact email captured with the quote request so later profile edits do not rewrite the submission.';

comment on column public.quote_requests.request_contact_phone is
	'Contact phone captured with the quote request so later profile edits do not rewrite the submission.';

comment on column public.quote_requests.agreement_version is
	'Version of the customer-facing quote request terms accepted at submission.';
