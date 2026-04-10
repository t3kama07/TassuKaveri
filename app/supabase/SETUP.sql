-- TassuKaveri staged Supabase bootstrap
-- Run this once in the Supabase SQL Editor.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.profiles (
  uid text primary key,
  email text not null,
  name text not null default '',
  location text not null default '',
  country text not null default 'Finland',
  photo_url text not null default '',
  bio text not null default '',
  pet_experience text not null default '',
  availability text not null default 'available' check (availability in ('available', 'unavailable')),
  email_verified boolean not null default false,
  phone_number text not null default '',
  phone_verified boolean not null default false,
  phone_verification_code text,
  phone_verification_expires timestamptz,
  pet_type_experience text[] not null default '{}',
  preferred_pet_size text[] not null default '{}',
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'intermediate', 'expert')),
  experience_with_dogs boolean not null default false,
  experience_with_cats boolean not null default false,
  experience_with_large_dogs boolean not null default false,
  experience_with_senior_pets boolean not null default false,
  latitude double precision,
  longitude double precision,
  rating_average double precision not null default 0,
  rating_count integer not null default 0,
  trust_score integer not null default 0,
  role text not null default 'user' check (role in ('user', 'admin')),
  frozen boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.pets (
  id text primary key,
  owner_uid text not null references public.profiles(uid) on delete cascade,
  name text not null default '',
  pet_type text not null default 'other' check (pet_type in ('dog', 'cat', 'other')),
  breed text not null default '',
  age integer not null default 0,
  pet_size text not null default 'medium' check (pet_size in ('small', 'medium', 'large')),
  notes text not null default '',
  behaviour text not null default '',
  allergies text not null default '',
  vaccination_status text not null default '',
  friendly_with_dogs boolean not null default false,
  friendly_with_cats boolean not null default false,
  friendly_with_children boolean not null default false,
  medication_required boolean not null default false,
  special_care_instructions text not null default '',
  emergency_vet_contact text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.public_profiles (
  uid text primary key references public.profiles(uid) on delete cascade,
  name text not null default '',
  location text not null default '',
  country text not null default 'Finland',
  photo_url text not null default '',
  bio text not null default '',
  pet_experience text not null default '',
  availability text not null default 'available' check (availability in ('available', 'unavailable')),
  phone_verified boolean not null default false,
  pet_type_experience text[] not null default '{}',
  preferred_pet_size text[] not null default '{}',
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'intermediate', 'expert')),
  experience_with_dogs boolean not null default false,
  experience_with_cats boolean not null default false,
  experience_with_large_dogs boolean not null default false,
  experience_with_senior_pets boolean not null default false,
  latitude double precision,
  longitude double precision,
  rating_average double precision not null default 0,
  rating_count integer not null default 0,
  trust_score integer not null default 0,
  has_detailed_availability boolean not null default false,
  next_available_start_at timestamptz,
  next_available_end_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.availability_slots (
  id text primary key,
  user_uid text not null references public.profiles(uid) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.requests (
  id text primary key,
  owner_uid text not null,
  owner_name text not null default '',
  pet_ids text[] not null default '{}',
  pet_names text[] not null default '{}',
  care_type text not null default 'daily-visit'
    check (care_type in ('daily-visit', 'overnight', 'boarding', 'walking')),
  start_date timestamptz not null,
  end_date timestamptz not null,
  location text not null default '',
  location_lat double precision,
  location_lng double precision,
  credits_offered integer not null default 0,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'awaiting_confirmation', 'completed', 'cancelled')),
  audience text not null default 'community'
    check (audience in ('community', 'direct')),
  escrow_status text not null default 'none'
    check (escrow_status in ('none', 'held', 'released', 'refunded')),
  sitter_uid text,
  sitter_name text,
  requested_sitter_uid text,
  requested_sitter_name text,
  applications jsonb not null default '[]'::jsonb,
  review jsonb,
  owner_review jsonb,
  sitter_review jsonb,
  marked_complete_at timestamptz,
  confirmed_complete_at timestamptz,
  notes text not null default '',
  feeding_schedule text not null default '',
  walk_schedule text not null default '',
  medication_instructions text not null default '',
  sleep_instructions text not null default '',
  special_warnings text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.wallets (
  user_uid text primary key references public.profiles(uid) on delete cascade,
  balance integer not null default 0,
  last_request_id text,
  last_request_owner_id text,
  daily_earned_date text,
  daily_earned_credits integer,
  last_wallet_action text
    check (
      last_wallet_action in (
        'starter_bonus',
        'manual_earn',
        'manual_spend',
        'escrow_hold',
        'escrow_release',
        'escrow_refund'
      )
    ),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.wallet_transactions (
  id text primary key,
  user_uid text not null references public.wallets(user_uid) on delete cascade,
  tx_type text not null
    check (
      tx_type in (
        'earn',
        'spend',
        'escrow',
        'escrow-release',
        'escrow-refund',
        'starter_bonus'
      )
    ),
  amount integer not null,
  reference text not null default '',
  request_id text,
  occurred_at timestamptz not null,
  balance_after integer not null
);

create table if not exists public.notifications (
  id text primary key,
  user_uid text not null references public.profiles(uid) on delete cascade,
  notification_type text not null
    check (
      notification_type in (
        'direct_request_received',
        'application_received',
        'application_accepted',
        'message_received',
        'review_received',
        'request_completed'
      )
    ),
  related_request_id text,
  message text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.favorites (
  id text primary key,
  owner_uid text not null references public.profiles(uid) on delete cascade,
  sitter_uid text not null references public.profiles(uid) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reports (
  id text primary key,
  reporter_uid text not null references public.profiles(uid) on delete cascade,
  report_type text not null
    check (report_type in ('user', 'request', 'suspicious')),
  target_user_uid text,
  target_owner_uid text,
  target_request_id text,
  reason text not null default '',
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.conversations (
  id text primary key,
  owner_uid text not null,
  request_id text not null,
  sitter_uid text not null,
  owner_name text not null default '',
  sitter_name text not null default '',
  title text not null default 'Conversation',
  subtitle text not null default '',
  status text not null default 'open',
  participants text[] not null default '{}',
  last_message text not null default '',
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  owner_uid text not null,
  request_id text not null,
  sitter_uid text not null,
  sender_uid text not null,
  sender_name text not null default '',
  recipient_uid text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_pets_owner_uid on public.pets(owner_uid);
create index if not exists idx_public_profiles_availability on public.public_profiles(availability);
create index if not exists idx_availability_slots_user_uid on public.availability_slots(user_uid);
create index if not exists idx_availability_slots_start_at on public.availability_slots(start_at);
create index if not exists idx_requests_owner_uid on public.requests(owner_uid);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_sitter_uid on public.requests(sitter_uid);
create index if not exists idx_requests_requested_sitter_uid on public.requests(requested_sitter_uid);
create index if not exists idx_requests_created_at on public.requests(created_at desc);
create index if not exists idx_wallet_transactions_user_uid on public.wallet_transactions(user_uid);
create index if not exists idx_wallet_transactions_occurred_at on public.wallet_transactions(occurred_at desc);
create unique index if not exists idx_favorites_owner_sitter on public.favorites(owner_uid, sitter_uid);
create index if not exists idx_notifications_user_uid on public.notifications(user_uid);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_favorites_owner_uid on public.favorites(owner_uid);
create index if not exists idx_reports_type_status on public.reports(report_type, status);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_conversations_owner_uid on public.conversations(owner_uid);
create index if not exists idx_conversations_sitter_uid on public.conversations(sitter_uid);
create index if not exists idx_conversations_request_id on public.conversations(request_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_messages_conversation_id_created_at
  on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_recipient_uid_is_read
  on public.messages(recipient_uid, is_read);
create index if not exists idx_messages_request_id on public.messages(request_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_pets_updated_at on public.pets;
create trigger set_pets_updated_at
before update on public.pets
for each row
execute function public.set_updated_at();

drop trigger if exists set_public_profiles_updated_at on public.public_profiles;
create trigger set_public_profiles_updated_at
before update on public.public_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_availability_slots_updated_at on public.availability_slots;
create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row
execute function public.set_updated_at();

drop trigger if exists set_requests_updated_at on public.requests;
create trigger set_requests_updated_at
before update on public.requests
for each row
execute function public.set_updated_at();

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.public_profiles enable row level security;
alter table public.availability_slots enable row level security;
alter table public.requests enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.pets from anon, authenticated;
revoke all on public.public_profiles from anon, authenticated;
revoke all on public.availability_slots from anon, authenticated;
revoke all on public.requests from anon, authenticated;
revoke all on public.wallets from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.favorites from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;

drop policy if exists conversations_select_for_participants on public.conversations;
create policy conversations_select_for_participants
on public.conversations
for select
to authenticated
using (
  auth.uid() is not null
  and (
    auth.uid()::text = owner_uid
    or auth.uid()::text = sitter_uid
    or auth.uid()::text = any(participants)
  )
);

drop policy if exists messages_select_for_participants on public.messages;
create policy messages_select_for_participants
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and (
        auth.uid()::text = conversations.owner_uid
        or auth.uid()::text = conversations.sitter_uid
        or auth.uid()::text = any(conversations.participants)
      )
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
