create table if not exists public.email_subscriptions (
  id text primary key,
  email text not null,
  source text not null default 'website_popup'
    check (source in ('website_popup')),
  submitted_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (email, source)
);

create index if not exists idx_email_subscriptions_submitted_at
  on public.email_subscriptions(submitted_at desc);

drop trigger if exists set_email_subscriptions_updated_at on public.email_subscriptions;
create trigger set_email_subscriptions_updated_at
before update on public.email_subscriptions
for each row
execute function public.set_updated_at();

alter table public.email_subscriptions enable row level security;

revoke all on public.email_subscriptions from anon, authenticated;
