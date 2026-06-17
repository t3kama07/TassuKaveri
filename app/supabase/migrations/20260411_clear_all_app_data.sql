begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array ARRAY[
    'messages',
    'conversations',
    'requests',
    'reports',
    'notifications',
    'favorites',
    'wallet_transactions',
    'wallets',
    'availability_slots',
    'pets',
    'public_profiles',
    'profiles'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('delete from public.%I', table_name);
    end if;
  end loop;
end
$$;

commit;
