create or replace function public.is_uuid_text(value text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    false
  );
$$;

create or replace function public.sync_profile_identity_with_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_email text;
  auth_email_verified boolean;
begin
  if new.uid is null or btrim(new.uid) = '' then
    raise exception 'profiles.uid is required';
  end if;

  if not public.is_uuid_text(new.uid) then
    raise exception 'profiles.uid must match auth.users.id as a UUID string';
  end if;

  select
    users.email,
    coalesce(users.email_confirmed_at, users.confirmed_at) is not null
  into auth_email, auth_email_verified
  from auth.users
  where users.id = new.uid::uuid;

  if not found then
    raise exception 'No auth.users row exists for profile uid %', new.uid;
  end if;

  new.email := coalesce(auth_email, new.email, '');
  if btrim(new.email) = '' then
    raise exception 'profiles.email is required for profile uid %', new.uid;
  end if;

  new.email_verified := auth_email_verified;
  return new;
end;
$$;

create or replace function public.sync_profile_email_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.profiles
  set
    email = coalesce(new.email, profiles.email),
    email_verified = coalesce(new.email_confirmed_at, new.confirmed_at) is not null,
    updated_at = timezone('utc'::text, now())
  where uid = new.id::text;

  return new;
end;
$$;

create or replace function public.delete_profile_for_deleted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from public.profiles
  where uid = old.id::text;

  return old;
end;
$$;

drop trigger if exists sync_profile_identity_with_auth_user on public.profiles;
create trigger sync_profile_identity_with_auth_user
before insert or update of uid, email, email_verified on public.profiles
for each row
execute function public.sync_profile_identity_with_auth_user();

drop trigger if exists sync_profile_email_from_auth_user on auth.users;
create trigger sync_profile_email_from_auth_user
after update of email, email_confirmed_at, confirmed_at on auth.users
for each row
execute function public.sync_profile_email_from_auth_user();

drop trigger if exists delete_profile_for_deleted_auth_user on auth.users;
create trigger delete_profile_for_deleted_auth_user
after delete on auth.users
for each row
execute function public.delete_profile_for_deleted_auth_user();
