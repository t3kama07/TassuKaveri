create extension if not exists pg_trgm;

create index if not exists idx_public_profiles_available_updated_at
  on public.public_profiles(updated_at desc)
  where availability = 'available';

create index if not exists idx_public_profiles_available_location_trgm
  on public.public_profiles using gin (location gin_trgm_ops)
  where availability = 'available';

create index if not exists idx_requests_open_community_created_at
  on public.requests(created_at desc)
  where status = 'open' and audience = 'community';

create index if not exists idx_requests_direct_sitter_open_created_at
  on public.requests(requested_sitter_uid, created_at desc)
  where status = 'open' and audience = 'direct';

create index if not exists idx_requests_sitter_status_dates
  on public.requests(sitter_uid, status, start_date, end_date);

create index if not exists idx_conversations_participants_gin
  on public.conversations using gin (participants);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_uid)
  where is_read = false;

create index if not exists idx_wallet_transactions_user_occurred_at
  on public.wallet_transactions(user_uid, occurred_at desc);
