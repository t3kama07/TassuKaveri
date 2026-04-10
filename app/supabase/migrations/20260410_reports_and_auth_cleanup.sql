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

create index if not exists idx_reports_type_status on public.reports(report_type, status);
create index if not exists idx_reports_created_at on public.reports(created_at desc);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

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
