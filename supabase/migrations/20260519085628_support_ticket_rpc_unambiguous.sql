drop function if exists public.create_support_ticket(text, text, text, text, text);
drop function if exists public.create_support_ticket(text, text, text, text, text, text);

grant execute on function public.create_support_ticket(text, text, text, text, text, text, text) to anon, authenticated;
