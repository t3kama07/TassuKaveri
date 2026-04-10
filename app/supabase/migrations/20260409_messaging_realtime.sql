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
