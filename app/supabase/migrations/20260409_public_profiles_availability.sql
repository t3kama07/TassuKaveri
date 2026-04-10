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

create index if not exists idx_public_profiles_availability on public.public_profiles(availability);
create index if not exists idx_availability_slots_user_uid on public.availability_slots(user_uid);
create index if not exists idx_availability_slots_start_at on public.availability_slots(start_at);

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

alter table public.public_profiles enable row level security;
alter table public.availability_slots enable row level security;

revoke all on public.public_profiles from anon, authenticated;
revoke all on public.availability_slots from anon, authenticated;
