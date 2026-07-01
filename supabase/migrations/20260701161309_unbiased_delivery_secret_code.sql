create or replace function app_private.generate_delivery_secret_code()
returns text
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
	alphabet_length constant integer := char_length(alphabet);
	max_unbiased_byte constant integer := (256 / alphabet_length) * alphabet_length;
	random_bytes bytea;
	random_byte integer;
	code text := '';
	byte_index integer;
begin
	while char_length(code) < 8 loop
		random_bytes := extensions.gen_random_bytes(8);

		for byte_index in 0..(octet_length(random_bytes) - 1) loop
			random_byte := get_byte(random_bytes, byte_index);
			if random_byte >= max_unbiased_byte then
				continue;
			end if;

			code := code || substr(
				alphabet,
				(random_byte % alphabet_length) + 1,
				1
			);

			if char_length(code) = 8 then
				return code;
			end if;
		end loop;
	end loop;

	return code;
end;
$$;
