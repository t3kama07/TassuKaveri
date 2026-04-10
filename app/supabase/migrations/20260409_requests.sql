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

create index if not exists idx_requests_owner_uid on public.requests(owner_uid);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_sitter_uid on public.requests(sitter_uid);
create index if not exists idx_requests_requested_sitter_uid on public.requests(requested_sitter_uid);
create index if not exists idx_requests_created_at on public.requests(created_at desc);

drop trigger if exists set_requests_updated_at on public.requests;
create trigger set_requests_updated_at
before update on public.requests
for each row
execute function public.set_updated_at();

alter table public.requests enable row level security;

revoke all on public.requests from anon, authenticated;
