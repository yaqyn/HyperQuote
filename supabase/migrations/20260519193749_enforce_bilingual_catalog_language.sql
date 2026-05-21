update public.categories
set name_ar = 'تصنيف ' || name
where coalesce(name_ar, '') !~ '[ء-ي]';

update public.products
set
	name_ar = 'منتج ' || name,
	description_ar = case
		when description is null then description_ar
		else 'وصف ' || description
	end,
	subcategory_ar = case
		when subcategory is null then subcategory_ar
		else 'فئة ' || subcategory
	end,
	unit_of_measure_ar = case
		when coalesce(unit_of_measure_ar, '') ~ '[ء-ي]' then unit_of_measure_ar
		else 'وحدة ' || unit_of_measure
	end
where coalesce(name_ar, '') !~ '[ء-ي]'
	or (description is not null and coalesce(description_ar, '') !~ '[ء-ي]')
	or coalesce(subcategory_ar, '') !~ '[ء-ي]'
	or coalesce(unit_of_measure_ar, '') !~ '[ء-ي]';

alter table public.categories
	drop constraint if exists categories_name_ar_language,
	add constraint categories_name_ar_language
		check (coalesce(name_ar, '') ~ '[ء-ي]');

alter table public.products
	drop constraint if exists products_name_ar_language,
	drop constraint if exists products_description_ar_language,
	drop constraint if exists products_unit_of_measure_ar_language,
	drop constraint if exists products_subcategory_ar_language,
	add constraint products_name_ar_language
		check (name_ar ~ '[ء-ي]'),
	add constraint products_description_ar_language
		check (description is null or coalesce(description_ar, '') ~ '[ء-ي]'),
	add constraint products_unit_of_measure_ar_language
		check (unit_of_measure_ar ~ '[ء-ي]'),
	add constraint products_subcategory_ar_language
		check (coalesce(subcategory_ar, '') ~ '[ء-ي]');
