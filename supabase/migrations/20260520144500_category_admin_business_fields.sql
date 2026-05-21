alter table public.categories
	add column if not exists description text not null default '',
	add column if not exists description_ar text not null default '',
	add column if not exists image_url text;

update public.categories
set description_ar = 'وصف ' || coalesce(nullif(name_ar, ''), name)
where btrim(coalesce(description, '')) <> ''
	and btrim(coalesce(description_ar, '')) = '';

alter table public.categories
	drop constraint if exists categories_description_ar_language,
	drop constraint if exists categories_image_url_not_blank,
	add constraint categories_description_ar_language
		check (
			btrim(coalesce(description, '')) = ''
			or description_ar ~ '[ء-ي]'
		),
	add constraint categories_image_url_not_blank
		check (image_url is null or btrim(image_url) <> '');
