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

create index if not exists idx_wallet_transactions_user_uid on public.wallet_transactions(user_uid);
create index if not exists idx_wallet_transactions_occurred_at on public.wallet_transactions(occurred_at desc);

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all on public.wallets from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;
