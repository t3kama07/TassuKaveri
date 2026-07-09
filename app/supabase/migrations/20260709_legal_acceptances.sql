create table if not exists public.legal_acceptances (
  user_uid text not null references public.profiles(uid) on delete cascade,
  document text not null
    check (document in ('terms_of_service', 'privacy_policy')),
  version text not null,
  accepted_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_uid, document, version)
);

create index if not exists idx_legal_acceptances_user_uid
on public.legal_acceptances(user_uid);

alter table public.legal_acceptances enable row level security;

revoke all on public.legal_acceptances from anon, authenticated;
