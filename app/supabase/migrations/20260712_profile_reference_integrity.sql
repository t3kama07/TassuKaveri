begin;

-- Restore a minimal profile for any valid auth account whose profile creation was
-- interrupted. Users can complete these defaults through onboarding.
insert into public.profiles (uid, email, name, location, email_verified)
select
  users.id::text,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'name', users.raw_user_meta_data ->> 'full_name', ''),
  coalesce(users.raw_user_meta_data ->> 'location', ''),
  coalesce(users.email_confirmed_at, users.confirmed_at) is not null
from auth.users as users
where users.email is not null
  and not exists (
    select 1 from public.profiles where profiles.uid = users.id::text
  );

-- Conversations cannot function after either participant account is gone.
-- Deleting a conversation also removes its messages through the existing FK.
delete from public.conversations as conversations
where not exists (
    select 1 from public.profiles where profiles.uid = conversations.owner_uid
  )
  or not exists (
    select 1 from public.profiles where profiles.uid = conversations.sitter_uid
  );

-- Remove any standalone legacy messages that still reference missing users.
delete from public.messages as messages
where not exists (
    select 1 from public.profiles where profiles.uid = messages.owner_uid
  )
  or not exists (
    select 1 from public.profiles where profiles.uid = messages.sitter_uid
  )
  or not exists (
    select 1 from public.profiles where profiles.uid = messages.sender_uid
  )
  or not exists (
    select 1 from public.profiles where profiles.uid = messages.recipient_uid
  );

-- An ownerless request cannot be displayed or managed safely.
delete from public.requests as requests
where not exists (
  select 1 from public.profiles where profiles.uid = requests.owner_uid
);

-- A request may remain useful after a sitter leaves. Clear only the departed
-- optional participant references and return active direct requests to community.
update public.requests as requests
set
  sitter_uid = null,
  sitter_name = null,
  status = case
    when requests.status in ('accepted', 'awaiting_confirmation') then 'open'
    else requests.status
  end,
  escrow_status = case
    when requests.status in ('accepted', 'awaiting_confirmation') then 'refunded'
    else requests.escrow_status
  end
where requests.sitter_uid is not null
  and not exists (
    select 1 from public.profiles where profiles.uid = requests.sitter_uid
  );

update public.requests as requests
set
  requested_sitter_uid = null,
  requested_sitter_name = null,
  audience = case when requests.status = 'open' then 'community' else requests.audience end
where requests.requested_sitter_uid is not null
  and not exists (
    select 1 from public.profiles where profiles.uid = requests.requested_sitter_uid
  );

-- Enforce the relationships so future profile deletion cannot create orphans.
alter table public.requests
  add constraint requests_owner_profile_fk
  foreign key (owner_uid) references public.profiles(uid) on delete cascade;
alter table public.requests
  add constraint requests_sitter_profile_fk
  foreign key (sitter_uid) references public.profiles(uid) on delete set null;
alter table public.requests
  add constraint requests_requested_sitter_profile_fk
  foreign key (requested_sitter_uid) references public.profiles(uid) on delete set null;
alter table public.conversations
  add constraint conversations_owner_profile_fk
  foreign key (owner_uid) references public.profiles(uid) on delete cascade;
alter table public.conversations
  add constraint conversations_sitter_profile_fk
  foreign key (sitter_uid) references public.profiles(uid) on delete cascade;
alter table public.messages
  add constraint messages_sender_profile_fk
  foreign key (sender_uid) references public.profiles(uid) on delete cascade;
alter table public.messages
  add constraint messages_recipient_profile_fk
  foreign key (recipient_uid) references public.profiles(uid) on delete cascade;

commit;
