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

create index if not exists idx_pets_owner_uid on public.pets(owner_uid);

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

alter table public.profiles enable row level security;
alter table public.pets enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.pets from anon, authenticated;
