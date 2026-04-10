create table if not exists public.conversations (
  id text primary key,
  owner_uid text not null,
  request_id text not null,
  sitter_uid text not null,
  owner_name text not null default '',
  sitter_name text not null default '',
  title text not null default 'Conversation',
  subtitle text not null default '',
  status text not null default 'open',
  participants text[] not null default '{}',
  last_message text not null default '',
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  owner_uid text not null,
  request_id text not null,
  sitter_uid text not null,
  sender_uid text not null,
  sender_name text not null default '',
  recipient_uid text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_conversations_owner_uid on public.conversations(owner_uid);
create index if not exists idx_conversations_sitter_uid on public.conversations(sitter_uid);
create index if not exists idx_conversations_request_id on public.conversations(request_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_messages_conversation_id_created_at
  on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_recipient_uid_is_read
  on public.messages(recipient_uid, is_read);
create index if not exists idx_messages_request_id on public.messages(request_id);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
