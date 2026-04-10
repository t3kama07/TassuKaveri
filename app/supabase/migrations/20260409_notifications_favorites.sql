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

create unique index if not exists idx_favorites_owner_sitter on public.favorites(owner_uid, sitter_uid);
create index if not exists idx_notifications_user_uid on public.notifications(user_uid);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_favorites_owner_uid on public.favorites(owner_uid);

alter table public.notifications enable row level security;
alter table public.favorites enable row level security;

revoke all on public.notifications from anon, authenticated;
revoke all on public.favorites from anon, authenticated;
