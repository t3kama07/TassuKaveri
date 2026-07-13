create table if not exists public.admin_action_logs (
  id text primary key,
  admin_uid text not null,
  target_user_uid text not null,
  action text not null check (action in ('freeze-account', 'unfreeze-account')),
  reason text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_admin_action_logs_created_at
  on public.admin_action_logs(created_at desc);
create index if not exists idx_admin_action_logs_target_user_uid
  on public.admin_action_logs(target_user_uid, created_at desc);

alter table public.admin_action_logs enable row level security;
revoke all on public.admin_action_logs from anon, authenticated;
grant select, insert on public.admin_action_logs to service_role;

create or replace function public.set_account_frozen_with_audit(
  p_admin_uid text,
  p_target_user_uid text,
  p_frozen boolean,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.profiles
  set
    frozen = p_frozen,
    updated_at = timezone('utc'::text, now())
  where uid = p_target_user_uid;

  if not found then
    raise exception 'Target user not found';
  end if;

  insert into public.admin_action_logs (
    id,
    admin_uid,
    target_user_uid,
    action,
    reason,
    created_at
  )
  values (
    gen_random_uuid()::text,
    p_admin_uid,
    p_target_user_uid,
    case when p_frozen then 'freeze-account' else 'unfreeze-account' end,
    coalesce(nullif(trim(p_reason), ''), 'No reason provided'),
    timezone('utc'::text, now())
  );
end;
$$;

revoke all on function public.set_account_frozen_with_audit(text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.set_account_frozen_with_audit(text, text, boolean, text)
  to service_role;

create or replace function public.is_current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.uid = auth.uid()::text
      and profiles.frozen = false
  );
$$;

revoke all on function public.is_current_user_active() from public, anon;
grant execute on function public.is_current_user_active() to authenticated;

drop policy if exists conversations_select_for_participants on public.conversations;
create policy conversations_select_for_participants
on public.conversations
for select
to authenticated
using (
  auth.uid() is not null
  and public.is_current_user_active()
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
  public.is_current_user_active()
  and exists (
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
